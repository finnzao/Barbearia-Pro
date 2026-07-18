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

  // V-09: e-mail é globalmente único — mesmo e-mail em outra barbearia é barrado,
  // então o login por e-mail nunca fica ambíguo.
  it('rejeita o mesmo e-mail em outra barbearia (e-mail global)', async () => {
    await auth.registrar(cadastro);
    await expect(
      auth.registrar({ ...cadastro, slug: 'outra', nomeBarbearia: 'Outra' }),
    ).rejects.toThrow();
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

  it('trava a conta após 10 falhas e a senha certa passa a ser rejeitada', async () => {
    await auth.registrar(cadastro);

    for (let i = 0; i < 10; i++) {
      await expect(
        auth.login({ email: 'dono@demo.com', senha: 'errada' }),
      ).rejects.toThrow();
    }

    // Mesmo com a senha correta, a conta está bloqueada.
    await expect(
      auth.login({ email: 'dono@demo.com', senha: 'Senha@123' }),
    ).rejects.toThrow(/bloqueada/i);

    const u = await prismaTeste().usuario.findFirst({
      where: { email: 'dono@demo.com' },
    });
    expect(u?.loginFalhas).toBeGreaterThanOrEqual(10);
    expect(u?.bloqueadoAte).not.toBeNull();
  });

  it('login bem-sucedido zera o contador de falhas', async () => {
    await auth.registrar(cadastro);
    await expect(
      auth.login({ email: 'dono@demo.com', senha: 'errada' }),
    ).rejects.toThrow();

    await auth.login({ email: 'dono@demo.com', senha: 'Senha@123' });

    const u = await prismaTeste().usuario.findFirst({
      where: { email: 'dono@demo.com' },
    });
    expect(u?.loginFalhas).toBe(0);
    expect(u?.bloqueadoAte).toBeNull();
  });

  it('refresh rotaciona e refresh revogado não autentica', async () => {
    const { refreshToken } = await auth.registrar(cadastro);

    const renovado = await auth.refresh(refreshToken);
    expect(renovado.refreshToken).not.toBe(refreshToken);

    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });

  it('reuso de refresh revogado derruba toda a família de tokens', async () => {
    const { refreshToken } = await auth.registrar(cadastro);
    const renovado = await auth.refresh(refreshToken); // revoga o 1º, emite o 2º

    // Reapresentar o 1º (revogado) deve invalidar também o 2º (resposta a roubo).
    await expect(auth.refresh(refreshToken)).rejects.toThrow();
    await expect(auth.refresh(renovado.refreshToken)).rejects.toThrow();
  });

  it('logout revoga o refresh token', async () => {
    const { refreshToken } = await auth.registrar(cadastro);
    await auth.logout(refreshToken);
    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });
});
