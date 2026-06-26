import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClienteController } from './cliente.controller';
import { ClienteAuthService } from './cliente-auth.service';
import { ClienteJwtGuard } from './cliente-jwt.guard';
import {
  NOTIFICADOR_WHATSAPP,
  WhatsappLogNotificador,
} from './notificador-whatsapp';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicoController, ClienteController],
  providers: [
    PublicoService,
    ClienteAuthService,
    ClienteJwtGuard,
    { provide: NOTIFICADOR_WHATSAPP, useClass: WhatsappLogNotificador },
  ],
})
export class PublicoModule {}
