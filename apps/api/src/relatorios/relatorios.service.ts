import { Injectable } from '@nestjs/common';
import { Prisma, StatusAgendamento, StatusPagamento } from '@prisma/client';
import { calcularComissaoCentavos } from '../funcionario/comissao.util';
import { PrismaService } from '../prisma/prisma.service';
import { PeriodoDto } from './dto/periodo.dto';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const MESES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  private filtroPagos(periodo: PeriodoDto): Prisma.PagamentoWhereInput {
    const where: Prisma.PagamentoWhereInput = { status: StatusPagamento.pago };
    if (periodo.de || periodo.ate) {
      where.pagoEm = {};
      if (periodo.de) {
        where.pagoEm.gte = new Date(`${periodo.de}T00:00:00.000Z`);
      }
      if (periodo.ate) {
        where.pagoEm.lte = new Date(`${periodo.ate}T23:59:59.999Z`);
      }
    }
    return where;
  }

  async financeiro(periodo: PeriodoDto) {
    const pagamentos = await this.prisma.db.pagamento.findMany({
      where: this.filtroPagos(periodo),
      select: { valorCentavos: true, comissaoPercent: true },
    });

    let faturamentoCentavos = 0;
    let comissoesCentavos = 0;
    for (const pagamento of pagamentos) {
      faturamentoCentavos += pagamento.valorCentavos;
      comissoesCentavos += calcularComissaoCentavos(
        pagamento.valorCentavos,
        pagamento.comissaoPercent,
      );
    }

    const atendimentos = pagamentos.length;
    const ticketMedioCentavos =
      atendimentos > 0 ? Math.round(faturamentoCentavos / atendimentos) : 0;

    return {
      faturamentoCentavos,
      comissoesCentavos,
      liquidoCentavos: faturamentoCentavos - comissoesCentavos,
      atendimentos,
      ticketMedioCentavos,
    };
  }

  async servicos(periodo: PeriodoDto) {
    const pagamentos = await this.prisma.db.pagamento.findMany({
      where: this.filtroPagos(periodo),
      select: { servicoNome: true, valorCentavos: true },
    });

    const mapa = new Map<
      string,
      { servico: string; quantidade: number; receitaCentavos: number }
    >();
    for (const pagamento of pagamentos) {
      const servico = pagamento.servicoNome ?? 'Avulso';
      const atual = mapa.get(servico) ?? {
        servico,
        quantidade: 0,
        receitaCentavos: 0,
      };
      atual.quantidade += 1;
      atual.receitaCentavos += pagamento.valorCentavos;
      mapa.set(servico, atual);
    }

    return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade);
  }

  async formasPagamento(periodo: PeriodoDto) {
    const pagamentos = await this.prisma.db.pagamento.findMany({
      where: this.filtroPagos(periodo),
      select: { metodo: true, valorCentavos: true },
    });

    const mapa = new Map<
      string,
      { metodo: string; quantidade: number; totalCentavos: number }
    >();
    for (const pagamento of pagamentos) {
      const atual = mapa.get(pagamento.metodo) ?? {
        metodo: pagamento.metodo,
        quantidade: 0,
        totalCentavos: 0,
      };
      atual.quantidade += 1;
      atual.totalCentavos += pagamento.valorCentavos;
      mapa.set(pagamento.metodo, atual);
    }

    return [...mapa.values()].sort((a, b) => b.totalCentavos - a.totalCentavos);
  }

  async evolucao() {
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 5, 1);

    const pagamentos = await this.prisma.db.pagamento.findMany({
      where: { status: StatusPagamento.pago, pagoEm: { gte: inicio } },
      select: { valorCentavos: true, pagoEm: true },
    });

    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
      return {
        ano: d.getFullYear(),
        mes: d.getMonth(),
        faturamentoCentavos: 0,
      };
    });

    for (const pagamento of pagamentos) {
      if (!pagamento.pagoEm) continue;
      const bucket = buckets.find(
        (b) =>
          b.ano === pagamento.pagoEm!.getFullYear() &&
          b.mes === pagamento.pagoEm!.getMonth(),
      );
      if (bucket) {
        bucket.faturamentoCentavos += pagamento.valorCentavos;
      }
    }

    return buckets.map((b) => ({
      mes: MESES[b.mes],
      faturamentoCentavos: b.faturamentoCentavos,
    }));
  }

  async picos() {
    const agendamentos = await this.prisma.db.agendamento.findMany({
      where: { status: { not: StatusAgendamento.cancelado } },
      select: { inicio: true, precoCentavos: true },
    });

    const porDia = Array.from({ length: 7 }, () => ({
      cortes: 0,
      faturamentoCentavos: 0,
    }));
    const porHora = new Map<number, number>();

    for (const agendamento of agendamentos) {
      const dow = agendamento.inicio.getUTCDay();
      porDia[dow].cortes += 1;
      porDia[dow].faturamentoCentavos += agendamento.precoCentavos ?? 0;
      const hora = agendamento.inicio.getUTCHours();
      porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
    }

    const dias = ORDEM_DIAS.map((i) => ({
      dia: DIAS[i],
      cortes: porDia[i].cortes,
      faturamentoCentavos: porDia[i].faturamentoCentavos,
    }));

    const horas = [];
    for (let h = 9; h <= 20; h += 1) {
      horas.push({
        hora: `${String(h).padStart(2, '0')}h`,
        cortes: porHora.get(h) ?? 0,
      });
    }

    return { dias, horas };
  }

  async clientesRecorrentes() {
    const agendamentos = await this.prisma.db.agendamento.findMany({
      where: { status: StatusAgendamento.concluido, clienteId: { not: null } },
      select: {
        clienteId: true,
        cliente: { select: { nome: true } },
        pagamentos: {
          where: { status: StatusPagamento.pago },
          select: { valorCentavos: true },
        },
      },
    });

    const mapa = new Map<
      string,
      { cliente: string; visitas: number; totalCentavos: number }
    >();
    for (const agendamento of agendamentos) {
      if (!agendamento.clienteId) continue;
      const atual = mapa.get(agendamento.clienteId) ?? {
        cliente: agendamento.cliente?.nome ?? 'Cliente',
        visitas: 0,
        totalCentavos: 0,
      };
      atual.visitas += 1;
      atual.totalCentavos += agendamento.pagamentos.reduce(
        (soma, p) => soma + p.valorCentavos,
        0,
      );
      mapa.set(agendamento.clienteId, atual);
    }

    return [...mapa.values()].sort((a, b) => b.visitas - a.visitas).slice(0, 8);
  }
}
