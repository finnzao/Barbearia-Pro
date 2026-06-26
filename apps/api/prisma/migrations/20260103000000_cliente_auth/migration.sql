alter table cliente add column senha_hash text;

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
