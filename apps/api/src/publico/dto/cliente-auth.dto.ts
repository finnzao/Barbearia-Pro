import {
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SENHA_FORTE, SENHA_FORTE_MSG } from '../../common/senha';
import {
  NormalizarTelefone,
  TELEFONE_BR,
  TELEFONE_MSG,
} from '../../common/telefone';

export class SolicitarOtpDto {
  @NormalizarTelefone()
  @Matches(TELEFONE_BR, { message: TELEFONE_MSG })
  whatsapp!: string;
}

export class LoginOtpDto {
  @NormalizarTelefone()
  @Matches(TELEFONE_BR, { message: TELEFONE_MSG })
  whatsapp!: string;

  @Matches(/^\d{6}$/, { message: 'codigo deve ter 6 dígitos' })
  codigo!: string;
}

export class LoginSenhaDto {
  @NormalizarTelefone()
  @Matches(TELEFONE_BR, { message: TELEFONE_MSG })
  whatsapp!: string;

  @IsString()
  @MinLength(1)
  senha!: string;
}

export class DefinirSenhaDto {
  @IsString()
  @MaxLength(128)
  @Matches(SENHA_FORTE, { message: SENHA_FORTE_MSG })
  senha!: string;
}

export class NotificacoesDto {
  // true = não quer receber lembretes (opt-out, LGPD)
  @IsBoolean()
  optOut!: boolean;
}
