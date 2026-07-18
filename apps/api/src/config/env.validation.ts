import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvVars {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  // Segredos de assinatura: mínimo de 32 chars pra ter entropia suficiente
  // (um segredo curto derruba toda a autenticação / validação de webhook).
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET deve ter ao menos 32 caracteres.' })
  JWT_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message: 'MERCADOPAGO_WEBHOOK_SECRET deve ter ao menos 32 caracteres.',
  })
  MERCADOPAGO_WEBHOOK_SECRET!: string;

  // Credenciais OAuth da aplicação (marketplace). Sem elas, Pix cai no gateway mock.
  @IsOptional()
  @IsString()
  MERCADOPAGO_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  MERCADOPAGO_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  MERCADOPAGO_REDIRECT_URI?: string;

  // Chave da cifra dos tokens OAuth no banco (AES-256-GCM): 64 chars hex = 32 bytes.
  @Matches(/^[0-9a-fA-F]{64}$/, {
    message: 'CIFRA_SEGREDO deve ter 64 caracteres hexadecimais (32 bytes).',
  })
  CIFRA_SEGREDO!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  REFRESH_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_API_URL?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_API_TOKEN?: string;
}

export function validateEnv(source: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, source, {
    enableImplicitConversion: true,
    excludeExtraneousValues: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const detalhes = errors
      .map((erro) => Object.values(erro.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${detalhes}`);
  }

  return validated;
}
