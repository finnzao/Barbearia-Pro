import { Controller, Get, Query } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { PeriodoDto } from './dto/periodo.dto';
import { RelatoriosService } from './relatorios.service';

@Roles(PapelUsuario.dono)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('financeiro')
  financeiro(@Query() periodo: PeriodoDto) {
    return this.relatorios.financeiro(periodo);
  }

  @Get('servicos')
  servicos(@Query() periodo: PeriodoDto) {
    return this.relatorios.servicos(periodo);
  }

  @Get('formas-pagamento')
  formasPagamento(@Query() periodo: PeriodoDto) {
    return this.relatorios.formasPagamento(periodo);
  }

  @Get('evolucao')
  evolucao() {
    return this.relatorios.evolucao();
  }

  @Get('picos')
  picos() {
    return this.relatorios.picos();
  }

  @Get('clientes-recorrentes')
  clientesRecorrentes() {
    return this.relatorios.clientesRecorrentes();
  }
}
