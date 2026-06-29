import {
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const WHATSAPP = /^\+?[0-9]{8,15}$/;

export class SolicitarOtpDto {
  @Matches(WHATSAPP, {
    message: 'whatsapp deve conter apenas dígitos (8 a 15)',
  })
  whatsapp!: string;
}

export class LoginOtpDto {
  @Matches(WHATSAPP, {
    message: 'whatsapp deve conter apenas dígitos (8 a 15)',
  })
  whatsapp!: string;

  @Matches(/^\d{6}$/, { message: 'codigo deve ter 6 dígitos' })
  codigo!: string;
}

export class LoginSenhaDto {
  @Matches(WHATSAPP, {
    message: 'whatsapp deve conter apenas dígitos (8 a 15)',
  })
  whatsapp!: string;

  @IsString()
  @MinLength(1)
  senha!: string;
}

export class DefinirSenhaDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  senha!: string;
}

export class NotificacoesDto {
  // true = não quer receber lembretes (opt-out, LGPD)
  @IsBoolean()
  optOut!: boolean;
}
