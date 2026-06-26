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

  get pspApiKey(): string {
    return this.env.PSP_API_KEY;
  }

  get pspWebhookSecret(): string {
    return this.env.PSP_WEBHOOK_SECRET;
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
}
