import { PrismaClient } from "@prisma/client";

let cliente: PrismaClient | undefined;

function schemaDoBanco(): string {
  const url = process.env.DATABASE_URL ?? "";
  const match = url.match(/[?&]schema=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : "public";
}

export function prismaTeste(): PrismaClient {
  if (!cliente) {
    cliente = new PrismaClient();
  }
  return cliente;
}

export async function resetDatabase(): Promise<void> {
  const prisma = prismaTeste();
  const schema = schemaDoBanco();

  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = ${schema}
  `;

  const alvos = tabelas
    .map((t) => t.tablename)
    .filter((nome) => nome !== "_prisma_migrations")
    .map((nome) => `"${schema}"."${nome}"`);

  if (alvos.length === 0) {
    return;
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${alvos.join(", ")} RESTART IDENTITY CASCADE`,
  );
}

export async function fecharBanco(): Promise<void> {
  if (cliente) {
    await cliente.$disconnect();
    cliente = undefined;
  }
}
