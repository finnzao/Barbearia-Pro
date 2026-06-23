# Contrato da API — NaRégua

Documento central de referência para as rotas HTTP da API (`@naregua/api`).

## Convenções gerais

- **Prefixo global:** todas as rotas são servidas sob `/api`.
- **Transporte:** JSON (`Content-Type: application/json`).
- **Datas:** sempre em UTC (ISO 8601, `timestamptz`). A conversão para o fuso da
  barbearia (`barbearia.fuso`) ocorre na camada de exibição.
- **Dinheiro:** sempre em centavos (inteiro). Ex.: `precoCentavos: 4000` = R$ 40,00.
- **Identificação de requisição:** toda resposta inclui o cabeçalho
  `x-request-id`. Se o cliente enviar esse cabeçalho, o valor é reaproveitado;
  caso contrário, um UUID é gerado.

## Autenticação e multi-tenancy

- Autenticação por **JWT** no cabeçalho `Authorization: Bearer <accessToken>`.
- Todas as rotas são protegidas por padrão (`JwtAuthGuard` global). Rotas
  marcadas com `@Public()` (healthcheck, login, cadastro, refresh) dispensam
  token.
- O token carrega `barbearia_id`, `papel` e `profissional_id`. O
  `JwtAuthGuard` popula `request.user` a partir do token.
- O tenant (`barbearia_id`) é derivado do usuário autenticado
  (`request.user.barbeariaId`). O `TenantInterceptor` injeta o tenant no
  contexto de execução (`TenantContext`).
- Todo acesso ao banco via cliente tenant-scoped (`PrismaService.db`) aplica o
  filtro `barbearia_id` automaticamente e bloqueia qualquer consulta ou escrita
  sem tenant definido.
- Autorização por papel via `@Roles(...)` + `RolesGuard` (ex.: `dono`,
  `profissional`). A área do funcionário aplica **duplo escopo**:
  `barbearia_id` (tenant) + `profissional_id` (usuário logado).
- Refresh tokens são opacos, guardados com hash (SHA-256) na tabela
  `refresh_token`, com rotação a cada uso e revogação no logout.

## Validação de entrada (DTOs)

- Toda entrada com corpo deve ser declarada como uma classe DTO anotada com
  `class-validator` / `class-transformer`.
- O `ValidationPipe` global aplica:
  - `whitelist: true` — remove propriedades não declaradas no DTO.
  - `forbidNonWhitelisted: true` — rejeita payloads com propriedades extras.
  - `transform: true` — converte o payload para a instância tipada do DTO.
- Nenhuma rota deve receber payload sem um DTO validado.

## Formato padrão de erro

Todas as respostas de erro seguem o contrato abaixo:

```json
{
  "success": false,
  "error": {
    "code": "CODIGO_ERRO",
    "message": "Mensagem amigável",
    "details": {}
  }
}
```

### Códigos de erro

| Situação                              | HTTP | `code`               |
| ------------------------------------- | ---- | -------------------- |
| Falha de validação de DTO             | 400  | `VALIDACAO`          |
| Requisição inválida                   | 400  | `REQUISICAO_INVALIDA`|
| Não autenticado                       | 401  | `NAO_AUTENTICADO`    |
| Acesso negado                         | 403  | `ACESSO_NEGADO`      |
| Acesso ao banco sem tenant            | 403  | `TENANT_AUSENTE`     |
| Registro não encontrado               | 404  | `NAO_ENCONTRADO`     |
| Conflito / violação de unicidade      | 409  | `CONFLITO`           |
| Entidade não processável              | 422  | `NAO_PROCESSAVEL`    |
| Erro interno                          | 500  | `ERRO_INTERNO`       |

- Em falhas de validação, `details.errors` contém a lista de mensagens do
  `class-validator`.
- Erros conhecidos do Prisma são mapeados: `P2002` → `409 CONFLITO`,
  `P2025` → `404 NAO_ENCONTRADO`, `P2003` → `409 CONFLITO`.

## Rotas

### `GET /api/health`

Verifica a saúde da aplicação e a conexão com o Postgres (executa
`SELECT 1`).

- **Request:** sem parâmetros, sem corpo.
- **Response `200`:**

```json
{
  "status": "ok",
  "database": "ok"
}
```

- **Response `503` (banco indisponível):**

```json
{
  "success": false,
  "error": {
    "code": "ERRO_INTERNO",
    "message": "Banco de dados indisponível.",
    "details": {}
  }
}
```

### Autenticação — `/api/auth`

Resposta de tokens (cadastro, login e refresh):

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaco>",
  "usuario": {
    "id": "uuid",
    "barbeariaId": "uuid",
    "papel": "dono",
    "profissionalId": null
  }
}
```

#### `POST /api/auth/registrar` — público, rate limit 5/min

Provisiona barbearia + config + usuário dono em transação.

- **Request:** `{ "nomeBarbearia": string, "slug": string, "email": string, "senha": string (min 8) }`
- **Response `201`:** tokens.
- **Erros:** `409 CONFLITO` (slug/e-mail já cadastrado), `400 VALIDACAO`.

#### `POST /api/auth/login` — público, rate limit 5/min

- **Request:** `{ "email": string, "senha": string }`
- **Response `200`:** tokens. O usuário é localizado pelo e-mail (assume e-mail
  único entre barbearias).
- **Erros:** `401 NAO_AUTENTICADO` (credenciais inválidas), `429` (rate limit).

#### `POST /api/auth/refresh` — público

- **Request:** `{ "refreshToken": string }`
- **Response `200`:** novos tokens (rotação; o refresh anterior é revogado).
- **Erros:** `401 NAO_AUTENTICADO` (token inválido, revogado ou expirado).

#### `POST /api/auth/logout` — autenticado

- **Request:** `{ "refreshToken": string }`
- **Response `200`:** `{ "success": true }` (revoga o refresh token).

#### `GET /api/auth/me` — autenticado

- **Response `200`:** `{ "id", "barbeariaId", "papel", "profissionalId" }`.

### Área do funcionário — `/api/funcionario`

Requer `papel = profissional` (`RolesGuard`). Duplo escopo: `barbearia_id`
(tenant) + `profissional_id` (usuário logado). Acesso por `dono` → `403`.

#### `GET /api/funcionario/agenda?data=YYYY-MM-DD`

- **Response `200`:** lista de agendamentos do profissional no dia.

#### `GET /api/funcionario/comissoes`

- **Response `200`:** `{ "faturadoCentavos", "comissaoCentavos", "aReceberCentavos" }`.

#### `GET /api/funcionario/repasses`

- **Response `200`:** `{ "repasses": [...], "pendenteCentavos", "pagoCentavos" }`.
