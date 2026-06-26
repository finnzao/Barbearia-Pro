import { OrigemRepasse } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsUUID, Min } from 'class-validator';

export class CriarRepasseDto {
  @IsUUID()
  profissionalId!: string;

  @IsDateString()
  periodoInicio!: string;

  @IsDateString()
  periodoFim!: string;

  @IsInt()
  @Min(0)
  valorCentavos!: number;

  @IsEnum(OrigemRepasse)
  origem!: OrigemRepasse;
}
