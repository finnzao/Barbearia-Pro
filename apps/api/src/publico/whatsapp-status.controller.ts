import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/public.decorator';
import { ConfigService } from '../config/config.service';

// Recebe o aviso do container de WhatsApp quando a sessão conecta ou cai,
// para o dono saber que precisa reescanear o QR. Por ora só registra (log JSON).
// @Public: o container autentica pelo bearer WHATSAPP_API_TOKEN, não por JWT.
@Public()
@Controller('publico/whatsapp')
export class WhatsappStatusController {
  private readonly logger = new Logger('WhatsappStatus');

  constructor(private readonly config: ConfigService) {}

  @Post('status')
  @HttpCode(204)
  status(
    @Headers('authorization') auth: string | undefined,
    @Body() corpo: { evento?: string; estado?: string },
  ): void {
    const token = this.config.whatsappApiToken;
    if (!token || !bearerConfere(auth, token)) {
      throw new UnauthorizedException();
    }

    const caiu = corpo.evento === 'desconectado';
    this.logger[caiu ? 'warn' : 'log'](
      JSON.stringify({ tipo: 'whatsapp_sessao', ...corpo }),
    );
  }
}

// Comparação em tempo constante do bearer (evita timing attack sobre o token).
function bearerConfere(auth: string | undefined, token: string): boolean {
  const esperado = Buffer.from(`Bearer ${token}`);
  const recebido = Buffer.from(auth ?? '');
  return (
    esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
  );
}
