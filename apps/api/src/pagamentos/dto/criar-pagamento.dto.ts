import { MetodoPagamento } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CriarPagamentoDto {
  @IsUUID()
  profissionalId!: string;

  @IsOptional()
  @IsUUID()
  agendamentoId?: string;

  @IsOptional()
  @IsUUID()
  servicoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  servicoNome?: string;

  @IsInt()
  @Min(0)
  valorCentavos!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  comissaoPercent?: number;

  @IsEnum(MetodoPagamento)
  metodo!: MetodoPagamento;
}
