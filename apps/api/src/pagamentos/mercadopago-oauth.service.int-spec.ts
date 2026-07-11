import { fecharBanco, resetDatabase } from '../../test/support/db';
import { criarBarbearia } from '../../test/support/factories';
import { decifrar } from '../common/cifra';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { MercadoPagoOAuthService } from './mercadopago-oauth.service';

const oauthCreateMock = jest.fn();
const oauthRefreshMock = jest.fn();

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  OAuth: jest.fn().mockImplementation(() => ({
    create: oauthCreateMock,
    refresh: oauthRefreshMock,
  })),
}));

// ConfigService lê o env no construtor — setar antes de instanciar.
process.env.MERCADOPAGO_CLIENT_ID = 'client-id-teste';
process.env.MERCADOPAGO_CLIENT_SECRET = 'client-secret-teste';
process.env.MERCADOPAGO_REDIRECT_URI = 'http://localhost/callback';

describe('MercadoPagoOAuthService (integração)', () => {
  const ctx = new TenantContext();
  const prisma = new PrismaService(ctx);
  const config = new ConfigService();
  const service = new MercadoPagoOAuthService(prisma, config, ctx);

  beforeEach(async () => {
    await resetDatabase();
    oauthCreateMock.mockReset();
    oauthRefreshMock.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  function stateDe(barbeariaId: string): string {
    const url = ctx.run(barbeariaId, () => service.urlConexao());
    return new URL(url).searchParams.get('state')!;
  }

  it('conectar troca o code e salva os tokens cifrados (nunca plaintext)', async () => {
    const b = await criarBarbearia();
    oauthCreateMock.mockResolvedValue({
      access_token: 'APP_USR-token-da-barbearia',
      refresh_token: 'TG-refresh-da-barbearia',
      user_id: 987654321,
      expires_in: 15552000,
    });

    await service.conectar('code-do-mp', stateDe(b.id));

    const salvo = await prisma.barbearia.findUniqueOrThrow({
      where: { id: b.id },
    });
    expect(salvo.mpUserId).toBe('987654321');
    expect(salvo.mpAccessToken).not.toContain('APP_USR');
    expect(decifrar(salvo.mpAccessToken!, config.cifraSegredo)).toBe(
      'APP_USR-token-da-barbearia',
    );
    expect(decifrar(salvo.mpRefreshToken!, config.cifraSegredo)).toBe(
      'TG-refresh-da-barbearia',
    );
    expect(salvo.mpTokenExpiraEm!.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejeita state adulterado (CSRF) sem chamar o Mercado Pago', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    // pega um state válido de b1 e tenta usar apontando pra b2
    const forjado = stateDe(b1.id).replace(b1.id, b2.id);

    await expect(service.conectar('code', forjado)).rejects.toThrow(
      'State inválido.',
    );
    expect(oauthCreateMock).not.toHaveBeenCalled();
  });

  it('tokenDaBarbearia devolve o token decifrado e renova quando está pra vencer', async () => {
    const b = await criarBarbearia();
    oauthCreateMock.mockResolvedValue({
      access_token: 'token-original',
      refresh_token: 'refresh-original',
      user_id: 1,
      expires_in: 15552000, // 180 dias: longe de vencer
    });
    await service.conectar('code', stateDe(b.id));

    const atual = await prisma.barbearia.findUniqueOrThrow({
      where: { id: b.id },
    });
    await expect(service.tokenDaBarbearia(atual)).resolves.toBe(
      'token-original',
    );
    expect(oauthRefreshMock).not.toHaveBeenCalled();

    // força o vencimento e confere a renovação
    const vencida = await prisma.barbearia.update({
      where: { id: b.id },
      data: { mpTokenExpiraEm: new Date(Date.now() + 60_000) },
    });
    oauthRefreshMock.mockResolvedValue({
      access_token: 'token-renovado',
      refresh_token: 'refresh-renovado',
      expires_in: 15552000,
    });

    await expect(service.tokenDaBarbearia(vencida)).resolves.toBe(
      'token-renovado',
    );
    const depois = await prisma.barbearia.findUniqueOrThrow({
      where: { id: b.id },
    });
    expect(decifrar(depois.mpAccessToken!, config.cifraSegredo)).toBe(
      'token-renovado',
    );
  });

  it('barbearia sem conexão devolve undefined (gateway mock segue funcionando)', async () => {
    const b = await criarBarbearia();
    await expect(service.tokenDaBarbearia(b)).resolves.toBeUndefined();
  });
});
