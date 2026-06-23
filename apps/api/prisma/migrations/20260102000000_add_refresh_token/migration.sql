create table refresh_token (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references usuario(id) on delete cascade,
  token_hash  text not null unique,
  expira_em   timestamptz not null,
  revogado_em timestamptz,
  criado_em   timestamptz not null default now()
);
create index on refresh_token (usuario_id);
