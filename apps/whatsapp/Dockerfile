FROM node:22-alpine

WORKDIR /app

# git: o Baileys puxa a dependência libsignal via github (npm precisa clonar).
RUN apk add --no-cache git

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Sessão persistida em volume; ver docker-compose.
ENV AUTH_DIR=/data/auth
EXPOSE 4000

CMD ["node", "src/index.js"]
