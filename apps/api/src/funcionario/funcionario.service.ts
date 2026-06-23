import { Injectable } from '@nestjs/common';
import { StatusPagamento, StatusRepasse } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calcularComissaoCentavos } from './comissao.util';

@Injectable()
export class FuncionarioService {
  constructor(private readonly prisma: PrismaService) {}

  async agenda(profissionalId: string, data: string) {
    const inicio = new Date(`${data}T00:00:00.000Z`);
    const fim = new Date(inicio.getTime() + 86_400_000);

    return this.prisma.db.agendamento.findMany({
      where: { profissionalId, inicio: { gte: inicio, lt: fim } },
      orderBy: { inicio: 'asc' },
    });
  }

  async comissoes(profissionalId: string) {
    const pagamentos = await this.prisma.db.pagamento.findMany({
      where: { profissionalId, status: StatusPagamento.pago },
      select: { valorCentavos: true, comissaoPercent: true, repasseId: true },
    });

    let faturadoCentavos = 0;
    let comissaoCentavos = 0;
    let aReceberCentavos = 0;

    for (const pagamento of pagamentos) {
      const comissao = calcularComissaoCentavos(
        pagamento.valorCentavos,
        pagamento.comissaoPercent,
      );
      faturadoCentavos += pagamento.valorCentavos;
      comissaoCentavos += comissao;
      if (!pagamento.repasseId) {
        aReceberCentavos += comissao;
      }
    }

    return { faturadoCentavos, comissaoCentavos, aReceberCentavos };
  }

  async repasses(profissionalId: string) {
    const repasses = await this.prisma.db.repasse.findMany({
      where: { profissionalId },
      orderBy: { criadoEm: 'desc' },
    });

    const pendenteCentavos = repasses
      .filter((r) => r.status === StatusRepasse.pendente)
      .reduce((soma, r) => soma + r.valorCentavos, 0);
    const pagoCentavos = repasses
      .filter((r) => r.status === StatusRepasse.pago)
      .reduce((soma, r) => soma + r.valorCentavos, 0);

    return { repasses, pendenteCentavos, pagoCentavos };
  }
}
