import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ClienteController } from './cliente.controller';
import { ClienteAuthService } from './cliente-auth.service';
import { ClienteJwtGuard } from './cliente-jwt.guard';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';
import { WhatsappStatusController } from './whatsapp-status.controller';

@Module({
  imports: [AuthModule, NotificacoesModule],
  controllers: [PublicoController, ClienteController, WhatsappStatusController],
  providers: [PublicoService, ClienteAuthService, ClienteJwtGuard],
})
export class PublicoModule {}
