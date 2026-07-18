import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';
import { DefinirProfissionaisDto } from './dto/definir-profissionais.dto';
import { ServicosService } from './servicos.service';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicos: ServicosService) {}

  @Get()
  listar() {
    return this.servicos.listar();
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicos.buscar(id);
  }

  @Roles(PapelUsuario.dono)
  @Post()
  criar(@Body() dto: CriarServicoDto) {
    return this.servicos.criar(dto);
  }

  @Roles(PapelUsuario.dono)
  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarServicoDto,
  ) {
    return this.servicos.atualizar(id, dto);
  }

  @Roles(PapelUsuario.dono)
  @Put(':id/profissionais')
  definirProfissionais(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirProfissionaisDto,
  ) {
    return this.servicos.definirProfissionais(id, dto.profissionalIds);
  }

  @Roles(PapelUsuario.dono)
  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicos.remover(id);
  }
}
