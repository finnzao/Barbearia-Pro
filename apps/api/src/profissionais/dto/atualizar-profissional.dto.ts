import { PartialType } from '@nestjs/mapped-types';
import { CriarProfissionalDto } from './criar-profissional.dto';

export class AtualizarProfissionalDto extends PartialType(
  CriarProfissionalDto,
) {}
