import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { HttpResponse, TenantRequest } from '../tenant/authenticated-request';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: TenantRequest, res: HttpResponse, next: () => void): void {
    const inicio = process.hrtime.bigint();
    const cabecalho = req.headers['x-request-id'];
    const requestId = Array.isArray(cabecalho)
      ? cabecalho[0]
      : (cabecalho ?? randomUUID());

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - inicio) / 1_000_000;
      const statusCode = res.statusCode;
      const level =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      process.stdout.write(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          tenantId: req.tenantId ?? req.user?.barbeariaId ?? null,
          requestId,
          method: req.method,
          route: req.originalUrl,
          statusCode,
          durationMs: Math.round(durationMs * 1000) / 1000,
        }) + '\n',
      );
    });

    next();
  }
}
