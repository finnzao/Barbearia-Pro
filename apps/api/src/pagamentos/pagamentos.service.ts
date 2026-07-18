import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MetodoPagamento, StatusPagamento } from '@prisma/client';
import { WebhookSignatureValidator } from 'mercadopago';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { CriarPagamentoDto } from './dto/criar-pagamento.dto';
import { ListarPagamentosDto } from './dto/listar-pagamentos.dto';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';
import { PIX_GATEWAY, PixGateway } from './pix-gateway';

export interface WebhookMercadoPagoInput {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  orderId: string | undefined;
}

// Nascem `pago` no registro: o dinheiro já trocou de mãos fora do sistema.
// Inclui o Pix fixo de balcão (chave estática, sem cobrança/webhook por trás) —
// só o pix_dinamico nasce pendente e é confirmado pelo webhook (RN-16/22).
const METODOS_MANUAIS: MetodoPagamento[] = [
  MetodoPagamento.dinheiro,
  MetodoPagamento.cartao_debito,
  MetodoPagamento.cartao_credito,
  MetodoPagamento.pix_estatico,
];

const METODOS_PIX: MetodoPagamento[] = [
  MetodoPagamento.pix_dinamico,
  MetodoPagamento.pix_estatico,
];

@Injectable()
export class PagamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
    @Inject(PIX_GATEWAY)
    private readonly pixGateway: PixGateway,
    private readonly config: ConfigService,
    private readonly mpOAuth: MercadoPagoOAuthService,
  ) {}

  listar(filtros: ListarPagamentosDto) {
    return this.prisma.db.pagamento.findMany({
      where: {
        profissionalId: filtros.profissionalId,
        status: filtros.status,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscar(id: string) {
    const pagamento = await this.prisma.db.pagamento.findUnique({
      where: { id },
    });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    return pagamento;
  }

  async criar(dto: CriarPagamentoDto) {
    const barbeariaId = this.tenant.requireTenantId();

    const profissional = await this.prisma.db.profissional.findUnique({
      where: { id: dto.profissionalId },
    });
    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado.');
    }
    const comissaoPercent =
      dto.comissaoPercent ?? profissional.comissaoPercent.toNumber();

    const manual = METODOS_MANUAIS.includes(dto.metodo);
    const pix = METODOS_PIX.includes(dto.metodo);

    if (pix && !profissional.pixMarcador) {
      throw new BadRequestException(
        'Profissional sem marcador de Pix cadastrado.',
      );
    }

    const barbearia = pix
      ? await this.prisma.db.barbearia.findUniqueOrThrow({
          where: { id: barbeariaId },
        })
      : null;

    // Só o Pix dinâmico gera cobrança nova (txid/copia-cola); o estático usa a
    // chave central fixa da barbearia, mas os dois carregam o marcador (RN-23).
    // Marketplace: a cobrança usa o token OAuth da barbearia — o dinheiro cai
    // direto na conta MP dela, sem passar pela conta da plataforma (RN-21).
    const dadosPix =
      dto.metodo === MetodoPagamento.pix_dinamico
        ? await this.pixGateway.gerarCobranca({
            valorCentavos: dto.valorCentavos,
            marcadorProf: profissional.pixMarcador!,
            accessToken: await this.mpOAuth.tokenDaBarbearia(barbearia!),
          })
        : null;

    const pagamentoCriado = await this.prisma.db.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.create({
        data: {
          barbeariaId,
          profissionalId: dto.profissionalId,
          agendamentoId: dto.agendamentoId,
          servicoId: dto.servicoId,
          servicoNome: dto.servicoNome,
          valorCentavos: dto.valorCentavos,
          comissaoPercent,
          metodo: dto.metodo,
          status: manual ? StatusPagamento.pago : StatusPagamento.pendente,
          pagoEm: manual ? new Date() : null,
          txid: dadosPix?.txid,
          copiaCola: dadosPix?.copiaCola,
          expiraEm: dadosPix?.expiraEm,
        },
      });

      if (pix) {
        const valorProfCentavos = Math.round(
          dto.valorCentavos * comissaoPercent,
        );
        await tx.splitPagamento.create({
          data: {
            barbeariaId,
            pagamentoId: pagamento.id,
            profissionalId: dto.profissionalId,
            chaveCentral: barbearia!.pixChaveCentral ?? '',
            marcadorProf: profissional.pixMarcador!,
            chaveDestinoProf: profissional.chavePix,
            tipoChaveDestino: profissional.pixTipoChave,
            valorTotalCentavos: dto.valorCentavos,
            valorSalaoCentavos: dto.valorCentavos - valorProfCentavos,
            valorProfCentavos,
          },
        });
      }

      return pagamento;
    });

    // QR em base64 vem do PSP e só é útil na hora de cobrar — vai na resposta
    // da criação, sem persistir (o copia-cola persistido cobre reimpressão).
    return { ...pagamentoCriado, qrCodeBase64: dadosPix?.qrCodeBase64 };
  }

  async pagar(id: string) {
    const pagamento = await this.buscar(id);
    if (pagamento.status === StatusPagamento.pago) {
      return pagamento;
    }
    return this.prisma.db.pagamento.update({
      where: { id },
      data: { status: StatusPagamento.pago, pagoEm: new Date() },
    });
  }

  // RN-22: o webhook não sabe de qual barbearia é o pagamento (o marcador não é
  // único), então acha o pagamento pelo txid sem escopo de tenant e só depois
  // entra no contexto certo pra gravar. Idempotente: `pagar()` já é no-op se já pago.
  async confirmarWebhookMercadoPago(input: WebhookMercadoPagoInput) {
    if (!input.orderId) {
      return;
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
        dataId: input.orderId,
        secret: this.config.mercadoPagoWebhookSecret,
        // Rejeita notificações antigas reapresentadas (anti-replay); 5 min.
        toleranceSeconds: 300,
      });
    } catch {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    const pagamento = await this.prisma.pagamento.findFirst({
      where: { txid: input.orderId },
      include: { barbearia: true },
    });
    if (!pagamento) {
      return; // notificação de um pagamento que não é nosso (ruído); ignora.
    }

    // Consulta a order na conta MP da própria barbearia (token OAuth dela).
    const token = await this.mpOAuth.tokenDaBarbearia(pagamento.barbearia);
    const pago = await this.pixGateway.foiPago(input.orderId, token);
    if (!pago) {
      return; // ainda pendente/cancelado — tratar expiração/estorno fica pra depois.
    }

    await this.tenant.run(pagamento.barbeariaId, () =>
      this.pagar(pagamento.id),
    );
  }
}
