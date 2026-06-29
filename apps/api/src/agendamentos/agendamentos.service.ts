import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AtualizarAgendamentoDto } from './dto/atualizar-agendamento.dto';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { ListarAgendamentosDto } from './dto/listar-agendamentos.dto';

function ehConflitoHorario(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : '';
  return (
    mensagem.includes('exclusion constraint') || mensagem.includes('23P01')
  );
}

@Injectable()
export class AgendamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
    private readonly notificacoes: NotificacoesService,
  ) {}

  private readonly include = {
    profissional: { select: { apelido: true } },
    servico: { select: { nome: true } },
  };

  listar(filtros: ListarAgendamentosDto) {
    const where: Prisma.AgendamentoWhereInput = {};
    if (filtros.profissionalId) {
      where.profissionalId = filtros.profissionalId;
    }
    if (filtros.de || filtros.ate) {
      where.inicio = {};
      if (filtros.de) {
        where.inicio.gte = new Date(`${filtros.de}T00:00:00.000Z`);
      }
      if (filtros.ate) {
        where.inicio.lte = new Date(`${filtros.ate}T23:59:59.999Z`);
      }
    } else if (filtros.data) {
      const inicioDia = new Date(`${filtros.data}T00:00:00.000Z`);
      where.inicio = {
        gte: inicioDia,
        lt: new Date(inicioDia.getTime() + 86_400_000),
      };
    }
    return this.prisma.db.agendamento.findMany({
      where,
      include: this.include,
      orderBy: { inicio: 'asc' },
    });
  }

  async buscar(id: string) {
    const agendamento = await this.prisma.db.agendamento.findUnique({
      where: { id },
      include: this.include,
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    return agendamento;
  }

  async criar(dto: CriarAgendamentoDto) {
    this.validarPeriodo(dto.inicio, dto.fim);
    try {
      const criado = await this.prisma.db.agendamento.create({
        data: { ...dto, barbeariaId: this.tenant.requireTenantId() },
      });
      await this.notificacoes.notificarAgendamento(criado.id, 'confirmacao');
      return criado;
    } catch (erro) {
      throw this.mapearErro(erro);
    }
  }

  async atualizar(id: string, dto: AtualizarAgendamentoDto) {
    const atual = await this.buscar(id);
    const inicio = dto.inicio ?? atual.inicio.toISOString();
    const fim = dto.fim ?? atual.fim.toISOString();
    this.validarPeriodo(inicio, fim);
    try {
      const atualizado = await this.prisma.db.agendamento.update({
        where: { id },
        data: dto,
      });
      await this.avisarMudanca(id, atual, dto);
      return atualizado;
    } catch (erro) {
      throw this.mapearErro(erro);
    }
  }

  // Cancelou? avisa cancelamento. Mudou o início? avisa remarcação.
  private async avisarMudanca(
    id: string,
    atual: { status: string; inicio: Date },
    dto: AtualizarAgendamentoDto,
  ) {
    if (dto.status === 'cancelado' && atual.status !== 'cancelado') {
      await this.notificacoes.notificarAgendamento(id, 'cancelamento');
    } else if (
      dto.inicio &&
      new Date(dto.inicio).getTime() !== atual.inicio.getTime()
    ) {
      await this.notificacoes.notificarAgendamento(id, 'remarcacao');
    }
  }

  async remover(id: string) {
    await this.buscar(id);
    await this.prisma.db.agendamento.delete({ where: { id } });
    return { success: true };
  }

  private validarPeriodo(inicio: string, fim: string) {
    if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
      throw new BadRequestException('O fim deve ser posterior ao início.');
    }
  }

  private mapearErro(erro: unknown): Error {
    if (ehConflitoHorario(erro)) {
      return new ConflictException(
        'Horário indisponível para este profissional.',
      );
    }
    return erro instanceof Error ? erro : new Error('Erro desconhecido.');
  }
}
