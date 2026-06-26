import { Injectable } from '@nestjs/common';

export const NOTIFICADOR_WHATSAPP = Symbol('NOTIFICADOR_WHATSAPP');

export interface NotificadorWhatsapp {
  enviarCodigo(
    whatsapp: string,
    codigo: string,
    barbearia: string,
  ): Promise<void>;
}

@Injectable()
export class WhatsappLogNotificador implements NotificadorWhatsapp {
  async enviarCodigo(
    whatsapp: string,
    codigo: string,
    barbearia: string,
  ): Promise<void> {
    process.stdout.write(
      JSON.stringify({
        tipo: 'whatsapp_otp',
        timestamp: new Date().toISOString(),
        barbearia,
        whatsapp,
        codigo,
      }) + '\n',
    );
  }
}
