import { fecharBanco, prismaTeste, resetDatabase } from '../../test/support/db';
import { criarBarbearia, criarServico } from '../../test/support/factories';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AssinaturasClienteService } from './assinaturas-cliente.service';
import { PlanosService } from './planos.service';

describe('Assinaturas (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const planos = new PlanosService(prisma, ctx);
  const assinaturas = new AssinaturasClienteService(prisma, ctx);

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  async function criarCliente(barbeariaId: string) {
    return prismaTeste().cliente.create({
      data: {
        barbeariaId,
        nome: 'Cliente Teste',
        whatsapp: `1199999${Date.now() % 10000}`,
      },
    });
  }

  it('cria plano com itens escopado por tenant', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    const servico = await criarServico(b1.id, {
      nome: 'Corte',
      precoCentavos: 4000,
    });

    const plano = await ctx.run(b1.id, async () =>
      planos.criar({
        nome: 'Plano Mensal',
        precoCentavos: 9900,
        itens: [{ servicoId: servico.id, quantidadeMes: 2 }],
      }),
    );
    expect(plano.itens).toHaveLength(1);
    expect(plano.itens[0].servico.nome).toBe('Corte');

    const listaB1 = await ctx.run(b1.id, async () => planos.listar());
    expect(listaB1).toHaveLength(1);

    const listaB2 = await ctx.run(b2.id, async () => planos.listar());
    expect(listaB2).toHaveLength(0);
  });

  it('rejeita item com serviço de outra barbearia', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    const servicoDeOutra = await criarServico(b2.id);

    await expect(
      ctx.run(b1.id, async () =>
        planos.criar({
          nome: 'Plano X',
          precoCentavos: 5000,
          itens: [{ servicoId: servicoDeOutra.id, quantidadeMes: 1 }],
        }),
      ),
    ).rejects.toThrow();
  });

  it('assina cliente e impede segunda assinatura ativa', async () => {
    const b1 = await criarBarbearia();
    const servico = await criarServico(b1.id);
    const cliente = await criarCliente(b1.id);

    const plano = await ctx.run(b1.id, async () =>
      planos.criar({
        nome: 'Plano',
        precoCentavos: 9900,
        itens: [{ servicoId: servico.id, quantidadeMes: 2 }],
      }),
    );

    const assinatura = await ctx.run(b1.id, async () =>
      assinaturas.criar({ clienteId: cliente.id, planoId: plano.id }),
    );
    expect(assinatura.status).toBe('ativa');

    await expect(
      ctx.run(b1.id, async () =>
        assinaturas.criar({ clienteId: cliente.id, planoId: plano.id }),
      ),
    ).rejects.toThrow();
  });

  it('deriva o uso do ciclo a partir de agendamentos concluídos', async () => {
    const b1 = await criarBarbearia();
    const servico = await criarServico(b1.id, { duracaoMin: 30 });
    const cliente = await criarCliente(b1.id);

    const plano = await ctx.run(b1.id, async () =>
      planos.criar({
        nome: 'Plano',
        precoCentavos: 9900,
        itens: [{ servicoId: servico.id, quantidadeMes: 2 }],
      }),
    );
    const assinatura = await ctx.run(b1.id, async () =>
      assinaturas.criar({ clienteId: cliente.id, planoId: plano.id }),
    );

    let uso = await ctx.run(b1.id, async () => assinaturas.uso(assinatura.id));
    expect(uso.itens[0].usadoNoCiclo).toBe(0);
    expect(uso.itens[0].restante).toBe(2);

    await ctx.run(b1.id, async () =>
      assinaturas.usar(assinatura.id, { servicoId: servico.id }),
    );
    uso = await ctx.run(b1.id, async () => assinaturas.uso(assinatura.id));
    expect(uso.itens[0].usadoNoCiclo).toBe(1);
    expect(uso.itens[0].restante).toBe(1);
  });

  it('cancelar assinatura libera nova assinatura pro mesmo cliente', async () => {
    const b1 = await criarBarbearia();
    const servico = await criarServico(b1.id);
    const cliente = await criarCliente(b1.id);

    const plano = await ctx.run(b1.id, async () =>
      planos.criar({
        nome: 'Plano',
        precoCentavos: 9900,
        itens: [{ servicoId: servico.id, quantidadeMes: 1 }],
      }),
    );
    const assinatura = await ctx.run(b1.id, async () =>
      assinaturas.criar({ clienteId: cliente.id, planoId: plano.id }),
    );
    await ctx.run(b1.id, async () => assinaturas.cancelar(assinatura.id));

    const nova = await ctx.run(b1.id, async () =>
      assinaturas.criar({ clienteId: cliente.id, planoId: plano.id }),
    );
    expect(nova.status).toBe('ativa');
  });
});
