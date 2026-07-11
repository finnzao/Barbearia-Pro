import { BadRequestException, Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Order } from 'mercadopago';
import { CobrancaPixGerada, CobrancaPixInput, PixGateway } from './pix-gateway';

const EXPIRACAO_MIN = 30;

// Marketplace: cada cobrança usa o access token OAuth da barbearia (a order — e o
// dinheiro — nascem na conta MP dela, nunca na conta da plataforma).
// A aplicação está cadastrada no Mercado Pago para a API Orders (POST /v1/orders),
// não a API de Pagamentos legada (POST /v1/payments) — essa última responde
// "Unauthorized use of live credentials" pra essa aplicação, mesmo com credencial de teste.
@Injectable()
export class PixGatewayMercadoPago implements PixGateway {
  private cliente(accessToken?: string): Order {
    if (!accessToken) {
      throw new BadRequestException(
        'Barbearia não conectou a conta Mercado Pago.',
      );
    }
    return new Order(new MercadoPagoConfig({ accessToken }));
  }

  async gerarCobranca({
    valorCentavos,
    marcadorProf,
    accessToken,
  }: CobrancaPixInput): Promise<CobrancaPixGerada> {
    const expiraEm = new Date(Date.now() + EXPIRACAO_MIN * 60_000);
    const valor = (valorCentavos / 100).toFixed(2);
    const cliente = this.cliente(accessToken);

    const criar = (payer: { email: string; first_name?: string }) =>
      cliente.create({
        body: {
          type: 'online',
          external_reference: marcadorProf,
          total_amount: valor,
          // ISO 8601 duration (não date-time): o campo por-pagamento `date_of_expiration`
          // é rejeitado pelo schema real da API ("additionalProperties not allowed"),
          // mesmo o SDK tipando-o como válido — a expiração só existe no nível da order.
          expiration_time: `PT${EXPIRACAO_MIN}M`,
          payer,
          transactions: {
            payments: [
              {
                amount: valor,
                payment_method: { type: 'bank_transfer', id: 'pix' },
              },
            ],
          },
        },
      });

    let resultado;
    try {
      // ponytail: e-mail sintético — o cliente é identificado por WhatsApp (RN-28),
      // não coletamos e-mail dele; revisar se o MP passar a exigir dado real do pagador.
      resultado = await criar({ email: `${marcadorProf}@pagador.naregua.app` });
    } catch (erro) {
      if (this.codigo(erro) !== 'invalid_email_for_sandbox') {
        throw this.recusa(erro);
      }
      // Conta de TESTE conectada (sandbox): o e-mail do pagador precisa terminar
      // em @testuser.com, e `first_name: APRO` faz o pagamento auto-aprovar em
      // segundos — é assim que se testa o ciclo completo sem dinheiro real.
      try {
        resultado = await criar({
          email: `${marcadorProf.toLowerCase()}@testuser.com`,
          first_name: 'APRO',
        });
      } catch (erroSandbox) {
        throw this.recusa(erroSandbox);
      }
    }

    const metodoPagamento =
      resultado.transactions?.payments?.[0]?.payment_method;
    if (!resultado.id || !metodoPagamento?.qr_code) {
      throw new Error('Mercado Pago não retornou os dados da cobrança Pix.');
    }

    return {
      // ponytail: txid aqui é o id da ORDER (não do pagamento dentro dela) — é esse
      // id que o webhook de notificação manda de volta em `data.id` (RN-22).
      txid: resultado.id,
      copiaCola: metodoPagamento.qr_code,
      expiraEm,
      qrCodeBase64: metodoPagamento.qr_code_base64,
    };
  }

  async foiPago(orderId: string, accessToken?: string): Promise<boolean> {
    const resultado = await this.cliente(accessToken).get({ id: orderId });
    return resultado.status === 'processed';
  }

  // O SDK lança o corpo cru da resposta (não um Error): { errors: [{code, message, details}] }.

  private codigo(erro: unknown): string | undefined {
    return (erro as { errors?: { code?: string }[] })?.errors?.[0]?.code;
  }

  // Recusa do MP vira 400 com a mensagem real (ex.: conta conectada sem chave
  // Pix cadastrada → "processing_error"), em vez de um 500 genérico.
  private recusa(erro: unknown): BadRequestException {
    const erros = (
      erro as { errors?: { message?: string; details?: string[] }[] }
    )?.errors;
    const detalhe = erros
      ?.map((e) =>
        [e.message, ...(e.details ?? [])].filter(Boolean).join(' — '),
      )
      .join('; ');
    return new BadRequestException(
      `Mercado Pago recusou a cobrança${detalhe ? `: ${detalhe}` : '.'}`,
    );
  }
}
