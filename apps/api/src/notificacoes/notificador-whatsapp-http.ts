import { Injectable, Logger } from '@nestjs/common';
import { NotificadorWhatsapp } from './notificador-whatsapp';

// Fala com o container isolado de WhatsApp (Baileys) pela rede interna.
@Injectable()
export class WhatsappHttpNotificador implements NotificadorWhatsapp {
  private readonly logger = new Logger(WhatsappHttpNotificador.name);

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async enviarMensagem(whatsapp: string, texto: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/mensagens`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ para: whatsapp, texto }),
    });

    if (!resp.ok) {
      this.logger.error(
        `Falha ao enviar WhatsApp (${resp.status}) para ${whatsapp}`,
      );
      throw new Error('Não foi possível enviar a mensagem por WhatsApp.');
    }
  }

  async enviarCodigo(
    whatsapp: string,
    codigo: string,
    barbearia: string,
  ): Promise<void> {
    await this.enviarMensagem(
      whatsapp,
      `${barbearia}: seu código de acesso é ${codigo}. Expira em alguns minutos.`,
    );
  }
}
