import { MetodoPagamento, StatusPagamento } from '@prisma/client';
import { fecharBanco, resetDatabase } from '../../test/support/db';
import {
  criarBarbearia,
  criarProfissional,
} from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { PagamentosService } from './pagamentos.service';

describe('PagamentosService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new PagamentosService(prisma, ctx);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  it('recebimento manual fica pago na hora e herda a comissão do profissional', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id, { comissaoPercent: 0.5 });

    const pago = await ctx.run(b.id, async () =>
      service.criar({
        profissionalId: prof.id,
        valorCentavos: 4000,
        metodo: MetodoPagamento.dinheiro,
      }),
    );

    expect(pago.status).toBe(StatusPagamento.pago);
    expect(pago.pagoEm).not.toBeNull();
    expect(pago.comissaoPercent.toNumber()).toBe(0.5);
  });

  it('pix nasce pendente e a baixa manual marca como pago', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id);

    const pendente = await ctx.run(b.id, async () =>
      service.criar({
        profissionalId: prof.id,
        valorCentavos: 5000,
        metodo: MetodoPagamento.pix_dinamico,
      }),
    );
    expect(pendente.status).toBe(StatusPagamento.pendente);

    const pago = await ctx.run(b.id, async () => service.pagar(pendente.id));
    expect(pago.status).toBe(StatusPagamento.pago);
  });

  it('isola pagamentos por barbearia', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    const prof = await criarProfissional(b1.id);

    await ctx.run(b1.id, async () =>
      service.criar({
        profissionalId: prof.id,
        valorCentavos: 1000,
        metodo: MetodoPagamento.dinheiro,
      }),
    );

    const listaB2 = await ctx.run(b2.id, async () => {
      return service.listar({});
    });
    expect(listaB2).toHaveLength(0);
  });
});
