CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TYPE "status_agendamento" AS ENUM ('pendente', 'confirmado', 'concluido', 'cancelado');
CREATE TYPE "origem_agendamento" AS ENUM ('cliente', 'balcao');
CREATE TYPE "metodo_pagamento" AS ENUM ('pix_dinamico', 'pix_estatico', 'dinheiro', 'cartao_debito', 'cartao_credito');
CREATE TYPE "status_pagamento" AS ENUM ('pendente', 'pago', 'expirado', 'estornado');
CREATE TYPE "status_repasse" AS ENUM ('pendente', 'pago', 'estornado');
CREATE TYPE "origem_repasse" AS ENUM ('automatico', 'manual', 'split');
CREATE TYPE "modo_repasse" AS ENUM ('imediato', 'periodico', 'manual');
CREATE TYPE "frequencia_repasse" AS ENUM ('semanal', 'quinzenal', 'mensal');

CREATE TABLE "barbearia" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nome" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "endereco" TEXT,
  "telefone" TEXT,
  "fuso" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "barbearia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "barbearia_slug_key" ON "barbearia" ("slug");

CREATE TABLE "config_barbearia" (
  "barbearia_id" UUID NOT NULL,
  "cliente_escolhe_profissional" BOOLEAN NOT NULL DEFAULT true,
  "cliente_escolhe_servico" BOOLEAN NOT NULL DEFAULT true,
  "repasse_modo" "modo_repasse" NOT NULL DEFAULT 'periodico',
  "repasse_frequencia" "frequencia_repasse" NOT NULL DEFAULT 'mensal',
  "repasse_dia" SMALLINT NOT NULL DEFAULT 1,
  "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "config_barbearia_pkey" PRIMARY KEY ("barbearia_id"),
  CONSTRAINT "config_barbearia_repasse_dia_check" CHECK ("repasse_dia" BETWEEN 0 AND 31)
);

CREATE TABLE "horario_funcionamento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "dia_semana" SMALLINT NOT NULL,
  "abre" TIME NOT NULL,
  "fecha" TIME NOT NULL,
  CONSTRAINT "horario_funcionamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "horario_funcionamento_dia_semana_check" CHECK ("dia_semana" BETWEEN 0 AND 6),
  CONSTRAINT "horario_funcionamento_intervalo_check" CHECK ("fecha" > "abre")
);
CREATE INDEX "horario_funcionamento_barbearia_id_dia_semana_idx" ON "horario_funcionamento" ("barbearia_id", "dia_semana");

CREATE TABLE "profissional" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "apelido" TEXT NOT NULL,
  "cargo" TEXT,
  "comissao_percent" NUMERIC(5,4) NOT NULL DEFAULT 0,
  "chave_pix" TEXT,
  "pix_tipo_chave" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "profissional_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "profissional_comissao_percent_check" CHECK ("comissao_percent" BETWEEN 0 AND 1)
);
CREATE INDEX "profissional_barbearia_id_idx" ON "profissional" ("barbearia_id");

CREATE TABLE "usuario" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "profissional_id" UUID,
  "email" TEXT NOT NULL,
  "senha_hash" TEXT NOT NULL,
  "papel" TEXT NOT NULL DEFAULT 'dono',
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usuario_barbearia_id_email_key" ON "usuario" ("barbearia_id", "email");

CREATE TABLE "categoria_servico" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "categoria_servico_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "categoria_servico_barbearia_id_idx" ON "categoria_servico" ("barbearia_id");

CREATE TABLE "servico" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "categoria_id" UUID,
  "nome" TEXT NOT NULL,
  "duracao_min" INTEGER NOT NULL,
  "preco_centavos" INTEGER NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "servico_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "servico_duracao_min_check" CHECK ("duracao_min" > 0),
  CONSTRAINT "servico_preco_centavos_check" CHECK ("preco_centavos" >= 0)
);
CREATE INDEX "servico_barbearia_id_idx" ON "servico" ("barbearia_id");

CREATE TABLE "profissional_servico" (
  "profissional_id" UUID NOT NULL,
  "servico_id" UUID NOT NULL,
  CONSTRAINT "profissional_servico_pkey" PRIMARY KEY ("profissional_id", "servico_id")
);

CREATE TABLE "cliente" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cliente_barbearia_id_whatsapp_key" ON "cliente" ("barbearia_id", "whatsapp");

CREATE TABLE "agendamento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "profissional_id" UUID,
  "servico_id" UUID,
  "cliente_id" UUID,
  "cliente_nome" TEXT,
  "preco_centavos" INTEGER,
  "inicio" TIMESTAMPTZ NOT NULL,
  "fim" TIMESTAMPTZ NOT NULL,
  "status" "status_agendamento" NOT NULL DEFAULT 'confirmado',
  "origem" "origem_agendamento" NOT NULL DEFAULT 'cliente',
  "observacao" TEXT,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "agendamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agendamento_preco_centavos_check" CHECK ("preco_centavos" >= 0),
  CONSTRAINT "agendamento_intervalo_check" CHECK ("fim" > "inicio")
);
CREATE INDEX "agendamento_barbearia_id_inicio_idx" ON "agendamento" ("barbearia_id", "inicio");
CREATE INDEX "agendamento_profissional_id_inicio_idx" ON "agendamento" ("profissional_id", "inicio");

CREATE TABLE "repasse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "profissional_id" UUID NOT NULL,
  "periodo_inicio" TIMESTAMPTZ NOT NULL,
  "periodo_fim" TIMESTAMPTZ NOT NULL,
  "valor_centavos" INTEGER NOT NULL,
  "origem" "origem_repasse" NOT NULL,
  "status" "status_repasse" NOT NULL DEFAULT 'pendente',
  "comprovante" TEXT,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "pago_em" TIMESTAMPTZ,
  CONSTRAINT "repasse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "repasse_valor_centavos_check" CHECK ("valor_centavos" >= 0),
  CONSTRAINT "repasse_periodo_check" CHECK ("periodo_fim" >= "periodo_inicio")
);
CREATE INDEX "repasse_barbearia_id_criado_em_idx" ON "repasse" ("barbearia_id", "criado_em");
CREATE INDEX "repasse_profissional_id_status_idx" ON "repasse" ("profissional_id", "status");

CREATE TABLE "pagamento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "barbearia_id" UUID NOT NULL,
  "profissional_id" UUID NOT NULL,
  "agendamento_id" UUID,
  "servico_id" UUID,
  "valor_centavos" INTEGER NOT NULL,
  "comissao_percent" NUMERIC(5,4) NOT NULL,
  "metodo" "metodo_pagamento" NOT NULL,
  "status" "status_pagamento" NOT NULL DEFAULT 'pendente',
  "txid" TEXT,
  "copia_cola" TEXT,
  "expira_em" TIMESTAMPTZ,
  "criado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "pago_em" TIMESTAMPTZ,
  "repasse_id" UUID,
  CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pagamento_valor_centavos_check" CHECK ("valor_centavos" >= 0),
  CONSTRAINT "pagamento_comissao_percent_check" CHECK ("comissao_percent" BETWEEN 0 AND 1)
);
CREATE INDEX "pagamento_barbearia_id_criado_em_idx" ON "pagamento" ("barbearia_id", "criado_em");
CREATE INDEX "pagamento_profissional_id_status_idx" ON "pagamento" ("profissional_id", "status");
CREATE INDEX "pagamento_repasse_id_idx" ON "pagamento" ("repasse_id");

ALTER TABLE "config_barbearia" ADD CONSTRAINT "config_barbearia_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "horario_funcionamento" ADD CONSTRAINT "horario_funcionamento_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profissional" ADD CONSTRAINT "profissional_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "categoria_servico" ADD CONSTRAINT "categoria_servico_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "servico" ADD CONSTRAINT "servico_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "servico" ADD CONSTRAINT "servico_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "profissional_servico" ADD CONSTRAINT "profissional_servico_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profissional_servico" ADD CONSTRAINT "profissional_servico_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repasse" ADD CONSTRAINT "repasse_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repasse" ADD CONSTRAINT "repasse_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_barbearia_id_fkey" FOREIGN KEY ("barbearia_id") REFERENCES "barbearia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_repasse_id_fkey" FOREIGN KEY ("repasse_id") REFERENCES "repasse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agendamento"
  ADD CONSTRAINT "agendamento_sem_overlap"
  EXCLUDE USING gist ("profissional_id" WITH =, tstzrange("inicio", "fim") WITH &&)
  WHERE ("status" <> 'cancelado');

CREATE VIEW "vw_cliente_fidelidade" AS
SELECT c."id" AS "cliente_id",
       c."whatsapp",
       count(*) AS "total_cortes"
FROM "cliente" c
JOIN "agendamento" a ON a."cliente_id" = c."id" AND a."status" = 'concluido'
GROUP BY c."id", c."whatsapp";
