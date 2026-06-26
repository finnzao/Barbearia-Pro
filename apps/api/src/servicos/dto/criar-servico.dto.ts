import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CriarServicoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome!: string;

  @IsInt()
  @Min(1)
  duracaoMin!: number;

  @IsInt()
  @Min(0)
  precoCentavos!: number;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
