import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AgendarPublicoDto {
  @IsUUID()
  servicoId!: string;

  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve ser YYYY-MM-DD' })
  data!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'hora deve ser HH:MM' })
  hora!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'whatsapp deve conter apenas dígitos (8 a 15)',
  })
  whatsapp!: string;
}
