import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClienteAutenticado, ClienteRequest } from './cliente-request';

export const ClienteAtual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClienteAutenticado => {
    const request = context.switchToHttp().getRequest<ClienteRequest>();
    return request.cliente as ClienteAutenticado;
  },
);
