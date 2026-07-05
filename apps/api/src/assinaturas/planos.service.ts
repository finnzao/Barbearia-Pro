import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AtualizarPlanoDto } from './dto/atualizar-plano.dto';
import { CriarPlanoDto } from './dto/criar-plano.dto';

@Injectable()
export class PlanosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  private readonly include = {
    itens: {
      include: {
        servico: { select: { id: true, nome: true, precoCentavos: true } },
      },
    },
  };

  listar() {
    return this.prisma.db.planoAssinatura.findMany({
      include: this.include,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscar(id: string) {
    const plano = await this.prisma.db.planoAssinatura.findUnique({
      where: { id },
      include: this.include,
    });
    if (!plano) {
      throw new NotFoundException('Plano não encontrado.');
    }
    return plano;
  }

  async criar(dto: CriarPlanoDto) {
    const ids = [...new Set(dto.itens.map((i) => i.servicoId))];
    if (ids.length !== dto.itens.length) {
      throw new BadRequestException('Serviço repetido na lista de itens.');
    }
    // A busca já é escopada por tenant (prisma.db); se algum id não pertence
    // a esta barbearia (ou não existe), a contagem não bate.
    const encontrados = await this.prisma.db.servico.count({
      where: { id: { in: ids } },
    });
    if (encontrados !== ids.length) {
      throw new BadRequestException('Serviço inválido em um dos itens.');
    }

    return this.prisma.db.planoAssinatura.create({
      data: {
        nome: dto.nome,
        precoCentavos: dto.precoCentavos,
        ativo: dto.ativo,
        barbeariaId: this.tenant.requireTenantId(),
        itens: {
          create: dto.itens.map((i) => ({
            servicoId: i.servicoId,
            quantidadeMes: i.quantidadeMes,
          })),
        },
      },
      include: this.include,
    });
  }

  async atualizar(id: string, dto: AtualizarPlanoDto) {
    await this.buscar(id);
    return this.prisma.db.planoAssinatura.update({
      where: { id },
      data: dto,
      include: this.include,
    });
  }
}
