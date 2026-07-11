import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export const PIX_GATEWAY = Symbol('PIX_GATEWAY');

const EXPIRACAO_MIN = 30;

export interface CobrancaPixInput {
  valorCentavos: number;
  marcadorProf: string;
  /** Access token da conta MP da barbearia (marketplace) — a cobrança cai direto nela. */
  accessToken?: string;
}

export interface CobrancaPixGerada {
  txid: string;
  copiaCola: string;
  expiraEm: Date;
  /** PNG base64 do QR, vindo do PSP. Transiente: devolvido na criação, não persiste. */
  qrCodeBase64?: string;
}

export interface PixGateway {
  gerarCobranca(input: CobrancaPixInput): Promise<CobrancaPixGerada>;
  /** Confirma no PSP se o txid já foi efetivamente pago (usado pelo webhook, RN-22). */
  foiPago(txid: string, accessToken?: string): Promise<boolean>;
}

// ponytail: gera txid/copia-cola sem bater em PSP nenhum. Troca por um gateway real
// (Mercado Pago) quando a Fase 5 escolher o PSP — a interface já fica pronta pra isso.
@Injectable()
export class PixGatewayMock implements PixGateway {
  async gerarCobranca({
    valorCentavos,
    marcadorProf,
  }: CobrancaPixInput): Promise<CobrancaPixGerada> {
    const txid = randomUUID().replace(/-/g, '');
    const copiaCola = `00020126MOCK-${marcadorProf}-${valorCentavos}-${txid}`;
    const expiraEm = new Date(Date.now() + EXPIRACAO_MIN * 60_000);
    return { txid, copiaCola, expiraEm };
  }

  // ponytail: sem PSP real por trás, considera tudo pago — não há nada de verdade a consultar.
  async foiPago(): Promise<boolean> {
    return true;
  }
}
