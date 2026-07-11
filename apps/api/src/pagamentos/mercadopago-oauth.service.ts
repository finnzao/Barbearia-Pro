import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Barbearia } from '@prisma/client';
import { MercadoPagoConfig, OAuth } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cifrar, decifrar } from '../common/cifra';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';

const STATE_TTL_MS = 10 * 60_000;
// Renova o access token com 1 dia de folga antes de expirar (MP: ~180 dias).
const FOLGA_RENOVACAO_MS = 24 * 3_600_000;

@Injectable()
export class MercadoPagoOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tenant: TenantContext,
  ) {}

  private get oauth(): OAuth {
    return new OAuth(
      new MercadoPagoConfig({ accessToken: this.config.mpClientSecret! }),
    );
  }

  // O state assinado (HMAC) amarra o callback à barbearia e impede CSRF —
  // sem ele, qualquer um poderia conectar a própria conta MP na barbearia alheia.
  private assinarState(barbeariaId: string): string {
    const expira = Date.now() + STATE_TTL_MS;
    const payload = `${barbeariaId}.${expira}`;
    const hmac = createHmac('sha256', this.config.jwtSecret)
      .update(payload)
      .digest('base64url');
    return `${payload}.${hmac}`;
  }

  private validarState(state: string): string {
    const [barbeariaId, expira, hmac] = state.split('.');
    const esperado = createHmac('sha256', this.config.jwtSecret)
      .update(`${barbeariaId}.${expira}`)
      .digest('base64url');
    const a = Buffer.from(hmac ?? '');
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('State inválido.');
    }
    if (Number(expira) < Date.now()) {
      throw new UnauthorizedException(
        'State expirado. Tente conectar de novo.',
      );
    }
    return barbeariaId;
  }

  urlConexao(): string {
    const barbeariaId = this.tenant.requireTenantId();
    const clientId = this.config.mpClientId;
    const redirectUri = this.config.mpRedirectUri;
    if (!clientId || !redirectUri) {
      throw new BadRequestException(
        'Credenciais OAuth do Mercado Pago não configuradas no servidor.',
      );
    }
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      platform_id: 'mp',
      state: this.assinarState(barbeariaId),
      redirect_uri: redirectUri,
    });
    return `https://auth.mercadopago.com/authorization?${params}`;
  }

  async status(): Promise<{ conectado: boolean; mpUserId: string | null }> {
    const barbearia = await this.prisma.db.barbearia.findUniqueOrThrow({
      where: { id: this.tenant.requireTenantId() },
    });
    return {
      conectado: !!barbearia.mpAccessToken,
      mpUserId: barbearia.mpUserId,
    };
  }

  // Callback do OAuth: troca o code pelos tokens da barbearia e guarda cifrado.
  async conectar(code: string, state: string): Promise<void> {
    const barbeariaId = this.validarState(state);

    const resposta = await this.oauth.create({
      body: {
        client_id: this.config.mpClientId,
        client_secret: this.config.mpClientSecret,
        code,
        redirect_uri: this.config.mpRedirectUri,
      },
    });
    if (!resposta.access_token || !resposta.user_id) {
      throw new BadRequestException(
        'Mercado Pago não retornou as credenciais da conta.',
      );
    }
    await this.salvarTokens(barbeariaId, resposta);
  }

  // Devolve o access token da barbearia pronto pra uso, renovando se está pra vencer.
  // Retorna undefined se a barbearia nunca conectou (o gateway real rejeita; o mock ignora).
  async tokenDaBarbearia(barbearia: Barbearia): Promise<string | undefined> {
    if (!barbearia.mpAccessToken) {
      return undefined;
    }
    const chave = this.config.cifraSegredo;

    const vencendo =
      !barbearia.mpTokenExpiraEm ||
      barbearia.mpTokenExpiraEm.getTime() < Date.now() + FOLGA_RENOVACAO_MS;
    if (!vencendo) {
      return decifrar(barbearia.mpAccessToken, chave);
    }

    const resposta = await this.oauth.refresh({
      body: {
        client_id: this.config.mpClientId,
        client_secret: this.config.mpClientSecret,
        refresh_token: decifrar(barbearia.mpRefreshToken!, chave),
      },
    });
    if (!resposta.access_token) {
      throw new BadRequestException(
        'Não foi possível renovar a conexão com o Mercado Pago. Conecte de novo.',
      );
    }
    await this.salvarTokens(barbearia.id, resposta);
    return resposta.access_token;
  }

  private salvarTokens(
    barbeariaId: string,
    resposta: {
      access_token?: string;
      refresh_token?: string;
      user_id?: number;
      expires_in?: number;
    },
  ) {
    const chave = this.config.cifraSegredo;
    // Sem tenant context aqui (callback é rota pública): update direto pelo id.
    return this.prisma.barbearia.update({
      where: { id: barbeariaId },
      data: {
        mpUserId: resposta.user_id ? String(resposta.user_id) : undefined,
        mpAccessToken: cifrar(resposta.access_token!, chave),
        mpRefreshToken: resposta.refresh_token
          ? cifrar(resposta.refresh_token, chave)
          : undefined,
        mpTokenExpiraEm: resposta.expires_in
          ? new Date(Date.now() + resposta.expires_in * 1000)
          : null,
      },
    });
  }
}
