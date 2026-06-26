import { MetodoPagamento, StatusPagamento } from '@prisma/client';
import { fecharBanco, prismaTeste, resetDatabase } from '../../test/support/db';
import {
  criarBarbearia,
  criarProfissional,
} from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { ComissoesService } from './comissoes.service';

describe('ComissoesService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new ComissoesService(prisma);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  it('agrega comissões dos pagamentos pagos por profissional', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id, { comissaoPercent: 0.5 });

    for (const valor of [4000, 6500]) {
      await prismaTeste().pagamento.create({
        data: {
          barbeariaId: b.id,
          profissionalId: prof.id,
          valorCentavos: valor,
          comissaoPercent: 0.5,
          metodo: MetodoPagamento.dinheiro,
          status: StatusPagamento.pago,
          pagoEm: new Date('2026-06-23T12:00:00.000Z'),
        },
      });
    }
    await prismaTeste().pagamento.create({
      data: {
        barbeariaId: b.id,
        profissionalId: prof.id,
        valorCentavos: 9999,
        comissaoPercent: 0.5,
        metodo: MetodoPagamento.pix_dinamico,
        status: StatusPagamento.pendente,
      },
    });

    const resumo = await ctx.run(b.id, async () => service.resumo({}));
    expect(resumo).toHaveLength(1);
    expect(resumo[0]).toMatchObject({
      atendimentos: 2,
      faturadoCentavos: 10500,
      comissaoCentavos: 5250,
      liquidoBarbeariaCentavos: 5250,
    });
  });
});
