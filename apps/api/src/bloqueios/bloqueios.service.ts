import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { CriarBloqueioDto } from './dto/criar-bloqueio.dto';

@Injectable()
export class BloqueiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  listar() {
    return this.prisma.db.bloqueio.findMany({
      orderBy: { inicio: 'desc' },
      include: { profissional: { select: { apelido: true } } },
    });
  }

  async criar(dto: CriarBloqueioDto) {
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);
    if (fim <= inicio) {
      throw new BadRequestException('O fim deve ser depois do início.');
    }

    // prisma.db é escopado por tenant: um profissional de outra barbearia não
    // é encontrado aqui, então não dá para bloquear a agenda alheia.
    if (dto.profissionalId) {
      const profissional = await this.prisma.db.profissional.findUnique({
        where: { id: dto.profissionalId },
      });
      if (!profissional) {
        throw new NotFoundException('Profissional não encontrado.');
      }
    }

    return this.prisma.db.bloqueio.create({
      data: {
        barbeariaId: this.tenant.requireTenantId(),
        profissionalId: dto.profissionalId ?? null,
        inicio,
        fim,
        motivo: dto.motivo,
      },
    });
  }

  async remover(id: string) {
    const bloqueio = await this.prisma.db.bloqueio.findUnique({
      where: { id },
    });
    if (!bloqueio) {
      throw new NotFoundException('Bloqueio não encontrado.');
    }
    await this.prisma.db.bloqueio.delete({ where: { id } });
    return { success: true };
  }
}
