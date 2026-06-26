import { FrequenciaRepasse, ModoRepasse } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class AtualizarConfigDto {
  @IsOptional()
  @IsBoolean()
  clienteEscolheProfissional?: boolean;

  @IsOptional()
  @IsBoolean()
  clienteEscolheServico?: boolean;

  @IsOptional()
  @IsEnum(ModoRepasse)
  repasseModo?: ModoRepasse;

  @IsOptional()
  @IsEnum(FrequenciaRepasse)
  repasseFrequencia?: FrequenciaRepasse;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  repasseDia?: number;
}
