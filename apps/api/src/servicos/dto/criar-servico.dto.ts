import {
  IsBoolean,
  IsDivisibleBy,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PASSO_MIN } from '../../common/agenda';

export class CriarServicoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome!: string;

  // Múltiplo do passo da grade: 20 ou 50 min deixariam a agenda desalinhada.
  @IsInt()
  @Min(PASSO_MIN)
  @IsDivisibleBy(PASSO_MIN)
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
