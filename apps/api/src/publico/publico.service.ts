import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusAgendamento } from '@prisma/client';
import { horaDeTime, horaLocalParaUtc } from '../common/timezone';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgendarPublicoDto } from './dto/agendar-publico.dto';
import { HorariosQueryDto } from './dto/horarios-query.dto';

const PASSO_MIN = 30;

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function paraHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function sobrepoe(aIni: Date, aFim: Date, bIni: Date, bFim: Date): boolean {
  return aIni < bFim && bIni < aFim;
}

function ehConflitoHorario(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : '';
  return msg.includes('exclusion constraint') || msg.includes('23P01');
}

@Injectable()
export class PublicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  async resolverBarbearia(slug: string) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { slug },
      include: { config: true },
    });
    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }
    return barbearia;
  }

  async resumo(slug: string) {
    const b = await this.resolverBarbearia(slug);
    return {
      id: b.id,
      nome: b.nome,
      slug: b.slug,
      fuso: b.fuso,
      clienteEscolheProfissional: b.config?.clienteEscolheProfissional ?? true,
      clienteEscolheServico: b.config?.clienteEscolheServico ?? true,
    };
  }

  async servicos(slug: string) {
    const b = await this.resolverBarbearia(slug);
    return this.prisma.servico.findMany({
      where: { barbeariaId: b.id, ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, duracaoMin: true, precoCentavos: true },
    });
  }

  async profissionais(slug: string) {
    const b = await this.resolverBarbearia(slug);
    return this.prisma.profissional.findMany({
      where: { barbeariaId: b.id, ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, apelido: true },
    });
  }

  async horariosDisponiveis(slug: string, query: HorariosQueryDto) {
    const b = await this.resolverBarbearia(slug);
    const servico = await this.prisma.servico.findFirst({
      where: { id: query.servicoId, barbeariaId: b.id, ativo: true },
    });
    if (!servico) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    const [ano, mes, dia] = query.data.split('-').map(Number);
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();

    const excecao = await this.prisma.horarioExcecao.findUnique({
      where: {
        barbeariaId_data: {
          barbeariaId: b.id,
          data: new Date(`${query.data}T00:00:00.000Z`),
        },
      },
    });

    let abre: string;
    let fecha: string;
    if (excecao) {
      if (excecao.fechado || !excecao.abre || !excecao.fecha) {
        return [];
      }
      abre = horaDeTime(excecao.abre);
      fecha = horaDeTime(excecao.fecha);
    } else {
      const hf = await this.prisma.horarioFuncionamento.findFirst({
        where: { barbeariaId: b.id, diaSemana },
      });
      if (!hf) {
        return [];
      }
      abre = horaDeTime(hf.abre);
      fecha = horaDeTime(hf.fecha);
    }

    const profissionais = query.profissionalId
      ? [{ id: query.profissionalId }]
      : await this.prisma.profissional.findMany({
          where: { barbeariaId: b.id, ativo: true },
          select: { id: true },
        });
    if (profissionais.length === 0) {
      return [];
    }
    const profIds = profissionais.map((p) => p.id);

    const inicioDia = horaLocalParaUtc(query.data, '00:00', b.fuso);
    const fimDia = new Date(inicioDia.getTime() + 86_400_000);
    const ocupados = await this.prisma.agendamento.findMany({
      where: {
        barbeariaId: b.id,
        profissionalId: { in: profIds },
        status: { not: StatusAgendamento.cancelado },
        inicio: { gte: inicioDia, lt: fimDia },
      },
      select: { profissionalId: true, inicio: true, fim: true },
    });

    const abreMin = paraMinutos(abre);
    const fechaMin = paraMinutos(fecha);
    const disponiveis: string[] = [];

    for (let m = abreMin; m + servico.duracaoMin <= fechaMin; m += PASSO_MIN) {
      const hora = paraHora(m);
      const inicio = horaLocalParaUtc(query.data, hora, b.fuso);
      const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
      const algumLivre = profIds.some(
        (pid) =>
          !ocupados.some(
            (o) =>
              o.profissionalId === pid &&
              sobrepoe(o.inicio, o.fim, inicio, fim),
          ),
      );
      if (algumLivre) {
        disponiveis.push(hora);
      }
    }

    return disponiveis.map((hora) => ({ hora }));
  }

  async agendar(slug: string, dto: AgendarPublicoDto) {
    const b = await this.resolverBarbearia(slug);
    const servico = await this.prisma.servico.findFirst({
      where: { id: dto.servicoId, barbeariaId: b.id, ativo: true },
    });
    if (!servico) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    const inicio = horaLocalParaUtc(dto.data, dto.hora, b.fuso);
    const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);

    let profissionalId = dto.profissionalId;
    if (!profissionalId) {
      const profissionais = await this.prisma.profissional.findMany({
        where: { barbeariaId: b.id, ativo: true },
        select: { id: true },
      });
      for (const p of profissionais) {
        const conflito = await this.prisma.agendamento.findFirst({
          where: {
            profissionalId: p.id,
            status: { not: StatusAgendamento.cancelado },
            inicio: { lt: fim },
            fim: { gt: inicio },
          },
        });
        if (!conflito) {
          profissionalId = p.id;
          break;
        }
      }
      if (!profissionalId) {
        throw new ConflictException(
          'Sem profissional disponível neste horário.',
        );
      }
    }

    const cliente = await this.prisma.cliente.upsert({
      where: {
        barbeariaId_whatsapp: { barbeariaId: b.id, whatsapp: dto.whatsapp },
      },
      update: { nome: dto.nome },
      create: { barbeariaId: b.id, nome: dto.nome, whatsapp: dto.whatsapp },
    });

    try {
      const agendamento = await this.prisma.agendamento.create({
        data: {
          barbeariaId: b.id,
          profissionalId,
          servicoId: servico.id,
          clienteId: cliente.id,
          clienteNome: dto.nome,
          precoCentavos: servico.precoCentavos,
          inicio,
          fim,
          status: StatusAgendamento.pendente,
          origem: 'cliente',
        },
      });
      await this.notificacoes.notificarAgendamento(
        agendamento.id,
        'confirmacao',
      );
      return {
        id: agendamento.id,
        inicio: agendamento.inicio,
        fim: agendamento.fim,
        status: agendamento.status,
        profissionalId,
      };
    } catch (erro) {
      if (ehConflitoHorario(erro)) {
        throw new ConflictException('Horário indisponível.');
      }
      throw erro;
    }
  }

  async perfil(clienteId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, nome: true, whatsapp: true, senhaHash: true },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return {
      id: cliente.id,
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      temSenha: !!cliente.senhaHash,
    };
  }

  meusAgendamentos(barbeariaId: string, clienteId: string) {
    return this.prisma.agendamento.findMany({
      where: { barbeariaId, clienteId },
      orderBy: { inicio: 'desc' },
      include: {
        servico: { select: { nome: true } },
        profissional: { select: { apelido: true } },
      },
    });
  }

  async cancelar(barbeariaId: string, clienteId: string, id: string) {
    const agendamento = await this.prisma.agendamento.findFirst({
      where: { id, barbeariaId, clienteId },
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    const atualizado = await this.prisma.agendamento.update({
      where: { id },
      data: { status: StatusAgendamento.cancelado },
    });
    await this.notificacoes.notificarAgendamento(id, 'cancelamento');
    return atualizado;
  }

  definirNotificacoes(clienteId: string, optOut: boolean) {
    return this.prisma.cliente.update({
      where: { id: clienteId },
      data: { optOutNotificacoes: optOut },
      select: { optOutNotificacoes: true },
    });
  }
}
