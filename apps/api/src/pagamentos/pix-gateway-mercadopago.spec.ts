import { PixGatewayMercadoPago } from './pix-gateway-mercadopago';

const orderCreateMock = jest.fn();
const orderGetMock = jest.fn();

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Order: jest.fn().mockImplementation(() => ({
    create: orderCreateMock,
    get: orderGetMock,
  })),
}));

describe('PixGatewayMercadoPago', () => {
  beforeEach(() => {
    orderCreateMock.mockReset();
    orderGetMock.mockReset();
  });

  it('cria a order com pagamento pix (bank_transfer) e o marcador como external_reference', async () => {
    orderCreateMock.mockResolvedValue({
      id: 'ORD-123456789',
      transactions: {
        payments: [
          {
            id: 'PAY-123456789',
            payment_method: { qr_code: '00020126COPIA-COLA-FAKE' },
          },
        ],
      },
    });

    const gateway = new PixGatewayMercadoPago();
    const resultado = await gateway.gerarCobranca({
      valorCentavos: 4550,
      marcadorProf: 'PROF-JOAO',
      accessToken: 'token-oauth-da-barbearia',
    });

    expect(orderCreateMock).toHaveBeenCalledTimes(1);
    const [{ body }] = orderCreateMock.mock.calls[0];
    expect(body.type).toBe('online');
    expect(body.external_reference).toBe('PROF-JOAO');
    expect(body.total_amount).toBe('45.50');
    expect(body.transactions.payments[0].amount).toBe('45.50');
    expect(body.transactions.payments[0].payment_method).toEqual({
      type: 'bank_transfer',
      id: 'pix',
    });
    // regressão: `date_of_expiration` em transactions.payments[0] é rejeitado pela API
    // real do Mercado Pago (schema não aceita esse campo aí); expiração é só na order.
    expect(body.transactions.payments[0].date_of_expiration).toBeUndefined();
    expect(body.expiration_time).toBe('PT30M');

    // txid é o id da ORDER (o que o webhook manda em data.id), não o do pagamento aninhado.
    expect(resultado.txid).toBe('ORD-123456789');
    expect(resultado.copiaCola).toBe('00020126COPIA-COLA-FAKE');
    expect(resultado.expiraEm).toBeInstanceOf(Date);
  });

  it('lança erro quando o Mercado Pago não devolve o qr_code', async () => {
    orderCreateMock.mockResolvedValue({
      id: 'ORD-1',
      transactions: { payments: [{ id: 'PAY-1', payment_method: {} }] },
    });

    const gateway = new PixGatewayMercadoPago();

    await expect(
      gateway.gerarCobranca({
        valorCentavos: 1000,
        marcadorProf: 'PROF-X',
        accessToken: 'token',
      }),
    ).rejects.toThrow('Mercado Pago não retornou os dados da cobrança Pix.');
  });

  it('conta de teste (sandbox): repete com e-mail @testuser.com e pagador APRO', async () => {
    orderCreateMock
      .mockRejectedValueOnce({
        errors: [
          {
            code: 'invalid_email_for_sandbox',
            message: 'Email format is invalid',
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'ORDTST-1',
        transactions: {
          payments: [
            { id: 'PAY-1', payment_method: { qr_code: 'COPIA-SANDBOX' } },
          ],
        },
      });

    const gateway = new PixGatewayMercadoPago();
    const resultado = await gateway.gerarCobranca({
      valorCentavos: 1000,
      marcadorProf: 'PROF-ANA',
      accessToken: 'token-de-teste',
    });

    expect(orderCreateMock).toHaveBeenCalledTimes(2);
    const [{ body: retry }] = orderCreateMock.mock.calls[1];
    expect(retry.payer).toEqual({
      email: 'prof-ana@testuser.com',
      first_name: 'APRO',
    });
    expect(resultado.txid).toBe('ORDTST-1');
  });

  it('mapeia recusa do Mercado Pago pra 400 com a mensagem real (não 500 genérico)', async () => {
    // O SDK lança o corpo cru da resposta, não um Error — ex. real: conta sem chave Pix.
    orderCreateMock.mockRejectedValue({
      errors: [
        {
          code: 'failed',
          message: 'The following transactions failed',
          details: ['PAY01: processing_error'],
        },
      ],
    });

    const gateway = new PixGatewayMercadoPago();

    await expect(
      gateway.gerarCobranca({
        valorCentavos: 1000,
        marcadorProf: 'PROF-X',
        accessToken: 'token',
      }),
    ).rejects.toThrow(
      'Mercado Pago recusou a cobrança: The following transactions failed — PAY01: processing_error',
    );
  });

  it('rejeita cobrança de barbearia sem conta Mercado Pago conectada', async () => {
    const gateway = new PixGatewayMercadoPago();

    await expect(
      gateway.gerarCobranca({ valorCentavos: 1000, marcadorProf: 'PROF-X' }),
    ).rejects.toThrow('Barbearia não conectou a conta Mercado Pago.');
    expect(orderCreateMock).not.toHaveBeenCalled();
  });

  it('foiPago consulta a order e considera pago só quando status é processed', async () => {
    const gateway = new PixGatewayMercadoPago();

    orderGetMock.mockResolvedValue({ status: 'processed' });
    await expect(gateway.foiPago('ORD-1', 'token')).resolves.toBe(true);

    orderGetMock.mockResolvedValue({ status: 'action_required' });
    await expect(gateway.foiPago('ORD-1', 'token')).resolves.toBe(false);
  });
});
