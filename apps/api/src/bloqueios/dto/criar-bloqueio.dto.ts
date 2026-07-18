import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CriarBloqueioDto {
  // Sem profissional, o bloqueio vale para a barbearia inteira (feriado, reforma).
  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @IsDateString()
  inicio!: string;

  @IsDateString()
  fim!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}
