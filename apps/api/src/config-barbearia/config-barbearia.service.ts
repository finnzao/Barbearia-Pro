import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AtualizarConfigDto } from './dto/atualizar-config.dto';
import {
  HorarioDto,
  SubstituirHorariosDto,
} from './dto/substituir-horarios.dto';

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
    dto.horarios.forEach((h) => this.validarHorario(h));

    await this.prisma.db.horarioFuncionamento.deleteMany({});
    if (dto.horarios.length > 0) {
      await this.prisma.db.horarioFuncionamento.createMany({
        data: dto.horarios.map((h) => ({
          barbeariaId,
          diaSemana: h.diaSemana,
          abre: paraHora(h.abre),
          fecha: paraHora(h.fecha),
          pausaInicio: h.pausaInicio ? paraHora(h.pausaInicio) : null,
          pausaFim: h.pausaFim ? paraHora(h.pausaFim) : null,
        })),
      });
    }
    return this.listarHorarios();
  }

  // O banco tem os mesmos CHECKs; aqui o erro vira 400 legível em vez de 500.
  private validarHorario(h: HorarioDto) {
    if (h.fecha <= h.abre) {
      throw new BadRequestException(
        `Dia ${h.diaSemana}: o fechamento deve ser depois da abertura.`,
      );
    }
    if (!h.pausaInicio !== !h.pausaFim) {
      throw new BadRequestException(
        `Dia ${h.diaSemana}: informe início e fim da pausa, ou nenhum dos dois.`,
      );
    }
    if (h.pausaInicio && h.pausaFim) {
      if (h.pausaFim <= h.pausaInicio) {
        throw new BadRequestException(
          `Dia ${h.diaSemana}: o fim da pausa deve ser depois do início.`,
        );
      }
      if (h.pausaInicio < h.abre || h.pausaFim > h.fecha) {
        throw new BadRequestException(
          `Dia ${h.diaSemana}: a pausa precisa estar dentro do expediente.`,
        );
      }
    }
  }
}
