import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { AtualizarPlanoDto } from './dto/atualizar-plano.dto';
import { CriarPlanoDto } from './dto/criar-plano.dto';
import { PlanosService } from './planos.service';

@Controller('planos')
export class PlanosController {
  constructor(private readonly planos: PlanosService) {}

  @Get()
  listar() {
    return this.planos.listar();
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.planos.buscar(id);
  }

  @Roles(PapelUsuario.dono)
  @Post()
  criar(@Body() dto: CriarPlanoDto) {
    return this.planos.criar(dto);
  }

  @Roles(PapelUsuario.dono)
  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarPlanoDto,
  ) {
    return this.planos.atualizar(id, dto);
  }
}
