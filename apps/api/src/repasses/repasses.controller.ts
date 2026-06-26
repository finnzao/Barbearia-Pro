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
import { CriarRepasseDto } from './dto/criar-repasse.dto';
import { ListarRepassesDto } from './dto/listar-repasses.dto';
import { RepassesService } from './repasses.service';

@Roles(PapelUsuario.dono)
@Controller('repasses')
export class RepassesController {
  constructor(private readonly repasses: RepassesService) {}

  @Get()
  listar(@Query() filtros: ListarRepassesDto) {
    return this.repasses.listar(filtros);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.repasses.buscar(id);
  }

  @Post()
  criar(@Body() dto: CriarRepasseDto) {
    return this.repasses.criar(dto);
  }

  @Patch(':id/pagar')
  pagar(@Param('id', ParseUUIDPipe) id: string) {
    return this.repasses.pagar(id);
  }
}
