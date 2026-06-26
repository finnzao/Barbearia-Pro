import { Injectable } from '@nestjs/common';
import { Prisma, StatusPagamento } from '@prisma/client';
import { calcularComissaoCentavos } from '../funcionario/comissao.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListarComissoesDto } from './dto/listar-comissoes.dto';

interface ResumoComissao {
  profissionalId: string;
  profissional: string;
  atendimentos: number;
  faturadoCentavos: number;
  comissaoCentavos: number;
  liquidoBarbeariaCentavos: number;
}

@Injectable()
export class ComissoesService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo(filtros: ListarComissoesDto): Promise<ResumoComissao[]> {
    const where: Prisma.PagamentoWhereInput = { status: StatusPagamento.pago };
    if (filtros.profissionalId) {
      where.profissionalId = filtros.profissionalId;
    }
    if (filtros.de || filtros.ate) {
      where.pagoEm = {};
      if (filtros.de) {
        where.pagoEm.gte = new Date(`${filtros.de}T00:00:00.000Z`);
      }
      if (filtros.ate) {
        where.pagoEm.lte = new Date(`${filtros.ate}T23:59:59.999Z`);
      }
    }

    const pagamentos = await this.prisma.db.pagamento.findMany({
      where,
      include: { profissional: { select: { apelido: true } } },
    });

    const mapa = new Map<string, ResumoComissao>();
    for (const pagamento of pagamentos) {
      const comissao = calcularComissaoCentavos(
        pagamento.valorCentavos,
        pagamento.comissaoPercent,
      );
      const atual = mapa.get(pagamento.profissionalId) ?? {
        profissionalId: pagamento.profissionalId,
        profissional: pagamento.profissional.apelido,
        atendimentos: 0,
        faturadoCentavos: 0,
        comissaoCentavos: 0,
        liquidoBarbeariaCentavos: 0,
      };
      atual.atendimentos += 1;
      atual.faturadoCentavos += pagamento.valorCentavos;
      atual.comissaoCentavos += comissao;
      atual.liquidoBarbeariaCentavos =
        atual.faturadoCentavos - atual.comissaoCentavos;
      mapa.set(pagamento.profissionalId, atual);
    }

    return [...mapa.values()];
  }
}
