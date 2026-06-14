import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";

// Monolito modular: cada domínio (agendamentos, pagamentos, etc.) entra como
// um módulo próprio aqui conforme for implementado.
@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
