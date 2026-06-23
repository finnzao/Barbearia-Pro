import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpResponse, TenantRequest } from '../tenant/authenticated-request';
import { MissingTenantError } from '../tenant/tenant.extension';

interface RespostaErro {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

const CODIGO_POR_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'REQUISICAO_INVALIDA',
  [HttpStatus.UNAUTHORIZED]: 'NAO_AUTENTICADO',
  [HttpStatus.FORBIDDEN]: 'ACESSO_NEGADO',
  [HttpStatus.NOT_FOUND]: 'NAO_ENCONTRADO',
  [HttpStatus.CONFLICT]: 'CONFLITO',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'NAO_PROCESSAVEL',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<TenantRequest>();

    const { status, code, message, details } = this.mapear(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      process.stderr.write(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          tenantId: request.tenantId ?? request.user?.barbeariaId ?? null,
          requestId: request.requestId ?? null,
          method: request.method,
          route: request.originalUrl,
          statusCode: status,
          code,
          message,
          stack: exception instanceof Error ? exception.stack : undefined,
        }) + '\n',
      );
    }

    const corpo: RespostaErro = {
      success: false,
      error: { code, message, details },
    };

    response.status(status).json(corpo);
  }

  private mapear(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: Record<string, unknown>;
  } {
    if (exception instanceof MissingTenantError) {
      return {
        status: HttpStatus.FORBIDDEN,
        code: 'TENANT_AUSENTE',
        message: 'Acesso ao banco sem tenant definido.',
        details: {},
      };
    }

    if (exception instanceof HttpException) {
      return this.mapearHttp(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapearPrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'REQUISICAO_INVALIDA',
        message: 'Consulta inválida ao banco de dados.',
        details: {},
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'ERRO_INTERNO',
      message: 'Erro interno do servidor.',
      details: {},
    };
  }

  private mapearHttp(exception: HttpException): {
    status: number;
    code: string;
    message: string;
    details: Record<string, unknown>;
  } {
    const status = exception.getStatus();
    const resposta = exception.getResponse();
    const code = CODIGO_POR_STATUS[status] ?? 'ERRO_INTERNO';

    if (typeof resposta === 'string') {
      return { status, code, message: resposta, details: {} };
    }

    const dados = resposta as Record<string, unknown>;
    const mensagemBruta = dados.message;

    if (Array.isArray(mensagemBruta)) {
      return {
        status,
        code: status === HttpStatus.BAD_REQUEST ? 'VALIDACAO' : code,
        message: 'Falha na validação dos dados enviados.',
        details: { errors: mensagemBruta },
      };
    }

    return {
      status,
      code,
      message:
        typeof mensagemBruta === 'string' ? mensagemBruta : exception.message,
      details: {},
    };
  }

  private mapearPrisma(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
    details: Record<string, unknown>;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLITO',
          message: 'Registro já existente.',
          details: { target: exception.meta?.target ?? null },
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NAO_ENCONTRADO',
          message: 'Registro não encontrado.',
          details: {},
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLITO',
          message: 'Violação de integridade referencial.',
          details: { field: exception.meta?.field_name ?? null },
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'REQUISICAO_INVALIDA',
          message: 'Erro ao processar operação no banco de dados.',
          details: { prismaCode: exception.code },
        };
    }
  }
}
