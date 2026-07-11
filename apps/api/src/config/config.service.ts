import { Injectable } from '@nestjs/common';
import { parseDuration } from '../common/duration';
import { EnvVars, validateEnv } from './env.validation';

@Injectable()
export class ConfigService {
  private readonly env: EnvVars;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }

  get jwtExpiresIn(): string {
    return this.env.JWT_EXPIRES_IN ?? '15m';
  }

  get refreshExpiresIn(): string {
    return this.env.REFRESH_EXPIRES_IN ?? '7d';
  }

  get refreshTtlMs(): number {
    return parseDuration(this.refreshExpiresIn);
  }

  get mercadoPagoWebhookSecret(): string {
    return this.env.MERCADOPAGO_WEBHOOK_SECRET;
  }

  get mpClientId(): string | undefined {
    return this.env.MERCADOPAGO_CLIENT_ID;
  }

  get mpClientSecret(): string | undefined {
    return this.env.MERCADOPAGO_CLIENT_SECRET;
  }

  get mpRedirectUri(): string | undefined {
    return this.env.MERCADOPAGO_REDIRECT_URI;
  }

  get cifraSegredo(): string {
    return this.env.CIFRA_SEGREDO;
  }

  get webOrigin(): string {
    return process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  }

  get producao(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  get clienteJwtExpiresIn(): string {
    return process.env.CLIENTE_JWT_EXPIRES_IN ?? '30d';
  }

  get otpTtlMs(): number {
    return parseDuration(process.env.OTP_EXPIRA_IN ?? '10m');
  }

  get whatsappApiUrl(): string | undefined {
    return this.env.WHATSAPP_API_URL;
  }

  get whatsappApiToken(): string | undefined {
    return this.env.WHATSAPP_API_TOKEN;
  }
}
