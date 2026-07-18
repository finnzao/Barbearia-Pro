import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PapelUsuario } from '@prisma/client';
import { ConfigService } from '../config/config.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './jwt-payload';

// Contexto HTTP mínimo com um Authorization: Bearer <token>.
function contexto(token?: string, publico = false): ExecutionContext {
  const req: { headers: Record<string, string>; user?: unknown } = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  const reflector = {
    getAllAndOverride: () => publico,
  } as unknown as Reflector;
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return Object.assign(ctx, { __req: req, __reflector: reflector });
}

describe('JwtAuthGuard', () => {
  const config = { jwtSecret: 'segredo-de-teste' } as ConfigService;

  function guardCom(payload: JwtPayload | Error): {
    guard: JwtAuthGuard;
    req: { headers: Record<string, string>; user?: unknown };
    ctx: ExecutionContext;
  } {
    const jwt = {
      verifyAsync: () =>
        payload instanceof Error
          ? Promise.reject(payload)
          : Promise.resolve(payload),
    } as unknown as JwtService;
    const ctx = contexto('token-qualquer');
    const reflector = (ctx as unknown as { __reflector: Reflector })
      .__reflector;
    const guard = new JwtAuthGuard(reflector, jwt, config);
    const req = (ctx as unknown as { __req: typeof ctx }).__req as unknown as {
      headers: Record<string, string>;
      user?: unknown;
    };
    return { guard, req, ctx };
  }

  const tokenStaff: JwtPayload = {
    sub: 'u1',
    barbeariaId: 'b1',
    papel: PapelUsuario.dono,
    profissionalId: null,
  };

  it('aceita token de staff (com papel) e popula request.user', async () => {
    const { guard, req, ctx } = guardCom(tokenStaff);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      id: 'u1',
      barbeariaId: 'b1',
      papel: PapelUsuario.dono,
      profissionalId: null,
    });
  });

  // Regressão da V-01: token de cliente é assinado com o mesmo segredo, mas não
  // pode alcançar rotas de staff.
  it('rejeita token de cliente (tipo=cliente, sem papel)', async () => {
    const tokenCliente = {
      sub: 'c1',
      barbeariaId: 'b1',
      tipo: 'cliente',
    } as unknown as JwtPayload;
    const { guard, req, ctx } = guardCom(tokenCliente);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(req.user).toBeUndefined();
  });

  it('rejeita token válido sem papel (defesa em profundidade)', async () => {
    const semPapel = {
      sub: 'x',
      barbeariaId: 'b1',
    } as unknown as JwtPayload;
    const { guard, ctx } = guardCom(semPapel);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita token com assinatura inválida', async () => {
    const { guard, ctx } = guardCom(new Error('invalid signature'));
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
