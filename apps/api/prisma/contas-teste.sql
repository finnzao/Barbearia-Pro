-- Contas de teste (dono + funcionário) para o Postgres.
-- Senha de ambos: Senha@123  (hash argon2 já gerado abaixo).
-- Login é por e-mail + senha (sem slug).
--   dono@teste.com        -> papel dono
--   funcionario@teste.com -> papel profissional (ligado a um profissional)
--
-- Rodar (schema public): psql "<DATABASE_URL>" -f apps/api/prisma/contas-teste.sql
-- Idempotente: usa chaves naturais (slug/apelido/email) e faz UPDATE da senha
-- em re-runs, então não colide com dados antigos e pode rodar várias vezes.

BEGIN;

-- Barbearia de teste (chave: slug)
INSERT INTO barbearia (nome, slug, fuso)
VALUES ('Barbearia Teste', 'barbearia-teste', 'America/Sao_Paulo')
ON CONFLICT (slug) DO NOTHING;

-- Config da barbearia (defaults; necessária para o painel)
INSERT INTO config_barbearia (barbearia_id)
SELECT id FROM barbearia WHERE slug = 'barbearia-teste'
ON CONFLICT (barbearia_id) DO NOTHING;

-- Profissional vinculado ao funcionário (guard por apelido, sem chave natural)
INSERT INTO profissional (barbearia_id, nome, apelido, comissao_percent, ativo)
SELECT b.id, 'João Funcionário', 'João Teste', 0.5, true
FROM barbearia b
WHERE b.slug = 'barbearia-teste'
  AND NOT EXISTS (
    SELECT 1 FROM profissional p
    WHERE p.barbearia_id = b.id AND p.apelido = 'João Teste'
  );

-- Usuário DONO (chave: barbearia_id + email; UPDATE refresca a senha)
INSERT INTO usuario (barbearia_id, email, senha_hash, papel)
SELECT id,
       'dono@teste.com',
       '$argon2id$v=19$m=65536,t=3,p=4$G12Goj3EZWgveLZiPwKTlw$6UR9ZJuHxKS+/R8D7K9x5C4fnIpFOI5wfu4K2j/CX5Y',
       'dono'
FROM barbearia WHERE slug = 'barbearia-teste'
ON CONFLICT (barbearia_id, email)
DO UPDATE SET senha_hash = EXCLUDED.senha_hash, papel = EXCLUDED.papel;

-- Usuário FUNCIONÁRIO (papel profissional, ligado ao profissional acima)
INSERT INTO usuario (barbearia_id, profissional_id, email, senha_hash, papel)
SELECT b.id,
       p.id,
       'funcionario@teste.com',
       '$argon2id$v=19$m=65536,t=3,p=4$G12Goj3EZWgveLZiPwKTlw$6UR9ZJuHxKS+/R8D7K9x5C4fnIpFOI5wfu4K2j/CX5Y',
       'profissional'
FROM barbearia b
JOIN profissional p ON p.barbearia_id = b.id AND p.apelido = 'João Teste'
WHERE b.slug = 'barbearia-teste'
ON CONFLICT (barbearia_id, email)
DO UPDATE SET senha_hash = EXCLUDED.senha_hash,
              profissional_id = EXCLUDED.profissional_id,
              papel = EXCLUDED.papel;

COMMIT;
