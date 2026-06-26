import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { AgendamentosService } from './agendamentos.service';
import { AtualizarAgendamentoDto } from './dto/atualizar-agendamento.dto';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { ListarAgendamentosDto } from './dto/listar-agendamentos.dto';

@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Get()
  listar(@Query() filtros: ListarAgendamentosDto) {
    return this.agendamentos.listar(filtros);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.agendamentos.buscar(id);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Post()
  criar(@Body() dto: CriarAgendamentoDto) {
    return this.agendamentos.criar(dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarAgendamentoDto,
  ) {
    return this.agendamentos.atualizar(id, dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.agendamentos.remover(id);
  }
}
