import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { AtualizarProfissionalDto } from './dto/atualizar-profissional.dto';
import { CriarProfissionalDto } from './dto/criar-profissional.dto';
import { ProfissionaisService } from './profissionais.service';

@Controller('profissionais')
export class ProfissionaisController {
  constructor(private readonly profissionais: ProfissionaisService) {}

  @Get()
  listar() {
    return this.profissionais.listar();
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.profissionais.buscar(id);
  }

  @Roles(PapelUsuario.dono)
  @Post()
  criar(@Body() dto: CriarProfissionalDto) {
    return this.profissionais.criar(dto);
  }

  @Roles(PapelUsuario.dono)
  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarProfissionalDto,
  ) {
    return this.profissionais.atualizar(id, dto);
  }

  @Roles(PapelUsuario.dono)
  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.profissionais.remover(id);
  }
}
