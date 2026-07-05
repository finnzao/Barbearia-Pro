import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { AssinaturasClienteService } from './assinaturas-cliente.service';
import { CriarAssinaturaClienteDto } from './dto/criar-assinatura-cliente.dto';
import { UsarPlanoDto } from './dto/usar-plano.dto';

@Controller('assinaturas-cliente')
export class AssinaturasClienteController {
  constructor(private readonly assinaturas: AssinaturasClienteService) {}

  @Get()
  listarPorCliente(@Query('clienteId', ParseUUIDPipe) clienteId: string) {
    return this.assinaturas.listarPorCliente(clienteId);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.assinaturas.buscar(id);
  }

  @Get(':id/uso')
  uso(@Param('id', ParseUUIDPipe) id: string) {
    return this.assinaturas.uso(id);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Post()
  criar(@Body() dto: CriarAssinaturaClienteDto) {
    return this.assinaturas.criar(dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.assinaturas.cancelar(id);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Patch(':id/pagar-ciclo')
  marcarCicloPago(@Param('id', ParseUUIDPipe) id: string) {
    return this.assinaturas.marcarCicloPago(id);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Post(':id/usar')
  usar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UsarPlanoDto) {
    return this.assinaturas.usar(id, dto);
  }
}
