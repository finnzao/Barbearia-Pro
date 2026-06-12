import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Libera o frontend Next (porta 3000) a chamar a API.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" });

  // Todas as rotas ficam sob /api → ex.: GET http://localhost:3333/api/agendamentos
  app.setGlobalPrefix("api");

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
