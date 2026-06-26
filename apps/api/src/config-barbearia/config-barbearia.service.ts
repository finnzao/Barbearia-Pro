import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AtualizarConfigDto } from './dto/atualizar-config.dto';
import { SubstituirHorariosDto } from './dto/substituir-horarios.dto';

function paraHora(valor: string): Date {
  return new Date(`1970-01-01T${valor}:00.000Z`);
}

@Injectable()
export class ConfigBarbeariaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  obter() {
    const barbeariaId = this.tenant.requireTenantId();
    return this.prisma.db.configBarbearia.upsert({
      where: { barbeariaId },
      create: { barbeariaId },
      update: {},
    });
  }

  atualizar(dto: AtualizarConfigDto) {
    const barbeariaId = this.tenant.requireTenantId();
    return this.prisma.db.configBarbearia.upsert({
      where: { barbeariaId },
      create: { barbeariaId, ...dto },
      update: dto,
    });
  }

  listarHorarios() {
    return this.prisma.db.horarioFuncionamento.findMany({
      orderBy: { diaSemana: 'asc' },
    });
  }

  async substituirHorarios(dto: SubstituirHorariosDto) {
    const barbeariaId = this.tenant.requireTenantId();
    await this.prisma.db.horarioFuncionamento.deleteMany({});
    if (dto.horarios.length > 0) {
      await this.prisma.db.horarioFuncionamento.createMany({
        data: dto.horarios.map((h) => ({
          barbeariaId,
          diaSemana: h.diaSemana,
          abre: paraHora(h.abre),
          fecha: paraHora(h.fecha),
        })),
      });
    }
    return this.listarHorarios();
  }
}
