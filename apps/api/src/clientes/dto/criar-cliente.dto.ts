import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CriarClienteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome!: string;

  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'whatsapp deve conter apenas dígitos (8 a 15)',
  })
  whatsapp!: string;
}
