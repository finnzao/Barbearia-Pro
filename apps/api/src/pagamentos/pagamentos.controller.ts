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
import { CriarPagamentoDto } from './dto/criar-pagamento.dto';
import { ListarPagamentosDto } from './dto/listar-pagamentos.dto';
import { PagamentosService } from './pagamentos.service';

@Controller('pagamentos')
export class PagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Get()
  listar(@Query() filtros: ListarPagamentosDto) {
    return this.pagamentos.listar(filtros);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pagamentos.buscar(id);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Post()
  criar(@Body() dto: CriarPagamentoDto) {
    return this.pagamentos.criar(dto);
  }

  @Roles(PapelUsuario.dono, PapelUsuario.recepcao)
  @Patch(':id/pagar')
  pagar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pagamentos.pagar(id);
  }
}
