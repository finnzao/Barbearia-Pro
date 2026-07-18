# Build no contexto do monorepo (raiz). O web importa @naregua/types (source).
# Rodar de: docker build -f apps/web/Dockerfile .   (contexto = raiz do repo)

FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
# NEXT_PUBLIC_* é embutido no bundle do cliente em BUILD-TIME: precisa vir como ARG.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @naregua/web build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Saída standalone do Next (monorepo): server + node_modules rastreados, static, public.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
