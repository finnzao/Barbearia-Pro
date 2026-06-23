import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  tenantId: string;
}

@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(tenantId: string, callback: () => T): T {
    return this.storage.run({ tenantId }, callback);
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }
}
