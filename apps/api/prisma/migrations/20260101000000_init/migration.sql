create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create type status_agendamento as enum ('pendente', 'confirmado', 'concluido', 'cancelado');
create type origem_agendamento as enum ('cliente', 'balcao');
create type metodo_pagamento as enum (
  'pix_dinamico',
  'pix_estatico',
  'dinheiro',
  'cartao_debito',
  'cartao_credito'
);
create type status_pagamento as enum ('pendente', 'pago', 'expirado', 'estornado');
create type status_repasse as enum ('pendente', 'pago', 'estornado');
create type origem_repasse as enum ('automatico', 'manual', 'split');
create type modo_repasse as enum ('imediato', 'periodico', 'manual');
create type frequencia_repasse as enum ('semanal', 'quinzenal', 'mensal');
create type papel_usuario as enum ('dono', 'profissional', 'recepcao');
create type tipo_chave_pix as enum ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria');
create type tipo_notificacao as enum ('confirmacao', 'lembrete', 'cancelamento', 'remarcacao');
create type status_notificacao as enum ('pendente', 'enviado', 'falha');
create type metodo_cobranca as enum ('manual', 'cartao_recorrente');
create type status_assinatura_cliente as enum ('ativa', 'cancelada');

create table barbearia (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null,
  slug                   text not null unique,
  endereco               text,
  telefone               text,
  fuso                   text not null default 'America/Sao_Paulo',
  pix_chave_central      text,
  pix_tipo_chave_central tipo_chave_pix,
  pix_nome_recebedor     text,
  -- Conta Mercado Pago conectada via OAuth (marketplace); tokens cifrados (AES-256-GCM)
  mp_user_id             text,
  mp_access_token        text,
  mp_refresh_token       text,
  mp_token_expira_em     timestamptz,
  criado_em              timestamptz not null default now()
);

create table config_barbearia (
  barbearia_id                 uuid primary key references barbearia(id) on delete cascade,
  cliente_escolhe_profissional boolean not null default true,
  cliente_escolhe_servico      boolean not null default true,
  repasse_modo                 modo_repasse not null default 'periodico',
  repasse_frequencia           frequencia_repasse not null default 'mensal',
  repasse_dia                  smallint not null default 5,
  atualizado_em                timestamptz not null default now(),
  check (
    (repasse_frequencia = 'mensal' and repasse_dia between 1 and 28)
    or (repasse_frequencia in ('semanal', 'quinzenal') and repasse_dia between 0 and 6)
  )
);

create table horario_funcionamento (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearia(id) on delete cascade,
  dia_semana   smallint not null check (dia_semana between 0 and 6),
  abre         time not null,
  fecha        time not null,
  check (fecha > abre)
);
create index on horario_funcionamento (barbearia_id, dia_semana);

create table horario_excecao (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearia(id) on delete cascade,
  data         date not null,
  fechado      boolean not null default true,
  abre         time,
  fecha        time,
  motivo       text,
  criado_em    timestamptz not null default now(),
  unique (barbearia_id, data),
  check (fechado or (abre is not null and fecha is not null and fecha > abre))
);
create index on horario_excecao (barbearia_id, data);

create table profissional (
  id               uuid primary key default gen_random_uuid(),
  barbearia_id     uuid not null references barbearia(id) on delete cascade,
  nome             text not null,
  apelido          text not null,
  cargo            text,
  comissao_percent numeric(5,4) not null default 0 check (comissao_percent between 0 and 1),
  chave_pix        text,
  pix_tipo_chave   tipo_chave_pix,
  pix_marcador     text,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);
create index on profissional (barbearia_id);
create unique index on profissional (barbearia_id, pix_marcador) where pix_marcador is not null;

create table bloqueio (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  profissional_id uuid references profissional(id) on delete cascade,
  inicio          timestamptz not null,
  fim             timestamptz not null,
  motivo          text,
  criado_em       timestamptz not null default now(),
  check (fim > inicio)
);
create index on bloqueio (barbearia_id, inicio);
create index on bloqueio (profissional_id, inicio);

create table usuario (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  profissional_id uuid references profissional(id) on delete set null,
  email           text not null,
  senha_hash      text not null,
  papel           papel_usuario not null default 'dono',
  criado_em       timestamptz not null default now(),
  unique (barbearia_id, email)
);

create table refresh_token (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references usuario(id) on delete cascade,
  token_hash  text not null unique,
  expira_em   timestamptz not null,
  revogado_em timestamptz,
  criado_em   timestamptz not null default now()
);
create index on refresh_token (usuario_id);

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
  id                   uuid primary key default gen_random_uuid(),
  barbearia_id         uuid not null references barbearia(id) on delete cascade,
  nome                 text not null,
  whatsapp             text not null,
  senha_hash           text,
  opt_out_notificacoes boolean not null default false,
  criado_em            timestamptz not null default now(),
  unique (barbearia_id, whatsapp)
);

create table verificacao_cliente (
  id           uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearia(id) on delete cascade,
  whatsapp     text not null,
  codigo_hash  text not null,
  tentativas   int not null default 0,
  expira_em    timestamptz not null,
  consumido_em timestamptz,
  criado_em    timestamptz not null default now()
);
create index on verificacao_cliente (barbearia_id, whatsapp);

-- Catálogo de planos de assinatura vendidos pela barbearia aos próprios
-- clientes (não confundir com a assinatura do SaaS). Vale pra barbearia
-- inteira, não por profissional.
create table plano_assinatura (
  id             uuid primary key default gen_random_uuid(),
  barbearia_id   uuid not null references barbearia(id) on delete cascade,
  nome           text not null,
  preco_centavos int not null check (preco_centavos >= 0),
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now()
);
create index on plano_assinatura (barbearia_id);

-- Cesta do plano: quantas vezes por mês cada serviço está incluído.
create table plano_assinatura_item (
  id             uuid primary key default gen_random_uuid(),
  plano_id       uuid not null references plano_assinatura(id) on delete cascade,
  servico_id     uuid not null references servico(id) on delete restrict,
  quantidade_mes int not null check (quantidade_mes > 0),
  unique (plano_id, servico_id)
);

-- Vínculo do cliente a um plano. O uso do ciclo é derivado (contagem de
-- agendamentos concluídos ligados a esta assinatura), nunca armazenado —
-- mesmo princípio da comissão (derivada do pagamento, RN-17).
create table assinatura_cliente (
  id                   uuid primary key default gen_random_uuid(),
  barbearia_id         uuid not null references barbearia(id) on delete cascade,
  cliente_id           uuid not null references cliente(id) on delete cascade,
  plano_id             uuid not null references plano_assinatura(id) on delete restrict,
  metodo_cobranca      metodo_cobranca not null default 'manual',
  status               status_assinatura_cliente not null default 'ativa',
  assinado_em          timestamptz not null default now(),
  ultimo_ciclo_pago_em timestamptz,
  cancelado_em         timestamptz
);
create index on assinatura_cliente (barbearia_id, cliente_id);
-- Só uma assinatura ativa por cliente ao mesmo tempo.
create unique index assinatura_cliente_ativa_unica on assinatura_cliente (cliente_id) where (status = 'ativa');

create table agendamento (
  id                    uuid primary key default gen_random_uuid(),
  barbearia_id          uuid not null references barbearia(id) on delete cascade,
  profissional_id       uuid references profissional(id) on delete set null,
  servico_id            uuid references servico(id) on delete set null,
  cliente_id            uuid references cliente(id) on delete set null,
  cliente_nome          text,
  preco_centavos        int check (preco_centavos >= 0),
  assinatura_cliente_id uuid references assinatura_cliente(id) on delete set null,
  inicio                timestamptz not null,
  fim                   timestamptz not null,
  status                status_agendamento not null default 'confirmado',
  origem                origem_agendamento not null default 'cliente',
  observacao            text,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  check (fim > inicio)
);
create index on agendamento (barbearia_id, inicio);
create index on agendamento (profissional_id, inicio);
create index on agendamento (assinatura_cliente_id, servico_id, status);

alter table agendamento
  add constraint agendamento_sem_overlap
  exclude using gist (profissional_id with =, tstzrange(inicio, fim) with &&)
  where (status <> 'cancelado');

create table notificacao_whatsapp (
  id             uuid primary key default gen_random_uuid(),
  barbearia_id   uuid not null references barbearia(id) on delete cascade,
  agendamento_id uuid references agendamento(id) on delete set null,
  whatsapp       text not null,
  tipo           tipo_notificacao not null,
  texto          text not null,
  status         status_notificacao not null default 'pendente',
  tentativas     int not null default 0,
  enviado_em     timestamptz,
  criado_em      timestamptz not null default now()
);
create index on notificacao_whatsapp (status, criado_em);
create index on notificacao_whatsapp (agendamento_id, tipo);

create table repasse (
  id              uuid primary key default gen_random_uuid(),
  barbearia_id    uuid not null references barbearia(id) on delete cascade,
  profissional_id uuid not null references profissional(id) on delete restrict,
  periodo_inicio  timestamptz not null,
  periodo_fim     timestamptz not null,
  valor_centavos  int not null check (valor_centavos >= 0),
  origem          origem_repasse not null,
  status          status_repasse not null default 'pendente',
  comprovante     text,
  criado_em       timestamptz not null default now(),
  pago_em         timestamptz,
  check (periodo_fim >= periodo_inicio)
);
create index on repasse (barbearia_id, criado_em);
create index on repasse (profissional_id, status);

create table pagamento (
  id               uuid primary key default gen_random_uuid(),
  barbearia_id     uuid not null references barbearia(id) on delete cascade,
  profissional_id  uuid not null references profissional(id) on delete restrict,
  agendamento_id   uuid references agendamento(id) on delete set null,
  servico_id       uuid references servico(id) on delete set null,
  servico_nome     text,
  valor_centavos   int not null check (valor_centavos >= 0),
  comissao_percent numeric(5,4) not null check (comissao_percent between 0 and 1),
  metodo           metodo_pagamento not null,
  status           status_pagamento not null default 'pendente',
  txid             text,
  copia_cola       text,
  expira_em        timestamptz,
  repasse_id       uuid references repasse(id) on delete set null,
  criado_em        timestamptz not null default now(),
  pago_em          timestamptz
);
create index on pagamento (barbearia_id, criado_em);
create index on pagamento (profissional_id, status);
create index on pagamento (repasse_id);

create table split_pagamento (
  id                    uuid primary key default gen_random_uuid(),
  pagamento_id          uuid not null unique references pagamento(id) on delete cascade,
  barbearia_id          uuid not null references barbearia(id) on delete cascade,
  profissional_id       uuid not null references profissional(id) on delete restrict,
  chave_central         text not null,
  marcador_prof         text not null,
  chave_destino_prof    text,
  tipo_chave_destino    tipo_chave_pix,
  valor_total_centavos  int not null check (valor_total_centavos >= 0),
  valor_salao_centavos  int not null check (valor_salao_centavos >= 0),
  valor_prof_centavos   int not null check (valor_prof_centavos >= 0),
  liquidado             boolean not null default false,
  criado_em             timestamptz not null default now(),
  liquidado_em          timestamptz,
  check (valor_salao_centavos + valor_prof_centavos = valor_total_centavos)
);
create index on split_pagamento (barbearia_id, criado_em);
create index on split_pagamento (profissional_id, liquidado);

create view vw_cliente_fidelidade as
select c.id        as cliente_id,
       c.whatsapp,
       count(distinct a.id)                                                            as total_cortes,
       coalesce(sum(pg.valor_centavos) filter (where pg.status = 'pago'), 0)::int      as total_gasto_centavos
from cliente c
join agendamento a on a.cliente_id = c.id and a.status = 'concluido'
left join pagamento pg on pg.agendamento_id = a.id
group by c.id, c.whatsapp;
