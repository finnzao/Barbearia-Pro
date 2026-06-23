import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantRequest } from './authenticated-request';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const usuario = request.user;

    if (!usuario) {
      throw new UnauthorizedException('Autenticação obrigatória.');
    }

    if (!usuario.barbeariaId) {
      throw new ForbiddenException('Usuário sem barbearia associada.');
    }

    request.tenantId = usuario.barbeariaId;
    return true;
  }
}
