-- Opt-out de notificações (LGPD) no cliente
ALTER TABLE "cliente" ADD COLUMN "opt_out_notificacoes" boolean NOT NULL DEFAULT false;

-- Tipos do outbox de WhatsApp
CREATE TYPE "tipo_notificacao" AS ENUM ('confirmacao', 'lembrete', 'cancelamento', 'remarcacao');
CREATE TYPE "status_notificacao" AS ENUM ('pendente', 'enviado', 'falha');

-- Outbox: fila com retry, drenada por um worker
CREATE TABLE "notificacao_whatsapp" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "barbearia_id" uuid NOT NULL,
    "agendamento_id" uuid,
    "whatsapp" text NOT NULL,
    "tipo" "tipo_notificacao" NOT NULL,
    "texto" text NOT NULL,
    "status" "status_notificacao" NOT NULL DEFAULT 'pendente',
    "tentativas" integer NOT NULL DEFAULT 0,
    "enviado_em" timestamptz(6),
    "criado_em" timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT "notificacao_whatsapp_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notificacao_whatsapp_barbearia_id_fkey" FOREIGN KEY ("barbearia_id")
        REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notificacao_whatsapp_agendamento_id_fkey" FOREIGN KEY ("agendamento_id")
        REFERENCES "agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "notificacao_whatsapp_status_criado_em_idx" ON "notificacao_whatsapp" ("status", "criado_em");
CREATE INDEX "notificacao_whatsapp_agendamento_id_tipo_idx" ON "notificacao_whatsapp" ("agendamento_id", "tipo");
