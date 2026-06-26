import { BadRequestException, ConflictException } from '@nestjs/common';
import { fecharBanco, resetDatabase } from '../../test/support/db';
import {
  criarBarbearia,
  criarProfissional,
} from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AgendamentosService } from './agendamentos.service';

describe('AgendamentosService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new AgendamentosService(prisma, ctx);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  it('impede sobreposição de horário do mesmo profissional', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id);

    await ctx.run(b.id, async () => {
      await service.criar({
        profissionalId: prof.id,
        inicio: '2026-06-23T13:00:00.000Z',
        fim: '2026-06-23T13:30:00.000Z',
      });
    });

    await expect(
      ctx.run(b.id, async () =>
        service.criar({
          profissionalId: prof.id,
          inicio: '2026-06-23T13:15:00.000Z',
          fim: '2026-06-23T13:45:00.000Z',
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('permite horários sequenciais e lista por dia', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id);

    await ctx.run(b.id, async () => {
      await service.criar({
        profissionalId: prof.id,
        inicio: '2026-06-23T13:00:00.000Z',
        fim: '2026-06-23T13:30:00.000Z',
      });
    });
    await ctx.run(b.id, async () => {
      await service.criar({
        profissionalId: prof.id,
        inicio: '2026-06-23T14:00:00.000Z',
        fim: '2026-06-23T14:30:00.000Z',
      });
    });

    const lista = await ctx.run(b.id, async () => {
      return service.listar({ data: '2026-06-23' });
    });
    expect(lista).toHaveLength(2);
  });

  it('rejeita fim anterior ou igual ao início', async () => {
    const b = await criarBarbearia();
    await expect(
      ctx.run(b.id, async () =>
        service.criar({
          inicio: '2026-06-23T14:00:00.000Z',
          fim: '2026-06-23T13:00:00.000Z',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('isola a listagem por barbearia', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();

    await ctx.run(b1.id, async () => {
      await service.criar({
        inicio: '2026-06-23T10:00:00.000Z',
        fim: '2026-06-23T10:30:00.000Z',
      });
    });

    const listaB2 = await ctx.run(b2.id, async () => {
      return service.listar({});
    });
    expect(listaB2).toHaveLength(0);
  });
});
