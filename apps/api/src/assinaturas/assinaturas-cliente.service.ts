import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cicloAtual } from '../common/ciclo';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { CriarAssinaturaClienteDto } from './dto/criar-assinatura-cliente.dto';
import { UsarPlanoDto } from './dto/usar-plano.dto';

function ehAssinaturaDuplicada(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : '';
  return (
    mensagem.includes('assinatura_cliente_ativa_unica') ||
    mensagem.includes('23505')
  );
}

@Injectable()
export class AssinaturasClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  private readonly include = {
    plano: { include: { itens: { include: { servico: true } } } },
  };

  listarPorCliente(clienteId: string) {
    return this.prisma.db.assinaturaCliente.findMany({
      where: { clienteId },
      include: this.include,
      orderBy: { assinadoEm: 'desc' },
    });
  }

  async buscar(id: string) {
    const assinatura = await this.prisma.db.assinaturaCliente.findUnique({
      where: { id },
      include: this.include,
    });
    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada.');
    }
    return assinatura;
  }

  async criar(dto: CriarAssinaturaClienteDto) {
    const [cliente, plano] = await Promise.all([
      this.prisma.db.cliente.findUnique({ where: { id: dto.clienteId } }),
      this.prisma.db.planoAssinatura.findUnique({ where: { id: dto.planoId } }),
    ]);
    if (!cliente) {
      throw new BadRequestException('Cliente não encontrado.');
    }
    if (!plano || !plano.ativo) {
      throw new BadRequestException('Plano não encontrado ou inativo.');
    }

    try {
      return await this.prisma.db.assinaturaCliente.create({
        data: {
          clienteId: dto.clienteId,
          planoId: dto.planoId,
          metodoCobranca: dto.metodoCobranca,
          barbeariaId: this.tenant.requireTenantId(),
        },
        include: this.include,
      });
    } catch (erro) {
      if (ehAssinaturaDuplicada(erro)) {
        throw new ConflictException('Cliente já tem uma assinatura ativa.');
      }
      throw erro;
    }
  }

  async cancelar(id: string) {
    await this.buscar(id);
    return this.prisma.db.assinaturaCliente.update({
      where: { id },
      data: { status: 'cancelada', canceladoEm: new Date() },
    });
  }

  async marcarCicloPago(id: string) {
    await this.buscar(id);
    return this.prisma.db.assinaturaCliente.update({
      where: { id },
      data: { ultimoCicloPagoEm: new Date() },
    });
  }

  // Uso do ciclo atual, derivado: conta agendamentos concluídos ligados a esta
  // assinatura, nunca armazenado (mesmo princípio de RN-17).
  async uso(id: string) {
    const assinatura = await this.buscar(id);
    const { inicio, fim } = cicloAtual(assinatura.assinadoEm, new Date());

    const usados = await this.prisma.db.agendamento.groupBy({
      by: ['servicoId'],
      where: {
        assinaturaClienteId: id,
        status: 'concluido',
        inicio: { gte: inicio, lt: fim },
      },
      _count: { _all: true },
    });
    const usadoPorServico = new Map(
      usados.map((u) => [u.servicoId, u._count._all]),
    );

    return {
      cicloInicio: inicio,
      cicloFim: fim,
      itens: assinatura.plano.itens.map((item) => {
        const usadoNoCiclo = usadoPorServico.get(item.servicoId) ?? 0;
        return {
          servicoId: item.servicoId,
          servicoNome: item.servico.nome,
          quantidadeMes: item.quantidadeMes,
          usadoNoCiclo,
          restante: item.quantidadeMes - usadoNoCiclo,
        };
      }),
    };
  }

  // Registra que o cliente usou um serviço do plano hoje (walk-in/balcão) —
  // mesmo espírito do recebimento manual: nasce direto concluído.
  async usar(id: string, dto: UsarPlanoDto) {
    const assinatura = await this.buscar(id);
    if (assinatura.status !== 'ativa') {
      throw new BadRequestException('Assinatura não está ativa.');
    }
    const item = assinatura.plano.itens.find(
      (i) => i.servicoId === dto.servicoId,
    );
    if (!item) {
      throw new BadRequestException('Serviço não faz parte deste plano.');
    }

    const agora = new Date();
    const fim = new Date(agora.getTime() + item.servico.duracaoMin * 60_000);

    return this.prisma.db.agendamento.create({
      data: {
        barbeariaId: this.tenant.requireTenantId(),
        clienteId: assinatura.clienteId,
        servicoId: dto.servicoId,
        assinaturaClienteId: id,
        precoCentavos: 0,
        inicio: agora,
        fim,
        status: 'concluido',
        origem: 'balcao',
      },
    });
  }
}
