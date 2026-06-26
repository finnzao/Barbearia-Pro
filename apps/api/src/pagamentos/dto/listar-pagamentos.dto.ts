import { StatusPagamento } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListarPagamentosDto {
  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @IsOptional()
  @IsEnum(StatusPagamento)
  status?: StatusPagamento;
}
