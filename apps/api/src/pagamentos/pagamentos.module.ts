import { Module } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';
import { PagamentosController } from './pagamentos.controller';
import { PagamentosService } from './pagamentos.service';
import { PIX_GATEWAY, PixGatewayMock } from './pix-gateway';
import { PixGatewayMercadoPago } from './pix-gateway-mercadopago';

const pixGatewayProvider = {
  provide: PIX_GATEWAY,
  // Com as credenciais OAuth da aplicação configuradas, cobra de verdade no
  // Mercado Pago (com o token de cada barbearia); senão, mock (dev/testes).
  useFactory: (config: ConfigService) => {
    if (config.mpClientSecret) {
      return new PixGatewayMercadoPago();
    }
    // Em produção o mock (foiPago()→true) confirmaria pagamento sem PSP —
    // barra no boot em vez de aceitar dinheiro que não entrou.
    if (config.producao) {
      throw new Error(
        'MERCADOPAGO_CLIENT_SECRET ausente em produção: o gateway Pix real é obrigatório.',
      );
    }
    return new PixGatewayMock();
  },
  inject: [ConfigService],
};

@Module({
  controllers: [PagamentosController],
  providers: [PagamentosService, MercadoPagoOAuthService, pixGatewayProvider],
})
export class PagamentosModule {}
