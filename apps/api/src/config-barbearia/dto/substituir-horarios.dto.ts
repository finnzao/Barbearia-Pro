import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class HorarioDto {
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'abre deve ser HH:MM' })
  abre!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'fecha deve ser HH:MM' })
  fecha!: string;
}

export class SubstituirHorariosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioDto)
  horarios!: HorarioDto[];
}
