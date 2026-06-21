-- =============================================================================
-- grants.sql — libera o acesso do usuário da aplicação.
-- Rode CONECTADO ao banco "naregua", como superusuário, DEPOIS do schema.sql:
--   sudo -u postgres psql -d naregua -f apps/api/db/grants.sql
-- =============================================================================

GRANT USAGE ON SCHEMA public TO naregua_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO naregua_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO naregua_app;

-- Garante que tabelas/sequences criadas no futuro também fiquem acessíveis.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO naregua_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO naregua_app;
