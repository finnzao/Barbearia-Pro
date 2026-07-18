import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

export function configurarApp(app: INestApplication): void {
  // Headers de segurança (HSTS, X-Content-Type-Options, frameguard, etc.).
  // API só serve JSON — CSP default do helmet não atrapalha e some risco de
  // clickjacking/MIME-sniffing. HSTS só tem efeito sob HTTPS (produção).
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
