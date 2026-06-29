import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dentroDoHorario, NotificacoesService } from './notificacoes.service';
import {
  NOTIFICADOR_WHATSAPP,
  NotificadorWhatsapp,
} from './notificador-whatsapp';

const MAX_TENTATIVAS = 5;
const LOTE = 100;

function num(env: string | undefined, padrao: number): number {
  const n = Number(env);
  return Number.isFinite(n) ? n : padrao;
}

@Injectable()
export class NotificacoesWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger('NotificacoesWorker');
  private timer?: NodeJS.Timeout;
  private rodando = false;

  private readonly intervaloMs = num(process.env.NOTIF_INTERVALO_MS, 120_000);
  private readonly antecedenciaMs =
    num(process.env.LEMBRETE_ANTECEDENCIA_H, 24) * 3_600_000;
  private readonly silencioInicio = num(process.env.SILENCIO_INICIO_H, 8);
  private readonly silencioFim = num(process.env.SILENCIO_FIM_H, 21);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    @Inject(NOTIFICADOR_WHATSAPP)
    private readonly notificador: NotificadorWhatsapp,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NOTIF_WORKER === 'off') return;
    // unref(): não segura o processo aberto (importante p/ Jest e shutdown limpo).
    this.timer = setInterval(() => void this.tick(), this.intervaloMs);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.rodando) return; // evita sobreposição de execuções
    this.rodando = true;
    try {
      await this.gerarLembretes();
      await this.drenar();
    } catch (erro) {
      this.logger.error(`Falha no ciclo de notificações: ${String(erro)}`);
    } finally {
      this.rodando = false;
    }
  }

  // Enfileira lembrete dos agendamentos que entraram na janela de antecedência.
  private async gerarLembretes() {
    const agora = new Date();
    const limite = new Date(agora.getTime() + this.antecedenciaMs);
    const ags = await this.prisma.agendamento.findMany({
      where: {
        status: { not: 'cancelado' },
        inicio: { gt: agora, lte: limite },
        clienteId: { not: null },
        notificacoes: { none: { tipo: 'lembrete' } },
      },
      select: { id: true },
      take: LOTE,
    });
    for (const a of ags) {
      await this.notificacoes.notificarAgendamento(a.id, 'lembrete');
    }
  }

  // Drena o outbox com retry; lembrete respeita a janela de silêncio.
  private async drenar() {
    const pendentes = await this.prisma.notificacaoWhatsapp.findMany({
      where: { status: 'pendente', tentativas: { lt: MAX_TENTATIVAS } },
      include: { barbearia: { select: { fuso: true } } },
      orderBy: { criadoEm: 'asc' },
      take: LOTE,
    });
    const agora = new Date();

    for (const n of pendentes) {
      if (
        n.tipo === 'lembrete' &&
        !dentroDoHorario(
          agora,
          n.barbearia.fuso,
          this.silencioInicio,
          this.silencioFim,
        )
      ) {
        continue; // fora do horário: tenta de novo no próximo ciclo
      }
      try {
        await this.notificador.enviarMensagem(n.whatsapp, n.texto);
        await this.prisma.notificacaoWhatsapp.update({
          where: { id: n.id },
          data: { status: 'enviado', enviadoEm: new Date() },
        });
      } catch {
        const tentativas = n.tentativas + 1;
        await this.prisma.notificacaoWhatsapp.update({
          where: { id: n.id },
          data: {
            tentativas,
            status: tentativas >= MAX_TENTATIVAS ? 'falha' : 'pendente',
          },
        });
      }
    }
  }
}
