import { fecharBanco, prismaTeste, resetDatabase } from '../../test/support/db';
import { criarBarbearia, criarServico } from '../../test/support/factories';
import { TenantContext } from './tenant.context';
import { MissingTenantError, tenantExtension } from './tenant.extension';

describe('Isolamento de tenant (integração)', () => {
  const ctx = new TenantContext();
  const db = prismaTeste().$extends(tenantExtension(ctx));

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await fecharBanco();
  });

  it('bloqueia consulta sem tenant no contexto', async () => {
    await expect(db.servico.findMany()).rejects.toBeInstanceOf(
      MissingTenantError,
    );
  });

  it('bloqueia escrita sem tenant no contexto', async () => {
    const barbearia = await criarBarbearia();
    await expect(
      db.servico.create({
        data: {
          barbeariaId: barbearia.id,
          nome: 'x',
          duracaoMin: 1,
          precoCentavos: 1,
        },
      }),
    ).rejects.toBeInstanceOf(MissingTenantError);
  });

  it('escopa toda query por barbearia_id', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    await criarServico(b1.id);
    await criarServico(b1.id);
    await criarServico(b2.id);

    const doB1 = await ctx.run(b1.id, async () => {
      const resultado = await db.servico.findMany();
      return resultado;
    });
    expect(doB1).toHaveLength(2);
    expect(doB1.every((s) => s.barbeariaId === b1.id)).toBe(true);

    const totalB2 = await ctx.run(b2.id, async () => {
      const total = await db.servico.count();
      return total;
    });
    expect(totalB2).toBe(1);
  });

  it('não vaza registro de outra barbearia em findUnique', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    const servico = await criarServico(b1.id);

    const proprio = await ctx.run(b1.id, async () => {
      const achado = await db.servico.findUnique({ where: { id: servico.id } });
      return achado;
    });
    expect(proprio?.id).toBe(servico.id);

    const alheio = await ctx.run(b2.id, async () => {
      const achado = await db.servico.findUnique({ where: { id: servico.id } });
      return achado;
    });
    expect(alheio).toBeNull();
  });
});
