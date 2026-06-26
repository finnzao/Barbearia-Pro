import { JwtService } from '@nestjs/jwt';
import { fecharBanco, prismaTeste, resetDatabase } from '../../test/support/db';
import { criarBarbearia } from '../../test/support/factories';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClienteAuthService } from './cliente-auth.service';

const notificador = { enviarCodigo: jest.fn().mockResolvedValue(undefined) };
const WPP = '11999990000';

describe('ClienteAuthService (integração)', () => {
  const config = new ConfigService();
  const jwt = new JwtService({ secret: config.jwtSecret });
  const prisma = prismaTeste() as unknown as PrismaService;
  const service = new ClienteAuthService(
    prisma,
    jwt,
    config,
    notificador as never,
  );

  beforeEach(async () => {
    await resetDatabase();
    notificador.enviarCodigo.mockClear();
  });

  afterAll(async () => {
    await fecharBanco();
  });

  it('solicita OTP, valida e cria sessão do cliente', async () => {
    const b = await criarBarbearia();
    const ref = { id: b.id, nome: b.nome };

    const codigo = await service.solicitarOtp(ref, WPP);
    expect(codigo).toMatch(/^\d{6}$/);
    expect(notificador.enviarCodigo).toHaveBeenCalledTimes(1);

    const res = await service.loginOtp(ref, WPP, codigo);
    expect(res.accessToken).toEqual(expect.any(String));
    expect(jwt.verify(res.accessToken)).toMatchObject({
      tipo: 'cliente',
      barbeariaId: b.id,
    });
  });

  it('código errado falha e código correto é de uso único', async () => {
    const b = await criarBarbearia();
    const ref = { id: b.id, nome: b.nome };
    const codigo = await service.solicitarOtp(ref, WPP);

    await expect(service.loginOtp(ref, WPP, '000000')).rejects.toThrow();
    await service.loginOtp(ref, WPP, codigo);
    await expect(service.loginOtp(ref, WPP, codigo)).rejects.toThrow();
  });

  it('define senha e permite login por senha', async () => {
    const b = await criarBarbearia();
    const ref = { id: b.id, nome: b.nome };
    const codigo = await service.solicitarOtp(ref, WPP);
    const { cliente } = await service.loginOtp(ref, WPP, codigo);

    await service.definirSenha(cliente.id, 'segredo123');

    const res = await service.loginSenha(ref, WPP, 'segredo123');
    expect(res.accessToken).toEqual(expect.any(String));
    await expect(service.loginSenha(ref, WPP, 'errada')).rejects.toThrow();
  });

  it('isola verificação entre barbearias', async () => {
    const b1 = await criarBarbearia();
    const b2 = await criarBarbearia();
    const codigo = await service.solicitarOtp(
      { id: b1.id, nome: b1.nome },
      WPP,
    );

    await expect(
      service.loginOtp({ id: b2.id, nome: b2.nome }, WPP, codigo),
    ).rejects.toThrow();
  });
});
