import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export class EnvVars {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  PSP_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  PSP_WEBHOOK_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  REFRESH_EXPIRES_IN?: string;
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
