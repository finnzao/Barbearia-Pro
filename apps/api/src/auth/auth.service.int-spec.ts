import { JwtService } from '@nestjs/jwt';
import { fecharBanco, prismaTeste, resetDatabase } from '../../test/support/db';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AuthService } from './auth.service';

describe('AuthService (integração)', () => {
  let prisma: PrismaService;
  let auth: AuthService;

  const cadastro = {
    nomeBarbearia: 'Demo',
    slug: 'demo',
    email: 'dono@demo.com',
    senha: 'Senha@123',
  };

  beforeAll(() => {
    const config = new ConfigService();
    prisma = new PrismaService(new TenantContext());
    const jwt = new JwtService({
      secret: config.jwtSecret,
      signOptions: { expiresIn: config.jwtExpiresIn as unknown as number },
    });
    auth = new AuthService(prisma, jwt, config);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fecharBanco();
  });

  it('registrar cria barbearia + config + usuario dono em transação', async () => {
    const resultado = await auth.registrar(cadastro);
    expect(resultado.accessToken).toEqual(expect.any(String));

    const barbearia = await prismaTeste().barbearia.findUnique({
      where: { slug: 'demo' },
      include: { config: true, usuarios: true },
    });
    expect(barbearia?.config).toBeTruthy();
    expect(barbearia?.usuarios).toHaveLength(1);
    expect(barbearia?.usuarios[0].papel).toBe('dono');
  });

  it('rejeita cadastro com slug duplicado', async () => {
    await auth.registrar(cadastro);
    await expect(auth.registrar(cadastro)).rejects.toThrow();
  });

  it('login aceita credencial válida e rejeita inválida', async () => {
    await auth.registrar(cadastro);

    await expect(
      auth.login({ email: 'dono@demo.com', senha: 'Senha@123' }),
    ).resolves.toHaveProperty('accessToken');

    await expect(
      auth.login({ email: 'dono@demo.com', senha: 'errada' }),
    ).rejects.toThrow();

    await expect(
      auth.login({ email: 'inexistente@y.com', senha: 'z' }),
    ).rejects.toThrow();
  });

  it('refresh rotaciona e refresh revogado não autentica', async () => {
    const { refreshToken } = await auth.registrar(cadastro);

    const renovado = await auth.refresh(refreshToken);
    expect(renovado.refreshToken).not.toBe(refreshToken);

    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });

  it('logout revoga o refresh token', async () => {
    const { refreshToken } = await auth.registrar(cadastro);
    await auth.logout(refreshToken);
    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });
});
