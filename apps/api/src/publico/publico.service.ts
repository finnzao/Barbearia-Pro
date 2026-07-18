import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusAgendamento } from '@prisma/client';
import { PASSO_MIN } from '../common/agenda';
import { horaDeTime, horaLocalParaUtc } from '../common/timezone';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgendarPublicoDto } from './dto/agendar-publico.dto';
import { HorariosQueryDto } from './dto/horarios-query.dto';

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

  // Resolve o serviço conforme a config: obrigatório quando o cliente escolhe,
  // ausente quando a barbearia define no balcão.
  private async resolverServico(
    barbearia: {
      id: string;
      config: { clienteEscolheServico: boolean } | null;
    },
    servicoId?: string,
  ) {
    if (!servicoId) {
      if (barbearia.config?.clienteEscolheServico !== false) {
        throw new BadRequestException('Escolha um serviço.');
      }
      return null;
    }
    const servico = await this.prisma.servico.findFirst({
      where: { id: servicoId, barbeariaId: barbearia.id, ativo: true },
    });
    if (!servico) {
      throw new NotFoundException('Serviço não encontrado.');
    }
    return servico;
  }

  // Profissionais que podem atender: do tenant, ativos e — se o serviço tiver
  // mapeamento em ProfissionalServico — só quem o executa. O profissionalId
  // chega do cliente (sem login), então validar aqui é o que impede agendar com
  // profissional inativo, de outra barbearia ou que não faz o serviço.
  private async profissionaisElegiveis(
    barbeariaId: string,
    servicoId?: string,
    profissionalId?: string,
  ) {
    // Serviço sem ninguém mapeado = todo mundo atende. Sem isso, uma barbearia
    // que nunca preencheu essa relação ficaria com a agenda zerada.
    const temMapa = servicoId
      ? (await this.prisma.profissionalServico.count({
          where: { servicoId },
        })) > 0
      : false;

    const profissionais = await this.prisma.profissional.findMany({
      where: {
        barbeariaId,
        ativo: true,
        ...(profissionalId ? { id: profissionalId } : {}),
        ...(temMapa ? { servicos: { some: { servicoId } } } : {}),
      },
      select: { id: true },
    });

    if (profissionalId && profissionais.length === 0) {
      throw new NotFoundException('Profissional não encontrado.');
    }
    return profissionais;
  }

  /**
   * Janela de atendimento do dia, em minutos locais. Exceção do dia (feriado,
   * horário especial) vence o horário semanal. null = fechado.
   *
   * Fonte única para a grade e para o agendar: sem isso, o POST direto na API
   * aceitaria 03:00 ou o meio do almoço, que a tela nunca ofereceu.
   */
  private async janelaDoDia(barbeariaId: string, data: string) {
    const [ano, mes, dia] = data.split('-').map(Number);
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();

    const excecao = await this.prisma.horarioExcecao.findUnique({
      where: {
        barbeariaId_data: {
          barbeariaId,
          data: new Date(`${data}T00:00:00.000Z`),
        },
      },
    });

    if (excecao) {
      if (excecao.fechado || !excecao.abre || !excecao.fecha) {
        return null;
      }
      // Dia excepcional tem janela própria e não herda a pausa da semana.
      return {
        abre: paraMinutos(horaDeTime(excecao.abre)),
        fecha: paraMinutos(horaDeTime(excecao.fecha)),
        pausaInicio: null as number | null,
        pausaFim: null as number | null,
      };
    }

    const hf = await this.prisma.horarioFuncionamento.findFirst({
      where: { barbeariaId, diaSemana },
    });
    if (!hf) {
      return null;
    }
    return {
      abre: paraMinutos(horaDeTime(hf.abre)),
      fecha: paraMinutos(horaDeTime(hf.fecha)),
      pausaInicio: hf.pausaInicio
        ? paraMinutos(horaDeTime(hf.pausaInicio))
        : null,
      pausaFim: hf.pausaFim ? paraMinutos(horaDeTime(hf.pausaFim)) : null,
    };
  }

  /** O atendimento [ini, fim) cabe no expediente e fora do almoço? */
  private cabeNaJanela(
    janela: {
      abre: number;
      fecha: number;
      pausaInicio: number | null;
      pausaFim: number | null;
    },
    inicioMin: number,
    duracaoMin: number,
  ): boolean {
    const fimMin = inicioMin + duracaoMin;
    if (inicioMin < janela.abre || fimMin > janela.fecha) {
      return false;
    }
    if (janela.pausaInicio !== null && janela.pausaFim !== null) {
      return !(inicioMin < janela.pausaFim && janela.pausaInicio < fimMin);
    }
    return true;
  }

  // Férias, folga e compromissos: profissionalId nulo bloqueia a barbearia toda.
  private bloqueiosNoPeriodo(barbeariaId: string, de: Date, ate: Date) {
    return this.prisma.bloqueio.findMany({
      where: { barbeariaId, inicio: { lt: ate }, fim: { gt: de } },
      select: { profissionalId: true, inicio: true, fim: true },
    });
  }

  private bloqueado(
    bloqueios: { profissionalId: string | null; inicio: Date; fim: Date }[],
    profissionalId: string,
    inicio: Date,
    fim: Date,
  ): boolean {
    return bloqueios.some(
      (bl) =>
        (bl.profissionalId === null || bl.profissionalId === profissionalId) &&
        sobrepoe(bl.inicio, bl.fim, inicio, fim),
    );
  }

  async servicos(slug: string) {
    const b = await this.resolverBarbearia(slug);
    return this.prisma.servico.findMany({
      where: { barbeariaId: b.id, ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, duracaoMin: true, precoCentavos: true },
    });
  }

  // servicoId opcional: com ele, lista só quem atende aquele serviço — evita
  // oferecer um profissional que depois não teria horário nenhum.
  async profissionais(slug: string, servicoId?: string) {
    const b = await this.resolverBarbearia(slug);
    const elegiveis = await this.profissionaisElegiveis(b.id, servicoId);
    return this.prisma.profissional.findMany({
      where: { id: { in: elegiveis.map((p) => p.id) } },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, apelido: true },
    });
  }

  async horariosDisponiveis(slug: string, query: HorariosQueryDto) {
    const b = await this.resolverBarbearia(slug);
    const servico = await this.resolverServico(b, query.servicoId);
    // Sem serviço escolhido não há duração: reserva uma janela da grade.
    const duracaoMin = servico?.duracaoMin ?? PASSO_MIN;

    const janela = await this.janelaDoDia(b.id, query.data);
    if (!janela) {
      return [];
    }

    const profissionais = await this.profissionaisElegiveis(
      b.id,
      servico?.id,
      query.profissionalId,
    );
    if (profissionais.length === 0) {
      return [];
    }
    const profIds = profissionais.map((p) => p.id);

    const inicioDia = horaLocalParaUtc(query.data, '00:00', b.fuso);
    const fimDia = new Date(inicioDia.getTime() + 86_400_000);
    const [ocupados, bloqueios] = await Promise.all([
      this.prisma.agendamento.findMany({
        where: {
          barbeariaId: b.id,
          profissionalId: { in: profIds },
          status: { not: StatusAgendamento.cancelado },
          inicio: { gte: inicioDia, lt: fimDia },
        },
        select: { profissionalId: true, inicio: true, fim: true },
      }),
      this.bloqueiosNoPeriodo(b.id, inicioDia, fimDia),
    ]);

    const disponiveis: string[] = [];
    const agora = new Date();

    for (let m = janela.abre; m + duracaoMin <= janela.fecha; m += PASSO_MIN) {
      if (!this.cabeNaJanela(janela, m, duracaoMin)) {
        continue; // cai no almoço (ou atravessa o fechamento)
      }
      const hora = paraHora(m);
      const inicio = horaLocalParaUtc(query.data, hora, b.fuso);
      if (inicio <= agora) {
        continue; // horário já passou: não é vaga livre
      }
      const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
      const algumLivre = profIds.some(
        (pid) =>
          !ocupados.some(
            (o) =>
              o.profissionalId === pid &&
              sobrepoe(o.inicio, o.fim, inicio, fim),
          ) && !this.bloqueado(bloqueios, pid, inicio, fim),
      );
      if (algumLivre) {
        disponiveis.push(hora);
      }
    }

    return disponiveis.map((hora) => ({ hora }));
  }

  async agendar(slug: string, dto: AgendarPublicoDto) {
    const b = await this.resolverBarbearia(slug);
    const servico = await this.resolverServico(b, dto.servicoId);

    const duracaoMin = servico?.duracaoMin ?? PASSO_MIN;
    const inicio = horaLocalParaUtc(dto.data, dto.hora, b.fuso);
    const fim = new Date(inicio.getTime() + duracaoMin * 60_000);

    // A tela só oferece o que é válido; estas checagens fecham o POST direto na
    // API, que aceitaria 03:00, o meio do almoço ou uma data já vencida.
    if (inicio <= new Date()) {
      throw new BadRequestException('Escolha um horário futuro.');
    }

    const janela = await this.janelaDoDia(b.id, dto.data);
    if (!janela) {
      throw new BadRequestException('A barbearia não atende nesta data.');
    }
    const inicioMin = paraMinutos(dto.hora);
    if (!this.cabeNaJanela(janela, inicioMin, duracaoMin)) {
      throw new BadRequestException('Fora do horário de atendimento.');
    }
    if ((inicioMin - janela.abre) % PASSO_MIN !== 0) {
      throw new BadRequestException('Escolha um horário da grade.');
    }

    const candidatos = await this.profissionaisElegiveis(
      b.id,
      servico?.id,
      dto.profissionalId,
    );
    const bloqueios = await this.bloqueiosNoPeriodo(b.id, inicio, fim);

    // Primeiro candidato sem conflito nem bloqueio. Quando o cliente escolheu o
    // profissional, a lista tem só ele — e o mesmo filtro vale.
    let profissionalId: string | undefined;
    for (const p of candidatos) {
      if (this.bloqueado(bloqueios, p.id, inicio, fim)) {
        continue;
      }
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
      throw new ConflictException('Sem profissional disponível neste horário.');
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
          // Sem serviço escolhido, ambos ficam nulos: a barbearia define (e
          // precifica) no balcão.
          servicoId: servico?.id ?? null,
          clienteId: cliente.id,
          clienteNome: dto.nome,
          precoCentavos: servico?.precoCentavos ?? null,
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
