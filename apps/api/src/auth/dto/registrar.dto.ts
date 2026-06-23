import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nomeBarbearia!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  senha!: string;
}
