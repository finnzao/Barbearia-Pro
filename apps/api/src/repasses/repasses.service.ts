import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusRepasse } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { CriarRepasseDto } from './dto/criar-repasse.dto';
import { ListarRepassesDto } from './dto/listar-repasses.dto';

@Injectable()
export class RepassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  listar(filtros: ListarRepassesDto) {
    return this.prisma.db.repasse.findMany({
      where: {
        profissionalId: filtros.profissionalId,
        status: filtros.status,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscar(id: string) {
    const repasse = await this.prisma.db.repasse.findUnique({ where: { id } });
    if (!repasse) {
      throw new NotFoundException('Repasse não encontrado.');
    }
    return repasse;
  }

  criar(dto: CriarRepasseDto) {
    return this.prisma.db.repasse.create({
      data: { ...dto, barbeariaId: this.tenant.requireTenantId() },
    });
  }

  async pagar(id: string) {
    const repasse = await this.buscar(id);
    if (repasse.status === StatusRepasse.pago) {
      return repasse;
    }
    return this.prisma.db.repasse.update({
      where: { id },
      data: { status: StatusRepasse.pago, pagoEm: new Date() },
    });
  }
}
