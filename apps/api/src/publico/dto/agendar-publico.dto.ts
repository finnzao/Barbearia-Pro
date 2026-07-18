import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  NormalizarTelefone,
  TELEFONE_BR,
  TELEFONE_MSG,
} from '../../common/telefone';

export class AgendarPublicoDto {
  // Opcional: com `clienteEscolheServico` desligado o cliente só reserva o
  // horário e a barbearia define o serviço no balcão. O service exige quando
  // a config manda escolher.
  @IsOptional()
  @IsUUID()
  servicoId?: string;

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

  @NormalizarTelefone()
  @Matches(TELEFONE_BR, { message: TELEFONE_MSG })
  whatsapp!: string;
}
