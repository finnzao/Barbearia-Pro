import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../config/config.service';
import { TenantRequest } from '../tenant/authenticated-request';
import { JwtPayload } from './jwt-payload';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publico) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const token = this.extrairToken(request);
    if (!token) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwtSecret,
      });
      request.user = {
        id: payload.sub,
        barbeariaId: payload.barbeariaId,
        papel: payload.papel,
        profissionalId: payload.profissionalId,
      };
    } catch {
      throw new UnauthorizedException('Token de acesso inválido.');
    }

    return true;
  }

  private extrairToken(request: TenantRequest): string | undefined {
    const header = request.headers['authorization'];
    const valor = Array.isArray(header) ? header[0] : header;
    if (!valor) {
      return undefined;
    }
    const [tipo, token] = valor.split(' ');
    return tipo === 'Bearer' ? token : undefined;
  }
}
