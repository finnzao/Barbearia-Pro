import { fecharBanco, resetDatabase } from '../../test/support/db';
import { criarBarbearia } from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { ClientesService } from './clientes.service';

describe('ClientesService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new ClientesService(prisma, ctx);

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
      await service.criar({ nome: 'Ana', whatsapp: '11988887777' });
    });

    const listaB1 = await ctx.run(b1.id, async () => service.listar());
    expect(listaB1).toHaveLength(1);
    expect(listaB1[0].barbeariaId).toBe(b1.id);

    const listaB2 = await ctx.run(b2.id, async () => service.listar());
    expect(listaB2).toHaveLength(0);
  });

  it('atualiza e remove o próprio registro', async () => {
    const b1 = await criarBarbearia();

    const criado = await ctx.run(b1.id, async () =>
      service.criar({ nome: 'Bruno', whatsapp: '11977776666' }),
    );

    await ctx.run(b1.id, async () =>
      service.atualizar(criado.id, { nome: 'Bruno Silva' }),
    );
    const atualizado = await ctx.run(b1.id, async () =>
      service.buscar(criado.id),
    );
    expect(atualizado.nome).toBe('Bruno Silva');

    await ctx.run(b1.id, async () => service.remover(criado.id));
    const lista = await ctx.run(b1.id, async () => service.listar());
    expect(lista).toHaveLength(0);
  });

  it('não acessa registro de outra barbearia', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();

    const criado = await ctx.run(b1.id, async () =>
      service.criar({ nome: 'Carla', whatsapp: '11966665555' }),
    );

    await expect(
      ctx.run(b2.id, async () => service.buscar(criado.id)),
    ).rejects.toThrow();
  });
});
