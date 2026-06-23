import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefixo único para toda a API e CORS liberado para o app web.
  configurarApp(app);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });

  const porta = process.env.PORT ?? 3333;
  await app.listen(porta);
  console.log(`API NaRégua em http://localhost:${porta}/api`);
}

bootstrap();
