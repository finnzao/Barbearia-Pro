import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class HorarioDto {
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number;

  @Matches(HH_MM, { message: 'abre deve ser HH:MM' })
  abre!: string;

  @Matches(HH_MM, { message: 'fecha deve ser HH:MM' })
  fecha!: string;

  // Pausa diária (almoço). Os dois juntos ou nenhum — o service valida o par.
  @IsOptional()
  @Matches(HH_MM, { message: 'pausaInicio deve ser HH:MM' })
  pausaInicio?: string;

  @IsOptional()
  @Matches(HH_MM, { message: 'pausaFim deve ser HH:MM' })
  pausaFim?: string;
}

export class SubstituirHorariosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioDto)
  horarios!: HorarioDto[];
}
