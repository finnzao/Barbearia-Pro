-- =============================================================================
-- NaRégua — esquema do banco (PostgreSQL)
-- Multi-tenant: tudo escopado por barbearia_id. Dinheiro em centavos (int).
-- Tempo em timestamptz (UTC no banco; fuso da barbearia só na exibição).
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist";  -- trava anti-overlap em agendamento

create table barbearia (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  slug      text not null unique,            -- URL pública: /agendar/<slug>
  endereco  text,
  telefone  text,
  fuso      text not null default 'America/Sao_Paulo',
  criado_em timestamptz not null default now()
);

-- Espelha apps/web/src/lib/settings.ts.
create table config_barbearia (
  barbearia_id                 uuid primary key references barbearia(id) on delete cascade,
  cliente_escolhe_profissional boolean not null default true,
  cliente_escolhe_servico      boolean not null default true,
  -- Repasse: o dono liga/desliga o automático e escolhe quando ele roda.
  repasse_automatico           boolean not null default true,
  repasse_frequencia           text not null default 'mensal'
                                 check (repasse_frequencia in ('semanal', 'quinzenal', 'mensal')),
  repasse_dia                  smallint not null default 1,  -- mensal: dia do mês (1-28); semanal/quinzenal: dia da semana (0-6)
  atualizado_em                timestamptz not null default now()
);

-- Horário semanal. dia_semana 0 = domingo (igual ao getDay() do JS).
-- Dia sem linha = fechado. Vários intervalos no mesmo dia = pausa (almoço).
create table horario_funcionamento (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearia(id) on delete cascade,
  dia_semana   smallint not null check (dia_semana between 0 and 6),
  abre         time not null,
  fecha        time not null,
  check (fecha > abre)
);
create index on horario_funcionamento (barbearia_id, dia_semana);

create table profissional (
  id               uuid primary key default gen_random_uuid(),
  barbearia_id     uuid not null references barbearia(id) on delete cascade,
  nome             text not null,
  apelido          text not null,
  cargo            text,
  comissao_percent numeric(5,4) not null default 0 check (comissao_percent between 0 and 1),
  chave_pix        text,        -- cada profissional recebe direto na própria chave
  pix_tipo_chave   text,        -- cpf | cnpj | email | telefone | aleatoria
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);
create index on profissional (barbearia_id);

-- Login do painel. profissional_id liga o usuário ao funcionário (futuro).
create table usuario (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  profissional_id uuid references profissional(id) on delete set null,
  email           text not null,
  senha_hash      text not null,
  papel           text not null default 'dono',
  criado_em       timestamptz not null default now(),
  unique (barbearia_id, email)
);

create table categoria_servico (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearia(id) on delete cascade,
  nome         text not null,
  criado_em    timestamptz not null default now()
);
create index on categoria_servico (barbearia_id);

create table servico (
  id             uuid primary key default gen_random_uuid(),
  barbearia_id   uuid not null references barbearia(id) on delete cascade,
  categoria_id   uuid references categoria_servico(id) on delete set null,
  nome           text not null,
  duracao_min    int not null check (duracao_min > 0),
  preco_centavos int not null check (preco_centavos >= 0),
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now()
);
create index on servico (barbearia_id);

create table profissional_servico (
  profissional_id uuid not null references profissional(id) on delete cascade,
  servico_id      uuid not null references servico(id) on delete cascade,
  primary key (profissional_id, servico_id)
);

create table cliente (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearia(id) on delete cascade,
  nome         text not null,
  whatsapp     text not null,
  criado_em    timestamptz not null default now(),
  unique (barbearia_id, whatsapp)
);

-- Espelha StatusAgendamento em apps/web/src/lib/types.ts (mesmos valores).
create type status_agendamento as enum ('pendente', 'confirmado', 'concluido', 'cancelado');
create type origem_agendamento as enum ('cliente', 'balcao');

create table agendamento (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  profissional_id uuid references profissional(id) on delete set null,  -- null = qualquer
  servico_id      uuid references servico(id) on delete set null,
  cliente_id      uuid references cliente(id) on delete set null,
  cliente_nome    text,                                                 -- fallback do balcão
  preco_centavos  int check (preco_centavos >= 0),                      -- snapshot; null se em aberto
  inicio          timestamptz not null,
  fim             timestamptz not null,
  status          status_agendamento not null default 'confirmado',
  origem          origem_agendamento not null default 'cliente',
  observacao      text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  check (fim > inicio)
);
create index on agendamento (barbearia_id, inicio);
create index on agendamento (profissional_id, inicio);

-- Dois agendamentos ativos não se sobrepõem no mesmo profissional.
alter table agendamento
  add constraint agendamento_sem_overlap
  exclude using gist (profissional_id with =, tstzrange(inicio, fim) with &&)
  where (status <> 'cancelado');

-- Espelha MetodoPagamento em apps/web/src/lib/types.ts.
-- Cartão fica separado em débito/crédito (taxa e conciliação diferentes).
create type metodo_pagamento as enum (
  'pix_dinamico',
  'pix_estatico',
  'dinheiro',
  'cartao_debito',
  'cartao_credito'
);
create type status_pagamento as enum ('pendente', 'pago', 'expirado', 'estornado');

-- Base da comissão: sempre vinculado a um profissional. comissao_percent
-- congelado aqui para que mudar a taxa do profissional não reescreva o histórico.
create table pagamento (
  id               uuid primary key default gen_random_uuid(),
  barbearia_id     uuid not null references barbearia(id) on delete cascade,
  profissional_id  uuid not null references profissional(id) on delete restrict,
  agendamento_id   uuid references agendamento(id) on delete set null,
  servico_id       uuid references servico(id) on delete set null,
  valor_centavos   int not null check (valor_centavos >= 0),
  comissao_percent numeric(5,4) not null check (comissao_percent between 0 and 1),
  metodo           metodo_pagamento not null,
  status           status_pagamento not null default 'pendente',
  txid             text,        -- só pix dinâmico
  copia_cola       text,        -- só pix dinâmico
  expira_em        timestamptz, -- só pix dinâmico
  criado_em        timestamptz not null default now(),
  pago_em          timestamptz
);
create index on pagamento (barbearia_id, criado_em);
create index on pagamento (profissional_id, status);

-- ---------------------------------------------------------------------------
-- Repasse: o que a barbearia transfere para cada profissional ao liquidar.
-- Gerado pelo fechamento automático (calendário do dono) ou sob demanda.
-- ---------------------------------------------------------------------------
create type status_repasse as enum ('pendente', 'pago', 'estornado');
-- Espelha OrigemRepasse em apps/web/src/lib/repasse.ts.
-- 'split' = creditado na hora pelo split do Pix (modo imediato).
create type origem_repasse as enum ('automatico', 'manual', 'split');
create table repasse (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  profissional_id uuid not null references profissional(id) on delete restrict,
  periodo_inicio  timestamptz not null,
  periodo_fim     timestamptz not null,
  valor_centavos  int not null check (valor_centavos >= 0),
  origem          origem_repasse not null,   -- automatico (calendário), manual (sob demanda) ou split (imediato)
  status          status_repasse not null default 'pendente',
  comprovante     text,
  criado_em       timestamptz not null default now(),
  pago_em         timestamptz,
  check (periodo_fim >= periodo_inicio)
);
create index on repasse (barbearia_id, criado_em);
create index on repasse (profissional_id, status);

-- Liga cada pagamento ao repasse em que foi liquidado; NULL = ainda não repassado.
-- É o que impede pagar o profissional em dobro: o fechamento só pega os NULL.
alter table pagamento add column repasse_id uuid references repasse(id) on delete set null;
create index on pagamento (repasse_id);

-- Fidelidade por número: total de cortes concluídos de cada cliente.
create view vw_cliente_fidelidade as
select c.id      as cliente_id,
       c.whatsapp,
       count(*)  as total_cortes
from cliente c
join agendamento a on a.cliente_id = c.id and a.status = 'concluido'
group by c.id, c.whatsapp;
