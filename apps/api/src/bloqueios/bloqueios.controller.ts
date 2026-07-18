import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { BloqueiosService } from './bloqueios.service';
import { CriarBloqueioDto } from './dto/criar-bloqueio.dto';

@Controller('bloqueios')
export class BloqueiosController {
  constructor(private readonly bloqueios: BloqueiosService) {}

  @Get()
  listar() {
    return this.bloqueios.listar();
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Post()
  criar(@Body() dto: CriarBloqueioDto) {
    return this.bloqueios.criar(dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.bloqueios.remover(id);
  }
}
