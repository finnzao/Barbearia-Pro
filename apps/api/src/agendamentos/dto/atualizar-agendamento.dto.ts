import { PartialType } from '@nestjs/mapped-types';
import { CriarAgendamentoDto } from './criar-agendamento.dto';

export class AtualizarAgendamentoDto extends PartialType(CriarAgendamentoDto) {}
