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
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  listar() {
    return this.clientes.listar();
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientes.buscar(id);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Post()
  criar(@Body() dto: CriarClienteDto) {
    return this.clientes.criar(dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarClienteDto,
  ) {
    return this.clientes.atualizar(id, dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientes.remover(id);
  }
}
