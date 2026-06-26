import { Controller, Get, Query } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { ComissoesService } from './comissoes.service';
import { ListarComissoesDto } from './dto/listar-comissoes.dto';

@Roles(PapelUsuario.dono)
@Controller('comissoes')
export class ComissoesController {
  constructor(private readonly comissoes: ComissoesService) {}

  @Get()
  resumo(@Query() filtros: ListarComissoesDto) {
    return this.comissoes.resumo(filtros);
  }
}
