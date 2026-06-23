import {
  MetodoPagamento,
  OrigemRepasse,
  StatusPagamento,
} from '@prisma/client';
import { fecharBanco, prismaTeste, resetDatabase } from '../../test/support/db';
import {
  criarBarbearia,
  criarProfissional,
} from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { FuncionarioService } from './funcionario.service';

const DATA = '2026-06-01';

describe('FuncionarioService duplo escopo (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new FuncionarioService(prisma);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  async function pagamentoPago(barbeariaId: string, profissionalId: string) {
    return prismaTeste().pagamento.create({
      data: {
        barbeariaId,
        profissionalId,
        valorCentavos: 4000,
        comissaoPercent: 0.5,
        metodo: MetodoPagamento.dinheiro,
        status: StatusPagamento.pago,
      },
    });
  }

  it('profissional A não enxerga agenda/comissão/repasse do profissional B', async () => {
    const barbearia = await criarBarbearia();
    const profA = await criarProfissional(barbearia.id);
    const profB = await criarProfissional(barbearia.id);

    await prismaTeste().agendamento.create({
      data: {
        barbeariaId: barbearia.id,
        profissionalId: profB.id,
        inicio: new Date(`${DATA}T12:00:00.000Z`),
        fim: new Date(`${DATA}T12:30:00.000Z`),
      },
    });
    await pagamentoPago(barbearia.id, profB.id);
    await prismaTeste().repasse.create({
      data: {
        barbeariaId: barbearia.id,
        profissionalId: profB.id,
        periodoInicio: new Date(`${DATA}T00:00:00.000Z`),
        periodoFim: new Date(`${DATA}T23:59:59.000Z`),
        valorCentavos: 1000,
        origem: OrigemRepasse.manual,
      },
    });

    const agendaA = await ctx.run(barbearia.id, () =>
      service.agenda(profA.id, DATA),
    );
    expect(agendaA).toHaveLength(0);

    const comissoesA = await ctx.run(barbearia.id, () =>
      service.comissoes(profA.id),
    );
    expect(comissoesA).toEqual({
      faturadoCentavos: 0,
      comissaoCentavos: 0,
      aReceberCentavos: 0,
    });

    const repassesA = await ctx.run(barbearia.id, () =>
      service.repasses(profA.id),
    );
    expect(repassesA.repasses).toHaveLength(0);
    expect(repassesA.pendenteCentavos).toBe(0);
  });

  it('profissional B enxerga apenas os próprios dados', async () => {
    const barbearia = await criarBarbearia();
    const profB = await criarProfissional(barbearia.id);

    await prismaTeste().agendamento.create({
      data: {
        barbeariaId: barbearia.id,
        profissionalId: profB.id,
        inicio: new Date(`${DATA}T12:00:00.000Z`),
        fim: new Date(`${DATA}T12:30:00.000Z`),
      },
    });
    await pagamentoPago(barbearia.id, profB.id);

    const agendaB = await ctx.run(barbearia.id, () =>
      service.agenda(profB.id, DATA),
    );
    expect(agendaB).toHaveLength(1);

    const comissoesB = await ctx.run(barbearia.id, () =>
      service.comissoes(profB.id),
    );
    expect(comissoesB).toEqual({
      faturadoCentavos: 4000,
      comissaoCentavos: 2000,
      aReceberCentavos: 2000,
    });
  });

  it('não vaza dados entre barbearias mesmo recebendo profissional de outra', async () => {
    const barbearia1 = await criarBarbearia();
    const barbearia2 = await criarBarbearia();
    const profOutra = await criarProfissional(barbearia2.id);

    await pagamentoPago(barbearia2.id, profOutra.id);

    const comissoes = await ctx.run(barbearia1.id, () =>
      service.comissoes(profOutra.id),
    );
    expect(comissoes.faturadoCentavos).toBe(0);
  });
});
