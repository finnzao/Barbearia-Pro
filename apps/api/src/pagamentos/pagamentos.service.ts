import { Injectable, NotFoundException } from '@nestjs/common';
import { MetodoPagamento, StatusPagamento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { CriarPagamentoDto } from './dto/criar-pagamento.dto';
import { ListarPagamentosDto } from './dto/listar-pagamentos.dto';

const METODOS_MANUAIS: MetodoPagamento[] = [
  MetodoPagamento.dinheiro,
  MetodoPagamento.cartao_debito,
  MetodoPagamento.cartao_credito,
];

@Injectable()
export class PagamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  listar(filtros: ListarPagamentosDto) {
    return this.prisma.db.pagamento.findMany({
      where: {
        profissionalId: filtros.profissionalId,
        status: filtros.status,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscar(id: string) {
    const pagamento = await this.prisma.db.pagamento.findUnique({
      where: { id },
    });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    return pagamento;
  }

  async criar(dto: CriarPagamentoDto) {
    const barbeariaId = this.tenant.requireTenantId();

    let comissaoPercent = dto.comissaoPercent;
    if (comissaoPercent === undefined) {
      const profissional = await this.prisma.db.profissional.findUnique({
        where: { id: dto.profissionalId },
      });
      if (!profissional) {
        throw new NotFoundException('Profissional não encontrado.');
      }
      comissaoPercent = profissional.comissaoPercent.toNumber();
    }

    const manual = METODOS_MANUAIS.includes(dto.metodo);

    return this.prisma.db.pagamento.create({
      data: {
        barbeariaId,
        profissionalId: dto.profissionalId,
        agendamentoId: dto.agendamentoId,
        servicoId: dto.servicoId,
        servicoNome: dto.servicoNome,
        valorCentavos: dto.valorCentavos,
        comissaoPercent,
        metodo: dto.metodo,
        status: manual ? StatusPagamento.pago : StatusPagamento.pendente,
        pagoEm: manual ? new Date() : null,
      },
    });
  }

  async pagar(id: string) {
    const pagamento = await this.buscar(id);
    if (pagamento.status === StatusPagamento.pago) {
      return pagamento;
    }
    return this.prisma.db.pagamento.update({
      where: { id },
      data: { status: StatusPagamento.pago, pagoEm: new Date() },
    });
  }
}
