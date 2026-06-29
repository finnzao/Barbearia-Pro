import { Module } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesWorker } from './notificacoes.worker';
import {
  NOTIFICADOR_WHATSAPP,
  WhatsappLogNotificador,
} from './notificador-whatsapp';
import { WhatsappHttpNotificador } from './notificador-whatsapp-http';

const notificadorProvider = {
  provide: NOTIFICADOR_WHATSAPP,
  // Com o container configurado, envia de verdade; senão, só loga (dev/testes).
  useFactory: (config: ConfigService) => {
    const url = config.whatsappApiUrl;
    const token = config.whatsappApiToken;
    return url && token
      ? new WhatsappHttpNotificador(url, token)
      : new WhatsappLogNotificador();
  },
  inject: [ConfigService],
};

@Module({
  providers: [NotificacoesService, NotificacoesWorker, notificadorProvider],
  exports: [NotificacoesService, NOTIFICADOR_WHATSAPP],
})
export class NotificacoesModule {}
