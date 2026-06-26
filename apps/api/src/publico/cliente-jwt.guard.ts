import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../config/config.service';
import { ClienteRequest } from './cliente-request';

interface ClientePayload {
  sub: string;
  barbeariaId: string;
  tipo: string;
}

@Injectable()
export class ClienteJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ClienteRequest>();
    const header = request.headers['authorization'];
    const valor = Array.isArray(header) ? header[0] : header;
    const token = valor?.startsWith('Bearer ') ? valor.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Autenticação do cliente obrigatória.');
    }

    try {
      const payload = await this.jwt.verifyAsync<ClientePayload>(token, {
        secret: this.config.jwtSecret,
      });
      if (payload.tipo !== 'cliente') {
        throw new Error('tipo inválido');
      }
      request.cliente = { id: payload.sub, barbeariaId: payload.barbeariaId };
    } catch {
      throw new UnauthorizedException('Sessão do cliente inválida.');
    }

    return true;
  }
}
