# WhatsApp do sistema (Baileys)

Container isolado, sessão única vinculada por QR. Envia OTP e avisos do sistema
(número central do SaaS). A API fala com ele pela rede interna; a **configuração
é feita por túnel SSH**, nunca por endpoint público.

## Subir

```bash
cp apps/whatsapp/.env.example apps/whatsapp/.env   # defina WHATSAPP_API_TOKEN
docker compose up -d --build whatsapp
```

A porta liga só em `127.0.0.1:4000` do VPS — não há nada exposto na internet.

## Configurar / parear (via SSH)

Do seu computador, abra um túnel até a porta privada do container no VPS:

```bash
ssh -L 4000:localhost:4000 user@SEU_VPS
```

Com o túnel aberto, no seu navegador local:

- `http://localhost:4000/qr` — QR para vincular a sessão (escaneie no WhatsApp do
  número do sistema: Aparelhos conectados → Conectar um aparelho).
- `http://localhost:4000/status` — estado da sessão (`conectado`, `aguardando_qr`,
  `desconectado`).

Depois de conectar, `/qr` passa a responder 404 (não há QR pendente). A sessão
fica salva no volume `whatsapp_auth` e reconecta sozinha após reinícios.

## Re-parear (sessão caída / trocar de número)

Quando a sessão é deslogada (QR revogado no celular) ou você troca de número,
descarte a sessão e suba de novo para gerar um QR novo:

```bash
docker compose stop whatsapp
docker volume rm barbearia-pro_whatsapp_auth   # confira o nome com: docker volume ls
docker compose up -d whatsapp
# reabra o túnel SSH e escaneie /qr
```

## Segurança

- O volume `whatsapp_auth` **é a conta** do WhatsApp: trate como segredo
  (permissão restrita, backup cifrado).
- `POST /mensagens` e o webhook de status exigem `WHATSAPP_API_TOKEN` (Bearer) —
  o mesmo valor configurado na API.
- Nunca publique a porta 4000 fora de `127.0.0.1`. Toda config passa pelo túnel.
