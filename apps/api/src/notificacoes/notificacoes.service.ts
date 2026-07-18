import { Injectable } from '@nestjs/common';
import { StatusAgendamento, TipoNotificacao } from '@prisma/client';
import { formatarLocal, horaLocal } from '../common/timezone';
import { PrismaService } from '../prisma/prisma.service';

interface DadosAgendamento {
  inicio: Date;
  status?: StatusAgendamento;
  servico?: { nome: string } | null;
  barbearia: { nome: string; fuso: string };
}

// Texto puro por tipo — testável sem banco.
export function montarTexto(
  tipo: TipoNotificacao,
  dados: DadosAgendamento,
): string {
  const quando = formatarLocal(dados.inicio, dados.barbearia.fuso);
  const servico = dados.servico?.nome ?? 'seu atendimento';
  const nome = dados.barbearia.nome;
  switch (tipo) {
    case 'confirmacao':
      // Agendamento pelo link do cliente nasce pendente: prometer "confirmado"
      // faria o cliente aparecer num horário que a barbearia ainda não aceitou.
      return dados.status === StatusAgendamento.pendente
        ? `${nome}: recebemos seu pedido para ${quando} (${servico}). Avisamos assim que a barbearia confirmar.`
        : `${nome}: agendamento confirmado para ${quando} (${servico}).`;
    case 'lembrete':
      return `${nome}: lembrete do seu agendamento em ${quando} (${servico}). Até já!`;
    case 'cancelamento':
      return `${nome}: seu agendamento de ${quando} (${servico}) foi cancelado.`;
    case 'remarcacao':
      return `${nome}: seu agendamento foi remarcado para ${quando} (${servico}).`;
  }
}

// Janela de silêncio: lembrete só sai entre [inicioH, fimH) no fuso da barbearia.
export function dentroDoHorario(
  instante: Date,
  fuso: string,
  inicioH: number,
  fimH: number,
): boolean {
  const h = horaLocal(instante, fuso);
  return h >= inicioH && h < fimH;
}

@Injectable()
export class NotificacoesService {
  // Cliente é raw (sem escopo de tenant): enfileira com barbeariaId explícito,
  // assim como o publico.service já faz com agendamentos.
  constructor(private readonly prisma: PrismaService) {}

  // Carrega o agendamento, monta o texto e enfileira no outbox.
  // Sem WhatsApp do cliente, ou opt-out (no caso de lembrete), não faz nada.
  async notificarAgendamento(
    agendamentoId: string,
    tipo: TipoNotificacao,
  ): Promise<void> {
    const ag = await this.prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        cliente: { select: { whatsapp: true, optOutNotificacoes: true } },
        servico: { select: { nome: true } },
        barbearia: { select: { nome: true, fuso: true } },
      },
    });
    if (!ag?.cliente?.whatsapp) return;
    if (tipo === 'lembrete' && ag.cliente.optOutNotificacoes) return;

    // Dedup do lembrete (o worker re-roda); os demais são disparados por evento.
    if (tipo === 'lembrete') {
      const existe = await this.prisma.notificacaoWhatsapp.findFirst({
        where: { agendamentoId, tipo: 'lembrete' },
        select: { id: true },
      });
      if (existe) return;
    }

    await this.prisma.notificacaoWhatsapp.create({
      data: {
        barbeariaId: ag.barbeariaId,
        agendamentoId,
        whatsapp: ag.cliente.whatsapp,
        tipo,
        texto: montarTexto(tipo, ag),
      },
    });
  }
}
