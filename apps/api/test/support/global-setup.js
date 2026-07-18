const { execSync } = require("node:child_process");
const path = require("node:path");

function schemaDoBanco(url) {
  const match = (url ?? "").match(/[?&]schema=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : "public";
}

module.exports = async () => {
  require("dotenv").config({
    path: path.resolve(__dirname, "../../.env.test"),
    override: true,
  });

  // O projeto mantém UMA migration (pré-lançamento) e a edita à mão. Como o
  // prisma marca a migration por checksum, um ALTER novo NUNCA chega a um banco
  // que já a aplicou: a suíte rodaria contra um schema velho e falharia com
  // erros sem relação com a mudança. Recriar o schema torna a migration a única
  // fonte da verdade a cada run. É o banco de teste — o beforeEach já trunca tudo.
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const schema = schemaDoBanco(process.env.DATABASE_URL);
  try {
    await prisma.$executeRawUnsafe(`drop schema if exists "${schema}" cascade`);
    await prisma.$executeRawUnsafe(`create schema "${schema}"`);
  } finally {
    await prisma.$disconnect();
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: process.env,
    stdio: "ignore",
  });
};
