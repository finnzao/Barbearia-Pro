import { OrigemAgendamento, StatusAgendamento } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CriarAgendamentoDto {
  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @IsOptional()
  @IsUUID()
  servicoId?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clienteNome?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  precoCentavos?: number;

  @IsDateString()
  inicio!: string;

  @IsDateString()
  fim!: string;

  @IsOptional()
  @IsEnum(StatusAgendamento)
  status?: StatusAgendamento;

  @IsOptional()
  @IsEnum(OrigemAgendamento)
  origem?: OrigemAgendamento;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
