const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

const prisma = new PrismaClient();

const BARBEARIA_ID = "00000000-0000-0000-0000-000000000001";
const CATEGORIA_ID = "00000000-0000-0000-0000-000000000041";
const ADMIN_ID = "00000000-0000-0000-0000-000000000021";
const PROF_USER_ID = "00000000-0000-0000-0000-000000000022";

const PROFISSIONAIS = [
  { id: "00000000-0000-0000-0000-000000000011", nome: "Carlos Silva", apelido: "Carlos", cargo: "Barbeiro", comissaoPercent: 0.5 },
  { id: "00000000-0000-0000-0000-000000000012", nome: "Bruno Souza", apelido: "Bruno", cargo: "Barbeiro", comissaoPercent: 0.4 },
];

const SERVICOS = [
  { id: "00000000-0000-0000-0000-000000000031", nome: "Corte de cabelo", duracaoMin: 30, precoCentavos: 4000 },
  { id: "00000000-0000-0000-0000-000000000032", nome: "Barba", duracaoMin: 20, precoCentavos: 3000 },
  { id: "00000000-0000-0000-0000-000000000033", nome: "Corte e barba", duracaoMin: 50, precoCentavos: 6500 },
  { id: "00000000-0000-0000-0000-000000000034", nome: "Sobrancelha", duracaoMin: 10, precoCentavos: 1500 },
  { id: "00000000-0000-0000-0000-000000000035", nome: "Pezinho", duracaoMin: 10, precoCentavos: 1200 },
];

const HORARIOS = [1, 2, 3, 4, 5].map((diaSemana, indice) => ({
  id: `00000000-0000-0000-0000-0000000000${51 + indice}`,
  diaSemana,
  abre: new Date("1970-01-01T09:00:00.000Z"),
  fecha: new Date("1970-01-01T19:00:00.000Z"),
}));

async function main() {
  const senhaHashAdmin = await argon2.hash("admin123");
  const senhaHashProf = await argon2.hash("prof123");

  await prisma.barbearia.upsert({
    where: { id: BARBEARIA_ID },
    update: { nome: "Barbearia Demo", slug: "barbearia-demo" },
    create: {
      id: BARBEARIA_ID,
      nome: "Barbearia Demo",
      slug: "barbearia-demo",
      endereco: "Rua das Tesouras, 100",
      telefone: "11999990000",
    },
  });

  for (const profissional of PROFISSIONAIS) {
    await prisma.profissional.upsert({
      where: { id: profissional.id },
      update: {
        nome: profissional.nome,
        apelido: profissional.apelido,
        cargo: profissional.cargo,
        comissaoPercent: profissional.comissaoPercent,
      },
      create: { barbeariaId: BARBEARIA_ID, ...profissional },
    });
  }

  await prisma.categoriaServico.upsert({
    where: { id: CATEGORIA_ID },
    update: { nome: "Geral" },
    create: { id: CATEGORIA_ID, barbeariaId: BARBEARIA_ID, nome: "Geral" },
  });

  for (const servico of SERVICOS) {
    await prisma.servico.upsert({
      where: { id: servico.id },
      update: {
        nome: servico.nome,
        duracaoMin: servico.duracaoMin,
        precoCentavos: servico.precoCentavos,
        categoriaId: CATEGORIA_ID,
      },
      create: { barbeariaId: BARBEARIA_ID, categoriaId: CATEGORIA_ID, ...servico },
    });
  }

  for (const horario of HORARIOS) {
    await prisma.horarioFuncionamento.upsert({
      where: { id: horario.id },
      update: { diaSemana: horario.diaSemana, abre: horario.abre, fecha: horario.fecha },
      create: { barbeariaId: BARBEARIA_ID, ...horario },
    });
  }

  await prisma.usuario.upsert({
    where: { id: ADMIN_ID },
    update: { email: "admin@barbearia-demo.com", papel: "dono" },
    create: {
      id: ADMIN_ID,
      barbeariaId: BARBEARIA_ID,
      email: "admin@barbearia-demo.com",
      senhaHash: senhaHashAdmin,
      papel: "dono",
    },
  });

  await prisma.usuario.upsert({
    where: { id: PROF_USER_ID },
    update: {
      email: "carlos@barbearia-demo.com",
      papel: "profissional",
      profissionalId: PROFISSIONAIS[0].id,
    },
    create: {
      id: PROF_USER_ID,
      barbeariaId: BARBEARIA_ID,
      email: "carlos@barbearia-demo.com",
      senhaHash: senhaHashProf,
      papel: "profissional",
      profissionalId: PROFISSIONAIS[0].id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
