-- =============================================================================
-- NaRégua — Esquema do banco (PostgreSQL)  [PROPOSTA PARA REVISÃO]
-- -----------------------------------------------------------------------------
-- Multi-tenant: tudo é escopado por `barbearia_id`. Uma instalação serve várias
-- barbearias; o link público /agendar resolve a barbearia pelo `slug`.
--
-- Convenções:
--  - IDs em UUID (gerados no banco).
--  - Dinheiro em CENTAVOS (int) — nunca float, para não acumular erro.
--  - Tempo em timestamptz (UTC no banco; fuso da barbearia só na exibição).
--  - Nomes de tabela no singular.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist";  -- restrição anti-overlap (ver agendamento)

-- ----------------------------------------------------------------------------
-- Tenant
-- ----------------------------------------------------------------------------
create table barbearia (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  slug        text not null unique,        -- usado na URL pública: /agendar/<slug>
  endereco    text,
  telefone    text,
  fuso        text not null default 'America/Sao_Paulo',
  criado_em   timestamptz not null default now()
);

-- Config do agendamento online (1:1 com a barbearia).
-- Espelha apps/web/src/lib/settings.ts (ConfigAgendamento).
create table config_barbearia (
  barbearia_id                  uuid primary key references barbearia(id) on delete cascade,
  cliente_escolhe_profissional  boolean not null default true,
  cliente_escolhe_servico       boolean not null default true,
  atualizado_em                 timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Equipe
-- ----------------------------------------------------------------------------
create table profissional (
  id               uuid primary key default gen_random_uuid(),
  barbearia_id     uuid not null references barbearia(id) on delete cascade,
  nome             text not null,
  apelido          text not null,
  comissao_percent numeric(5,4) not null default 0 check (comissao_percent between 0 and 1),
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);
create index on profissional (barbearia_id);

-- ----------------------------------------------------------------------------
-- Catálogo de serviços
-- ----------------------------------------------------------------------------
create table servico (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  nome            text not null,
  duracao_min     int not null check (duracao_min > 0),
  preco_centavos  int not null check (preco_centavos >= 0),
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);
create index on servico (barbearia_id);

-- Quais serviços cada profissional executa (opcional; habilita filtrar
-- profissionais por serviço no fluxo do cliente). Se a regra for "todos fazem
-- tudo", esta tabela pode ser dispensada — ponto a decidir juntos.
create table profissional_servico (
  profissional_id uuid not null references profissional(id) on delete cascade,
  servico_id      uuid not null references servico(id) on delete cascade,
  primary key (profissional_id, servico_id)
);

-- ----------------------------------------------------------------------------
-- Clientes (quem agenda pelo link)
-- ----------------------------------------------------------------------------
create table cliente (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearia(id) on delete cascade,
  nome         text not null,
  whatsapp     text not null,
  criado_em    timestamptz not null default now(),
  unique (barbearia_id, whatsapp)   -- 1 cadastro por número dentro da barbearia
);

-- ----------------------------------------------------------------------------
-- Agendamentos
-- ----------------------------------------------------------------------------
create type status_agendamento as enum ('pendente', 'confirmado', 'concluido', 'cancelado');
create type origem_agendamento as enum ('cliente', 'balcao');

create table agendamento (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  profissional_id uuid references profissional(id) on delete set null,
  servico_id      uuid references servico(id) on delete set null,
  cliente_id      uuid references cliente(id) on delete set null,

  -- Snapshot do preço no momento da marcação: o preço do serviço pode mudar
  -- depois, mas o histórico/comissão precisa do valor cobrado naquele dia.
  preco_centavos  int not null check (preco_centavos >= 0),

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

-- Impede dois agendamentos ATIVOS no mesmo profissional com horários sobrepostos.
-- (cancelados não bloqueiam o horário)
alter table agendamento
  add constraint agendamento_sem_overlap
  exclude using gist (
    profissional_id with =,
    tstzrange(inicio, fim) with &&
  )
  where (status <> 'cancelado');

-- ----------------------------------------------------------------------------
-- Pagamentos (Pix dinâmico na cadeira — opcional nesta fase)
-- A comissão é DERIVADA (preco_centavos * comissao_percent sobre concluídos),
-- então não guardamos uma tabela de comissão; calculamos por consulta.
-- ----------------------------------------------------------------------------
create type metodo_pagamento as enum ('pix', 'dinheiro', 'cartao');

create table pagamento (
  id              uuid primary key default gen_random_uuid(),
  agendamento_id  uuid not null references agendamento(id) on delete cascade,
  valor_centavos  int not null check (valor_centavos >= 0),
  metodo          metodo_pagamento not null,
  pago_em         timestamptz not null default now()
);
create index on pagamento (agendamento_id);


