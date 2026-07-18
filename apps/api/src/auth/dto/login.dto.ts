import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // MaxLength barra payload gigante que só serviria pra queimar CPU no argon2.
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  senha!: string;
}
