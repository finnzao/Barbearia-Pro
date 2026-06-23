import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../tenant/tenant.context';
import { tenantExtension } from '../tenant/tenant.extension';

function criarClienteTenant(prisma: PrismaClient, tenant: TenantContext) {
  return prisma.$extends(tenantExtension(tenant));
}

export type TenantClient = ReturnType<typeof criarClienteTenant>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private clienteTenant?: TenantClient;

  constructor(private readonly tenantContext: TenantContext) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  get db(): TenantClient {
    if (!this.clienteTenant) {
      this.clienteTenant = criarClienteTenant(this, this.tenantContext);
    }
    return this.clienteTenant;
  }
}
