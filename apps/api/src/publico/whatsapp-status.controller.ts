import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service';

// Recebe o aviso do container de WhatsApp quando a sessão conecta ou cai,
// para o dono saber que precisa reescanear o QR. Por ora só registra (log JSON).
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
    if (!token || auth !== `Bearer ${token}`) {
      throw new UnauthorizedException();
    }

    const caiu = corpo.evento === 'desconectado';
    this.logger[caiu ? 'warn' : 'log'](
      JSON.stringify({ tipo: 'whatsapp_sessao', ...corpo }),
    );
  }
}
