import { JwtService } from '@nestjs/jwt';
import { PapelUsuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const jwt = new JwtService({ secret: 'unit-secret' });
const config = {
  jwtSecret: 'unit-secret',
  jwtExpiresIn: '15m',
  refreshTtlMs: 60_000,
} as unknown as ConfigService;

function prismaMock(): PrismaService {
  return {
    usuario: { findUnique: jest.fn(), update: jest.fn() },
    refreshToken: { create: jest.fn().mockResolvedValue({}) },
    barbearia: {
      findUnique: jest.fn().mockResolvedValue({ slug: 'barb-slug' }),
    },
  } as unknown as PrismaService;
}

describe('AuthService (unit)', () => {
  it('hash e verify de senha', async () => {
    const hash = await argon2.hash('Senha@123');
    expect(await argon2.verify(hash, 'Senha@123')).toBe(true);
    expect(await argon2.verify(hash, 'outra')).toBe(false);
  });

  it('login emite JWT com payload correto', async () => {
    const prisma = prismaMock();
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      barbeariaId: 'barb-1',
      papel: PapelUsuario.profissional,
      profissionalId: 'prof-1',
      loginFalhas: 0,
      bloqueadoAte: null,
      senhaHash: await argon2.hash('Senha@123'),
    });

    const service = new AuthService(prisma, jwt, config);
    const resultado = await service.login({
      email: 'a@b.com',
      senha: 'Senha@123',
    });

    const payload = jwt.verify(resultado.accessToken);
    expect(payload).toMatchObject({
      sub: 'user-1',
      barbeariaId: 'barb-1',
      papel: 'profissional',
      profissionalId: 'prof-1',
    });
    expect(resultado.refreshToken).toEqual(expect.any(String));
    // O painel monta o link público (/agendar/:slug) a partir daqui.
    expect(resultado.usuario.barbeariaSlug).toBe('barb-slug');
  });

  it('login rejeita senha incorreta', async () => {
    const prisma = prismaMock();
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue({
      id: 'u',
      barbeariaId: 'b',
      papel: PapelUsuario.dono,
      profissionalId: null,
      loginFalhas: 0,
      bloqueadoAte: null,
      senhaHash: await argon2.hash('correta'),
    });

    const service = new AuthService(prisma, jwt, config);
    await expect(
      service.login({ email: 'a@b.com', senha: 'errada' }),
    ).rejects.toThrow();
  });
});
