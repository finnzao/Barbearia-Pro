import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SENHA_FORTE, SENHA_FORTE_MSG } from '../../common/senha';

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
  @MaxLength(128)
  @Matches(SENHA_FORTE, { message: SENHA_FORTE_MSG })
  senha!: string;
}
