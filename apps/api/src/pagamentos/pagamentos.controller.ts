import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { ConfigService } from '../config/config.service';
import { CriarPagamentoDto } from './dto/criar-pagamento.dto';
import { ListarPagamentosDto } from './dto/listar-pagamentos.dto';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';
import { PagamentosService } from './pagamentos.service';

interface WebhookMercadoPagoBody {
  type?: string;
  data?: { id?: string };
}

@Controller('pagamentos')
export class PagamentosController {
  constructor(
    private readonly pagamentos: PagamentosService,
    private readonly mpOAuth: MercadoPagoOAuthService,
    private readonly config: ConfigService,
  ) {}

  // O dono pega a URL e é levado ao Mercado Pago pra autorizar a conexão da conta.
  @Roles(PapelUsuario.dono)
  @Get('mercadopago/conectar')
  conectarMercadoPago() {
    return { url: this.mpOAuth.urlConexao() };
  }

  @Roles(PapelUsuario.dono)
  @Get('mercadopago/status')
  statusMercadoPago() {
    return this.mpOAuth.status();
  }

  // Volta do OAuth: o Mercado Pago redireciona o navegador do dono pra cá.
  @Public()
  @Get('mercadopago/callback')
  async callbackMercadoPago(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: { redirect(url: string): void },
  ) {
    const painel = `${this.config.webOrigin}/painel/pagamentos`;
    try {
      if (!code || !state) throw new Error('code/state ausentes');
      await this.mpOAuth.conectar(code, state);
      return res.redirect(`${painel}?mp=conectado`);
    } catch {
      return res.redirect(`${painel}?mp=erro`);
    }
  }

  @Public()
  @HttpCode(200)
  @Post('webhook/mercadopago')
  webhookMercadoPago(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Query('data.id') dataId: string | undefined,
    @Body() body: WebhookMercadoPagoBody,
  ) {
    if (body?.type && body.type !== 'order') {
      return;
    }
    return this.pagamentos.confirmarWebhookMercadoPago({
      xSignature,
      xRequestId,
      orderId: dataId ?? body?.data?.id,
    });
  }

  @Get()
  listar(@Query() filtros: ListarPagamentosDto) {
    return this.pagamentos.listar(filtros);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pagamentos.buscar(id);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Post()
  criar(@Body() dto: CriarPagamentoDto) {
    return this.pagamentos.criar(dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Patch(':id/pagar')
  pagar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pagamentos.pagar(id);
  }
}
