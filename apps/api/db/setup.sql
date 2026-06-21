-- =============================================================================
-- setup.sql — criação do banco e do usuário da aplicação.
-- Rode CONECTADO ao banco "postgres", como superusuário. Ex.:
--   sudo -u postgres psql -f apps/api/db/setup.sql
--
-- Depois, aplique o schema (como superusuário, pois CREATE EXTENSION exige isso):
--   sudo -u postgres psql -d naregua -f apps/api/db/schema.sql
--
-- E por fim libere as tabelas para o usuário da aplicação:
--   sudo -u postgres psql -d naregua -f apps/api/db/grants.sql
-- (ou rode os GRANTs do final deste arquivo manualmente após o schema)
-- =============================================================================

-- Troque a senha antes de usar.
CREATE DATABASE naregua;
CREATE USER naregua_app WITH PASSWORD 'troque_esta_senha';
GRANT ALL PRIVILEGES ON DATABASE naregua TO naregua_app;

-- Observação: CREATE DATABASE não roda dentro de transação, então este arquivo
-- não pode ser combinado com o schema num único \i. Rode na ordem dos comentários acima.

-- --- GRANTS (rode SOMENTE depois de aplicar o schema, conectado ao banco naregua) ---
-- GRANT USAGE ON SCHEMA public TO naregua_app;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO naregua_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO naregua_app;
