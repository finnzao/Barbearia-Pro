import { MetodoCobranca } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CriarAssinaturaClienteDto {
  @IsUUID()
  clienteId!: string;

  @IsUUID()
  planoId!: string;

  @IsOptional()
  @IsEnum(MetodoCobranca)
  metodoCobranca?: MetodoCobranca;
}
