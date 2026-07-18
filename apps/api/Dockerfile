# Build no contexto do monorepo (raiz): a api importa @naregua/types e usa o
# tsconfig de @naregua/config, ambos source-only — precisam do workspace inteiro.
# Rodar de: docker build -f apps/api/Dockerfile .   (contexto = raiz do repo)

FROM node:22-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @naregua/api build

FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
ENV NODE_ENV=production
# ponytail: copia o repo buildado inteiro (inclui devDeps) — simples e confiável
# num monorepo pnpm, e o CLI do prisma fica disponível pro migrate deploy.
# Enxugar com `pnpm deploy` só quando o tamanho da imagem incomodar.
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3333
# Migra o banco antes de subir (idempotente); só então inicia a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
