import { MetodoPagamento, StatusPagamento } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { fecharBanco, resetDatabase } from '../../test/support/db';
import {
  criarBarbearia,
  criarProfissional,
} from '../../test/support/factories';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';
import { PagamentosService } from './pagamentos.service';
import { PixGatewayMock } from './pix-gateway';

// Mesmo algoritmo do WebhookSignatureValidator do SDK (manifest `id:..;request-id:..;ts:..;`).
function assinarWebhook(orderId: string, requestId: string, secret: string) {
  const ts = String(Date.now());
  const manifest = `id:${orderId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${hash}`;
}

describe('PagamentosService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const config = new ConfigService();
  const mpOAuth = new MercadoPagoOAuthService(prisma, config, ctx);
  const service = new PagamentosService(
    prisma,
    ctx,
    new PixGatewayMock(),
    config,
    mpOAuth,
  );

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
    const prof = await criarProfissional(b.id, { pixMarcador: 'PROF-1' });

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

  it('pix dinâmico gera txid/copia-cola e um split com o marcador do profissional', async () => {
    const b = await criarBarbearia({ pixChaveCentral: 'central@teste.com' });
    const prof = await criarProfissional(b.id, {
      comissaoPercent: 0.4,
      pixMarcador: 'PROF-JOAO',
      chavePix: 'joao@teste.com',
    });

    const pagamento = await ctx.run(b.id, async () =>
      service.criar({
        profissionalId: prof.id,
        valorCentavos: 10000,
        metodo: MetodoPagamento.pix_dinamico,
      }),
    );

    expect(pagamento.txid).toBeTruthy();
    expect(pagamento.copiaCola).toContain('PROF-JOAO');
    expect(pagamento.expiraEm).not.toBeNull();

    const split = await ctx.run(b.id, async () =>
      prisma.db.splitPagamento.findUnique({
        where: { pagamentoId: pagamento.id },
      }),
    );
    expect(split?.marcadorProf).toBe('PROF-JOAO');
    expect(split?.chaveCentral).toBe('central@teste.com');
    expect(split?.valorProfCentavos).toBe(4000);
    expect(split?.valorSalaoCentavos).toBe(6000);
  });

  it('pix estático nasce pago (registro de balcão), sem txid, mas gera o split com marcador', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id, { pixMarcador: 'PROF-BALCAO' });

    const pagamento = await ctx.run(b.id, async () =>
      service.criar({
        profissionalId: prof.id,
        valorCentavos: 3000,
        metodo: MetodoPagamento.pix_estatico,
      }),
    );

    // Pago na chave estática fora do sistema: o registro já entra confirmado.
    expect(pagamento.status).toBe(StatusPagamento.pago);
    expect(pagamento.pagoEm).not.toBeNull();
    expect(pagamento.txid).toBeNull();
    expect(pagamento.copiaCola).toBeNull();

    const split = await ctx.run(b.id, async () =>
      prisma.db.splitPagamento.findUnique({
        where: { pagamentoId: pagamento.id },
      }),
    );
    expect(split?.marcadorProf).toBe('PROF-BALCAO');
  });

  it('rejeita pix de profissional sem marcador cadastrado', async () => {
    const b = await criarBarbearia();
    const prof = await criarProfissional(b.id);

    await expect(
      ctx.run(b.id, async () =>
        service.criar({
          profissionalId: prof.id,
          valorCentavos: 2000,
          metodo: MetodoPagamento.pix_dinamico,
        }),
      ),
    ).rejects.toThrow('Profissional sem marcador de Pix cadastrado.');
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

  describe('webhook do Mercado Pago (RN-22)', () => {
    const secret = config.mercadoPagoWebhookSecret;

    it('assinatura válida marca o pagamento como pago (idempotente)', async () => {
      const b = await criarBarbearia();
      const prof = await criarProfissional(b.id, { pixMarcador: 'PROF-1' });

      const pendente = await ctx.run(b.id, async () =>
        service.criar({
          profissionalId: prof.id,
          valorCentavos: 5000,
          metodo: MetodoPagamento.pix_dinamico,
        }),
      );
      const orderId = pendente.txid!;
      const xRequestId = 'req-1';
      const xSignature = assinarWebhook(orderId, xRequestId, secret);

      await service.confirmarWebhookMercadoPago({
        xSignature,
        xRequestId,
        orderId,
      });

      const pago1 = await ctx.run(b.id, async () =>
        service.buscar(pendente.id),
      );
      expect(pago1.status).toBe(StatusPagamento.pago);

      // reenvio (mesma notificação de novo) não quebra nem duplica nada.
      await service.confirmarWebhookMercadoPago({
        xSignature,
        xRequestId,
        orderId,
      });
      const pago2 = await ctx.run(b.id, async () =>
        service.buscar(pendente.id),
      );
      expect(pago2.status).toBe(StatusPagamento.pago);
    });

    it('rejeita assinatura inválida e não altera o pagamento', async () => {
      const b = await criarBarbearia();
      const prof = await criarProfissional(b.id, { pixMarcador: 'PROF-1' });

      const pendente = await ctx.run(b.id, async () =>
        service.criar({
          profissionalId: prof.id,
          valorCentavos: 5000,
          metodo: MetodoPagamento.pix_dinamico,
        }),
      );

      await expect(
        service.confirmarWebhookMercadoPago({
          xSignature: 'ts=123,v1=assinaturaforjada',
          xRequestId: 'req-2',
          orderId: pendente.txid!,
        }),
      ).rejects.toThrow('Assinatura do webhook inválida.');

      const inalterado = await ctx.run(b.id, async () =>
        service.buscar(pendente.id),
      );
      expect(inalterado.status).toBe(StatusPagamento.pendente);
    });

    it('ignora silenciosamente txid que não é nosso', async () => {
      const xRequestId = 'req-3';
      const xSignature = assinarWebhook('ORD-DESCONHECIDO', xRequestId, secret);

      await expect(
        service.confirmarWebhookMercadoPago({
          xSignature,
          xRequestId,
          orderId: 'ORD-DESCONHECIDO',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
