import { PapelUsuario, Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { prismaTeste } from "./db";

let sequencia = 0;
function proximo(): number {
  sequencia += 1;
  return sequencia;
}

export async function criarBarbearia(
  dados: Partial<Prisma.BarbeariaCreateInput> = {},
) {
  const n = proximo();
  return prismaTeste().barbearia.create({
    data: {
      nome: dados.nome ?? `Barbearia ${n}`,
      slug: dados.slug ?? `barbearia-${n}`,
      fuso: dados.fuso ?? "America/Sao_Paulo",
      ...dados,
    },
  });
}

export async function criarProfissional(
  barbeariaId: string,
  dados: Partial<Prisma.ProfissionalUncheckedCreateInput> = {},
) {
  const n = proximo();
  return prismaTeste().profissional.create({
    data: {
      barbeariaId,
      nome: dados.nome ?? `Profissional ${n}`,
      apelido: dados.apelido ?? `prof${n}`,
      comissaoPercent: dados.comissaoPercent ?? 0.5,
      ...dados,
    },
  });
}

export async function criarServico(
  barbeariaId: string,
  dados: Partial<Prisma.ServicoUncheckedCreateInput> = {},
) {
  const n = proximo();
  return prismaTeste().servico.create({
    data: {
      barbeariaId,
      nome: dados.nome ?? `Servico ${n}`,
      duracaoMin: dados.duracaoMin ?? 30,
      precoCentavos: dados.precoCentavos ?? 4000,
      ...dados,
    },
  });
}

export async function criarUsuario(
  barbeariaId: string,
  opcoes: {
    email?: string;
    senha?: string;
    papel?: PapelUsuario;
    profissionalId?: string;
  } = {},
) {
  const n = proximo();
  const senha = opcoes.senha ?? "Senha@123";
  const usuario = await prismaTeste().usuario.create({
    data: {
      barbeariaId,
      email: opcoes.email ?? `usuario${n}@teste.com`,
      senhaHash: await argon2.hash(senha),
      papel: opcoes.papel ?? PapelUsuario.dono,
      profissionalId: opcoes.profissionalId,
    },
  });
  return { usuario, senha };
}

export async function cenarioBase() {
  const barbearia = await criarBarbearia();
  const profissional = await criarProfissional(barbearia.id);
  const servico = await criarServico(barbearia.id);
  return { barbearia, profissional, servico };
}
