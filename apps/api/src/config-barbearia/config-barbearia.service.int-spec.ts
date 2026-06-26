import { fecharBanco, resetDatabase } from '../../test/support/db';
import { criarBarbearia } from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { ConfigBarbeariaService } from './config-barbearia.service';

describe('ConfigBarbeariaService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const service = new ConfigBarbeariaService(prisma, ctx);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  it('cria config padrão ao obter e persiste atualização', async () => {
    const b = await criarBarbearia();

    const padrao = await ctx.run(b.id, async () => service.obter());
    expect(padrao.clienteEscolheProfissional).toBe(true);

    const atualizado = await ctx.run(b.id, async () =>
      service.atualizar({ repasseDia: 10, clienteEscolheServico: false }),
    );
    expect(atualizado.repasseDia).toBe(10);
    expect(atualizado.clienteEscolheServico).toBe(false);
  });

  it('substitui os horários de funcionamento', async () => {
    const b = await criarBarbearia();

    const horarios = await ctx.run(b.id, async () =>
      service.substituirHorarios({
        horarios: [
          { diaSemana: 1, abre: '09:00', fecha: '19:00' },
          { diaSemana: 2, abre: '09:00', fecha: '19:00' },
        ],
      }),
    );
    expect(horarios).toHaveLength(2);

    const so1 = await ctx.run(b.id, async () =>
      service.substituirHorarios({
        horarios: [{ diaSemana: 6, abre: '10:00', fecha: '14:00' }],
      }),
    );
    expect(so1).toHaveLength(1);
    expect(so1[0].diaSemana).toBe(6);
  });

  it('isola config entre barbearias', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();

    await ctx.run(b1.id, async () => service.atualizar({ repasseDia: 15 }));
    const configB2 = await ctx.run(b2.id, async () => service.obter());
    expect(configB2.repasseDia).toBe(5);
  });
});
