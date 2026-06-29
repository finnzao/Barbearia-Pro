FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Sessão persistida em volume; ver docker-compose.
ENV AUTH_DIR=/data/auth
EXPOSE 4000

CMD ["node", "src/index.js"]
