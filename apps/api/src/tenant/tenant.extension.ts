import { Prisma } from '@prisma/client';
import { TenantContext } from './tenant.context';

export class MissingTenantError extends Error {
  constructor() {
    super('Acesso ao banco sem tenant definido.');
    this.name = 'MissingTenantError';
  }
}

const CAMPO_TENANT: Record<string, string> = {
  Barbearia: 'id',
  ConfigBarbearia: 'barbeariaId',
  HorarioFuncionamento: 'barbeariaId',
  HorarioExcecao: 'barbeariaId',
  Profissional: 'barbeariaId',
  Bloqueio: 'barbeariaId',
  Usuario: 'barbeariaId',
  CategoriaServico: 'barbeariaId',
  Servico: 'barbeariaId',
  Cliente: 'barbeariaId',
  Agendamento: 'barbeariaId',
  Pagamento: 'barbeariaId',
  SplitPagamento: 'barbeariaId',
  Repasse: 'barbeariaId',
  PlanoAssinatura: 'barbeariaId',
  AssinaturaCliente: 'barbeariaId',
};

export function tenantExtension(tenant: TenantContext) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const campo = CAMPO_TENANT[model];
          if (!campo) {
            return query(args);
          }

          const tenantId = tenant.getTenantId();
          if (!tenantId) {
            throw new MissingTenantError();
          }

          const proximo = (args ?? {}) as Record<string, any>;

          switch (operation) {
            case 'create':
              if (model !== 'Barbearia') {
                proximo.data = { ...proximo.data, [campo]: tenantId };
              }
              break;
            case 'createMany':
            case 'createManyAndReturn':
              if (model !== 'Barbearia') {
                const linhas = Array.isArray(proximo.data)
                  ? proximo.data
                  : [proximo.data];
                proximo.data = linhas.map((linha: Record<string, any>) => ({
                  ...linha,
                  [campo]: tenantId,
                }));
              }
              break;
            case 'upsert':
              proximo.where = { ...proximo.where, [campo]: tenantId };
              if (model !== 'Barbearia') {
                proximo.create = { ...proximo.create, [campo]: tenantId };
              }
              break;
            default:
              proximo.where = { ...proximo.where, [campo]: tenantId };
              break;
          }

          return query(proximo);
        },
      },
    },
  });
}
