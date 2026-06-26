import {
  MetodoPagamento,
  StatusAgendamento,
  StatusPagamento,
} from '@prisma/client';
import { fecharBanco, prismaTeste, resetDatabase } from '../../test/support/db';
import {
  criarBarbearia,
  criarProfissional,
} from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { RelatoriosService } from './relatorios.service';

describe('RelatoriosService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new RelatoriosService(prisma);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  async function pago(
    barbeariaId: string,
    profissionalId: string,
    valorCentavos: number,
    metodo: MetodoPagamento,
    servicoNome: string,
  ) {
    await prismaTeste().pagamento.create({
      data: {
        barbeariaId,
        profissionalId,
        valorCentavos,
        comissaoPercent: 0.5,
        metodo,
        status: StatusPagamento.pago,
        pagoEm: new Date('2026-06-23T12:00:00.000Z'),
        servicoNome,
      },
    });
  }

  it('agrega financeiro, serviços e formas dos pagamentos pagos', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id);
    await pago(b.id, prof.id, 4000, MetodoPagamento.dinheiro, 'Corte');
    await pago(
      b.id,
      prof.id,
      6500,
      MetodoPagamento.pix_dinamico,
      'Corte e barba',
    );

    const fin = await ctx.run(b.id, async () =>
      service.financeiro({ de: '2026-06-01', ate: '2026-06-30' }),
    );
    expect(fin).toMatchObject({
      faturamentoCentavos: 10500,
      comissoesCentavos: 5250,
      liquidoCentavos: 5250,
      atendimentos: 2,
    });

    const servicos = await ctx.run(b.id, async () => service.servicos({}));
    expect(servicos).toHaveLength(2);
    expect(servicos[0].quantidade).toBe(1);

    const formas = await ctx.run(b.id, async () => service.formasPagamento({}));
    expect(formas.map((f) => f.metodo).sort()).toEqual([
      'dinheiro',
      'pix_dinamico',
    ]);
  });

  it('isola por barbearia', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    const prof = await criarProfissional(b1.id);
    await pago(b1.id, prof.id, 4000, MetodoPagamento.dinheiro, 'Corte');

    const fin = await ctx.run(b2.id, async () => service.financeiro({}));
    expect(fin.faturamentoCentavos).toBe(0);
  });

  it('clientes recorrentes e picos a partir dos agendamentos', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id);
    const cliente = await prismaTeste().cliente.create({
      data: { barbeariaId: b.id, nome: 'Zé', whatsapp: '11999999999' },
    });
    const ag = await prismaTeste().agendamento.create({
      data: {
        barbeariaId: b.id,
        profissionalId: prof.id,
        clienteId: cliente.id,
        status: StatusAgendamento.concluido,
        inicio: new Date('2026-06-22T13:00:00.000Z'),
        fim: new Date('2026-06-22T13:30:00.000Z'),
        precoCentavos: 4000,
      },
    });
    await prismaTeste().pagamento.create({
      data: {
        barbeariaId: b.id,
        profissionalId: prof.id,
        agendamentoId: ag.id,
        valorCentavos: 4000,
        comissaoPercent: 0.5,
        metodo: MetodoPagamento.dinheiro,
        status: StatusPagamento.pago,
        pagoEm: new Date('2026-06-22T13:30:00.000Z'),
      },
    });

    const clientes = await ctx.run(b.id, async () =>
      service.clientesRecorrentes(),
    );
    expect(clientes).toHaveLength(1);
    expect(clientes[0]).toMatchObject({
      cliente: 'Zé',
      visitas: 1,
      totalCentavos: 4000,
    });

    const picos = await ctx.run(b.id, async () => service.picos());
    expect(picos.dias).toHaveLength(7);
    expect(picos.dias.reduce((s, d) => s + d.cortes, 0)).toBe(1);
  });
});
