import { TipoChavePix } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CriarProfissionalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  apelido!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  cargo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  comissaoPercent?: number;

  @IsOptional()
  @IsString()
  chavePix?: string;

  @IsOptional()
  @IsEnum(TipoChavePix)
  pixTipoChave?: TipoChavePix;

  @IsOptional()
  @IsString()
  pixMarcador?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
