# Deploy (VPS Vultr São Paulo)

Stack: Postgres + API (NestJS) + Web (Next) + WhatsApp (Baileys) + Caddy (HTTPS),
tudo em containers na mesma rede. Caddy é o único exposto (80/443).

## 1. Provisionar a VPS
- Vultr Cloud Compute, região **São Paulo**, Ubuntu 22.04+, ≥2 GB RAM.
- Instalar Docker + compose plugin:
  ```
  curl -fsSL https://get.docker.com | sh
  ```

## 2. DNS
Aponte dois registros A pro IP da VPS:
- `app.seudominio.com.br` → IP
- `api.seudominio.com.br` → IP

## 3. Código + variáveis
```
git clone <repo> && cd "Barbearia Pro"
cp .env.prod.example .env              # edite: POSTGRES_PASSWORD, DOMAIN_APP, DOMAIN_API
```
Crie `apps/api/.env` só com os **segredos** (o compose já injeta DATABASE_URL,
WEB_ORIGIN, NODE_ENV, TRUST_PROXY, WHATSAPP_API_URL e WHATSAPP_API_TOKEN):
```
JWT_SECRET=<>=32 chars>
CIFRA_SEGREDO=<64 hex>                  # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MERCADOPAGO_WEBHOOK_SECRET=<do painel MP, >=32 chars>
MERCADOPAGO_CLIENT_ID=<do painel MP>
MERCADOPAGO_CLIENT_SECRET=<do painel MP>
MERCADOPAGO_REDIRECT_URI=https://api.seudominio.com.br/api/pagamentos/mercadopago/callback
```
> `WHATSAPP_API_TOKEN` **não** vai aqui: ele é compartilhado entre a API e o
> container do WhatsApp, então mora no `.env` da raiz (o compose entrega o mesmo
> valor aos dois). Se os dois lados divergirem, o envio toma 401 em silêncio.

## 4. Subir
```
docker compose up -d --build
```
A API roda `prisma migrate deploy` no boot (cria o schema). Caddy emite o TLS
automaticamente (leva ~1 min na primeira vez).

## 5. Mercado Pago (painel)
- Redirect URI OAuth: `https://api.seudominio.com.br/api/pagamentos/mercadopago/callback`
- Webhook (evento **Order**): `https://api.seudominio.com.br/api/pagamentos/webhook/mercadopago`
- Copie a **assinatura secreta** do webhook pro `MERCADOPAGO_WEBHOOK_SECRET`.

## 6. WhatsApp (parear a sessão — passo manual único)
É o que faz o **código de login (OTP)** chegar no WhatsApp do cliente. Sem parear,
a API aceita o pedido mas a mensagem não sai.

A porta 4000 é privada (bind em 127.0.0.1). Abra por túnel SSH e escaneie o QR:
```
ssh -L 4000:localhost:4000 usuario@vps
# no navegador local:
#   http://localhost:4000/status   -> {"estado":"aguardando_qr"|"conectado"}
#   http://localhost:4000/qr       -> QR em PNG; escaneie com o WhatsApp do
#                                     número da barbearia (Aparelhos conectados)
```
Quando `/status` responder `{"estado":"conectado"}`, o pareamento acabou. A sessão
fica no volume `whatsapp_auth` e sobrevive a restarts — só repita isto se você
deslogar o aparelho pelo celular.

**Como o código de login funciona depois disso:**
1. Cliente abre `/agendar/<slug>/conta`, digita o WhatsApp e pede o código.
2. A API gera 6 dígitos, guarda só o hash (argon2), com validade de 10 min e
   limite de 5 tentativas — e chama `POST http://whatsapp:4000/mensagens`.
3. O container envia pelo número pareado; o cliente digita o código e entra.

Em `NODE_ENV=production` o código **nunca** volta na resposta HTTP — só pelo
WhatsApp. Fora de produção ele vem no corpo (campo `codigo`), o que permite testar
o login sem parear nada.

> O número pareado é o do **sistema**, e é ponto único de falha do login por OTP:
> se a sessão cair, ninguém recebe código. Hoje a queda só vira log
> (`whatsapp-status.controller.ts`) — vale ligar um alerta antes de escalar.

## Atualizar
```
git pull && docker compose up -d --build
```

## Backup (o que importa)
- Volume `pg_data` (dados) — `docker compose exec postgres pg_dump -U naregua naregua > backup.sql` num cron.
- Volume `whatsapp_auth` — a sessão do WhatsApp (evita reparear).
