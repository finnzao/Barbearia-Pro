import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantRequest } from './authenticated-request';
import { TenantContext } from './tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = request.tenantId ?? request.user?.barbeariaId;

    if (!tenantId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      this.tenantContext.run(tenantId, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
