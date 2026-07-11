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

### Serviços — `/api/servicos`

Tenant-scoped. Leitura: qualquer usuário autenticado. Escrita: `dono`.

- `GET /api/servicos` — lista os serviços da barbearia.
- `GET /api/servicos/:id` — um serviço (`404` se de outra barbearia).
- `POST /api/servicos` — `{ nome, duracaoMin (≥1), precoCentavos (≥0), categoriaId?, ativo? }` → `201`.
- `PATCH /api/servicos/:id` — campos parciais do criar.
- `DELETE /api/servicos/:id` — `{ "success": true }`.

### Profissionais — `/api/profissionais`

Tenant-scoped. Leitura: autenticado. Escrita: `dono`.

- `GET /api/profissionais` · `GET /api/profissionais/:id`
- `POST /api/profissionais` — `{ nome, apelido, cargo?, comissaoPercent? (0–1), chavePix?, pixTipoChave?, pixMarcador?, ativo? }` → `201`.
- `PATCH /api/profissionais/:id` · `DELETE /api/profissionais/:id`

### Clientes — `/api/clientes`

Tenant-scoped. Leitura: autenticado. Escrita: `dono`, `recepcao`.

- `GET /api/clientes` · `GET /api/clientes/:id`
- `POST /api/clientes` — `{ nome, whatsapp }` → `201` (`409 CONFLITO` se whatsapp duplicado na barbearia).
- `PATCH /api/clientes/:id` · `DELETE /api/clientes/:id`

### Agendamentos — `/api/agendamentos`

Tenant-scoped. Leitura: autenticado. Escrita: `dono`, `recepcao`. Datas em UTC
(ISO-8601). O banco impede sobreposição de horário para o mesmo profissional
(constraint `exclude using gist`).

- `GET /api/agendamentos?data=YYYY-MM-DD&profissionalId=` — lista (filtros
  opcionais por dia e por profissional).
- `GET /api/agendamentos/:id`
- `POST /api/agendamentos` — `{ inicio, fim, profissionalId?, servicoId?, clienteId?, clienteNome?, precoCentavos?, status?, origem?, observacao? }` → `201`.
  - `400 REQUISICAO_INVALIDA` se `fim` ≤ `inicio`.
  - `409 CONFLITO` se o horário se sobrepõe a outro do mesmo profissional.
- `PATCH /api/agendamentos/:id` — campos parciais (inclui transição de `status`).
- `DELETE /api/agendamentos/:id`

### Pagamentos — `/api/pagamentos`

Tenant-scoped. Leitura: autenticado. Escrita: `dono`, `recepcao`.

- `GET /api/pagamentos?profissionalId=&status=` — lista.
- `GET /api/pagamentos/:id`
- `POST /api/pagamentos` — `{ profissionalId, valorCentavos, metodo, comissaoPercent?, agendamentoId?, servicoId?, servicoNome? }` → `201`.
  - `comissaoPercent` omitido herda o do profissional.
  - Métodos manuais (`dinheiro`, `cartao_debito`, `cartao_credito`, `pix_estatico`) já nascem `pago` (recebimento manual — no Pix fixo o cliente pagou na chave estática da barbearia, fora do sistema); só `pix_dinamico` nasce `pendente` (confirmado pelo webhook).
  - `pix_dinamico`/`pix_estatico` exigem que o profissional tenha `pixMarcador` cadastrado (RN-23) — sem isso, `400`. `pix_dinamico` gera `txid`/`copiaCola`/`expiraEm` de verdade via `PixGateway` (Mercado Pago, API Orders — `order.create`/`POST /v1/orders`; mock sem rede quando `MERCADOPAGO_CLIENT_SECRET` não está setado); `pix_estatico` usa a chave central fixa (sem gerar cobrança nova). Os dois criam um `SplitPagamento` com o marcador do profissional e o valor dividido pela comissão congelada.
  - **Marketplace:** a cobrança é criada com o access token OAuth **da barbearia** (conta conectada) — o dinheiro cai direto na conta MP dela, nunca na da plataforma. Barbearia sem conta conectada → `400` ("Barbearia não conectou a conta Mercado Pago.").
- `PATCH /api/pagamentos/:id/pagar` — baixa manual (`pendente` → `pago`); segue disponível mesmo com webhook.
- `POST /api/pagamentos/webhook/mercadopago` — rota pública (`@Public()`, sem JWT). Notificação da **API Orders** do Mercado Pago (`type: "order"`, `data.id` = id da order). Valida a assinatura (`x-signature`/`x-request-id` contra `MERCADOPAGO_WEBHOOK_SECRET`, `WebhookSignatureValidator` do SDK) — assinatura inválida → `401`. Acha o `Pagamento` pelo `txid` (= id da order) sem escopo de tenant (o webhook não carrega `barbeariaId`), confirma o status de verdade via `order.get` **com o token da barbearia dona** (nunca confia no corpo da notificação) e só marca `pago` se `status === 'processed'`; do contrário não faz nada. Idempotente (reenvio da mesma notificação é no-op). `txid` desconhecido (não é nosso) ou evento de outro tipo → `200` sem efeito.

#### Conexão Mercado Pago (OAuth marketplace) — `/api/pagamentos/mercadopago`

Cada barbearia conecta a **própria** conta Mercado Pago; os tokens ficam cifrados (AES-256-GCM, `CIFRA_SEGREDO`) em `barbearia.mp_access_token`/`mp_refresh_token`, com renovação automática quando estão a menos de 1 dia de vencer.

- `GET /api/pagamentos/mercadopago/conectar` — só `dono`. → `{ url }` da autorização no Mercado Pago (com `state` assinado por HMAC, TTL 10 min — amarra o callback à barbearia e impede CSRF).
- `GET /api/pagamentos/mercadopago/callback?code=&state=` — rota pública (o MP redireciona o navegador do dono pra cá). Troca o `code` pelos tokens, salva cifrado e redireciona pro painel (`?mp=conectado` ou `?mp=erro`).
- `GET /api/pagamentos/mercadopago/status` — só `dono`. → `{ conectado, mpUserId }`.

### Comissões — `/api/comissoes`

Somente `dono`. Agregação dos pagamentos **pagos** por profissional.

- `GET /api/comissoes?profissionalId=&de=YYYY-MM-DD&ate=YYYY-MM-DD` →
  `[{ profissionalId, profissional, atendimentos, faturadoCentavos, comissaoCentavos, liquidoBarbeariaCentavos }]`.

### Repasses — `/api/repasses`

Somente `dono`. Tenant-scoped.

- `GET /api/repasses?profissionalId=&status=` · `GET /api/repasses/:id`
- `POST /api/repasses` — `{ profissionalId, periodoInicio, periodoFim, valorCentavos, origem }` → `201`.
- `PATCH /api/repasses/:id/pagar` — marca como `pago`.

### Configuração — `/api/config`

Tenant-scoped. Leitura: autenticado. Escrita: `dono`.

- `GET /api/config` — config da barbearia (criada com padrões na primeira leitura).
- `PATCH /api/config` — `{ clienteEscolheProfissional?, clienteEscolheServico?, repasseModo?, repasseFrequencia?, repasseDia? }`.
- `GET /api/config/horarios` — horários de funcionamento.
- `PUT /api/config/horarios` — `{ horarios: [{ diaSemana (0–6), abre "HH:MM", fecha "HH:MM" }] }` (substitui a semana).

### Relatórios — `/api/relatorios`

Somente `dono`. Agregações dos pagamentos pagos.

- `GET /api/relatorios/financeiro?de=YYYY-MM-DD&ate=YYYY-MM-DD` →
  `{ faturamentoCentavos, comissoesCentavos, liquidoCentavos, atendimentos, ticketMedioCentavos }`.
- `GET /api/relatorios/servicos?de=&ate=` →
  `[{ servico, quantidade, receitaCentavos }]` (agrupado por `servicoNome`).
- `GET /api/relatorios/formas-pagamento?de=&ate=` →
  `[{ metodo, quantidade, totalCentavos }]` (agrupado por método).
- `GET /api/relatorios/evolucao` →
  `[{ mes, faturamentoCentavos }]` (últimos 6 meses, dos pagamentos pagos).
- `GET /api/relatorios/picos` →
  `{ dias: [{ dia, cortes, faturamentoCentavos }], horas: [{ hora, cortes }] }`
  (movimento por dia da semana e por hora, dos agendamentos não cancelados).
- `GET /api/relatorios/clientes-recorrentes` →
  `[{ cliente, visitas, totalCentavos }]` (top 8 por visitas concluídas).

## Booking público e cliente — `/api/publico` e `/api/cliente`

Rotas **sem JWT de staff** (`@Public`). O tenant é resolvido pela **slug** da
barbearia na URL (não pelo token). O cliente tem sessão própria (JWT com
`tipo: "cliente"`, validado pelo `ClienteJwtGuard`), separada da do staff.
Datas no corpo são `data` (YYYY-MM-DD) + `hora` (HH:MM) **no fuso da barbearia**
(convertidos para UTC no servidor).

### Leitura pública

- `GET /api/publico/:slug` → `{ id, nome, slug, fuso, clienteEscolheProfissional, clienteEscolheServico }`.
- `GET /api/publico/:slug/servicos` → serviços ativos.
- `GET /api/publico/:slug/profissionais` → profissionais ativos.
- `GET /api/publico/:slug/horarios?data=&servicoId=&profissionalId=` →
  `[{ hora }]` disponíveis (respeita horário de funcionamento/exceção e
  agendamentos existentes; passo de 30 min).

### Agendar (sem login)

- `POST /api/publico/:slug/agendar` —
  `{ servicoId, data, hora, nome, whatsapp, profissionalId? }` → `201`
  (cria `cliente` por upsert e agendamento `pendente`/origem `cliente`; se não
  informar profissional, escolhe um disponível). `409` se o horário conflita.

### Login do cliente (OTP prioritário + senha)

- `POST /api/publico/:slug/otp` — `{ whatsapp }` → `{ enviado: true }` (envia o
  código por WhatsApp; em dev/teste retorna `codigo`). Rate limit 3/min.
- `POST /api/publico/:slug/login/otp` — `{ whatsapp, codigo }` →
  `{ accessToken, cliente }` (código de 6 dígitos, uso único, expira em ~10 min,
  trava após 5 tentativas; cria o cliente se ainda não existir).
- `POST /api/publico/:slug/login/senha` — `{ whatsapp, senha }` →
  `{ accessToken, cliente }` (só funciona se o cliente já definiu senha).

### Área do cliente (requer JWT de cliente)

- `GET /api/cliente/me` → `{ id, nome, whatsapp, temSenha }`.
- `GET /api/cliente/meus-agendamentos` → agendamentos do próprio cliente.
- `POST /api/cliente/agendamentos/:id/cancelar` → cancela um agendamento próprio.
- `POST /api/cliente/definir-senha` — `{ senha }` → habilita login por senha.
