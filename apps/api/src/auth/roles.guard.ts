import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelUsuario } from '@prisma/client';
import { TenantRequest } from '../tenant/authenticated-request';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<PapelUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requeridos || requeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const usuario = request.user;
    if (!usuario || !requeridos.includes(usuario.papel as PapelUsuario)) {
      throw new ForbiddenException('Papel sem permissão para esta operação.');
    }

    return true;
  }
}
