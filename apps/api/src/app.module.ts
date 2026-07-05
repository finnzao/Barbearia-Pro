import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { AppController } from './app.controller';
import { AssinaturasModule } from './assinaturas/assinaturas.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { ComissoesModule } from './comissoes/comissoes.module';
import { LoggingMiddleware } from './common/logging.middleware';
import { ConfigModule } from './config/config.module';
import { ConfigBarbeariaModule } from './config-barbearia/config-barbearia.module';
import { FuncionarioModule } from './funcionario/funcionario.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicoModule } from './publico/publico.module';
import { ProfissionaisModule } from './profissionais/profissionais.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { RepassesModule } from './repasses/repasses.module';
import { ServicosModule } from './servicos/servicos.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    ConfigModule,
    TenantModule,
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    FuncionarioModule,
    ServicosModule,
    ProfissionaisModule,
    ClientesModule,
    AgendamentosModule,
    AssinaturasModule,
    PagamentosModule,
    ComissoesModule,
    RepassesModule,
    ConfigBarbeariaModule,
    RelatoriosModule,
    NotificacoesModule,
    PublicoModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('{*path}');
  }
}
