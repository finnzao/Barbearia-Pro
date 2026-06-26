import { fecharBanco, resetDatabase } from '../../test/support/db';
import { criarBarbearia } from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { ServicosService } from './servicos.service';

describe('ServicosService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new ServicosService(prisma, ctx);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  it('cria e lista escopado por barbearia', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();

    await ctx.run(b1.id, async () => {
      await service.criar({
        nome: 'Corte',
        duracaoMin: 30,
        precoCentavos: 4000,
      });
    });

    const listaB1 = await ctx.run(b1.id, async () => {
      return service.listar();
    });
    expect(listaB1).toHaveLength(1);
    expect(listaB1[0].barbeariaId).toBe(b1.id);

    const listaB2 = await ctx.run(b2.id, async () => {
      return service.listar();
    });
    expect(listaB2).toHaveLength(0);
  });

  it('atualiza e remove o próprio registro', async () => {
    const b1 = await criarBarbearia();

    const criado = await ctx.run(b1.id, async () => {
      return service.criar({ nome: 'X', duracaoMin: 10, precoCentavos: 1000 });
    });

    await ctx.run(b1.id, async () => {
      await service.atualizar(criado.id, { precoCentavos: 2000 });
    });
    const atualizado = await ctx.run(b1.id, async () => {
      return service.buscar(criado.id);
    });
    expect(atualizado.precoCentavos).toBe(2000);

    await ctx.run(b1.id, async () => {
      await service.remover(criado.id);
    });
    const lista = await ctx.run(b1.id, async () => {
      return service.listar();
    });
    expect(lista).toHaveLength(0);
  });

  it('não acessa registro de outra barbearia', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();

    const criado = await ctx.run(b1.id, async () => {
      return service.criar({ nome: 'Z', duracaoMin: 20, precoCentavos: 3000 });
    });

    await expect(
      ctx.run(b2.id, async () => service.buscar(criado.id)),
    ).rejects.toThrow();
  });
});
