import { Injectable } from '@nestjs/common';

export const NOTIFICADOR_WHATSAPP = Symbol('NOTIFICADOR_WHATSAPP');

export interface NotificadorWhatsapp {
  enviarMensagem(whatsapp: string, texto: string): Promise<void>;
  enviarCodigo(
    whatsapp: string,
    codigo: string,
    barbearia: string,
  ): Promise<void>;
}

@Injectable()
export class WhatsappLogNotificador implements NotificadorWhatsapp {
  async enviarMensagem(whatsapp: string, texto: string): Promise<void> {
    process.stdout.write(
      JSON.stringify({
        tipo: 'whatsapp_envio',
        timestamp: new Date().toISOString(),
        whatsapp,
        texto,
      }) + '\n',
    );
  }

  async enviarCodigo(
    whatsapp: string,
    codigo: string,
    barbearia: string,
  ): Promise<void> {
    await this.enviarMensagem(
      whatsapp,
      `${barbearia}: seu código de acesso é ${codigo}.`,
    );
  }
}
