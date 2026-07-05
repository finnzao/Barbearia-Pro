import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ItemPlanoDto {
  @IsUUID()
  servicoId!: string;

  @IsInt()
  @Min(1)
  quantidadeMes!: number;
}

export class CriarPlanoDto {
  @IsString()
  @MinLength(1)
  nome!: string;

  @IsInt()
  @Min(0)
  precoCentavos!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPlanoDto)
  itens!: ItemPlanoDto[];

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
