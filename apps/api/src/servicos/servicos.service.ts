import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';

@Injectable()
export class ServicosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  listar() {
    return this.prisma.db.servico.findMany({
      orderBy: { nome: 'asc' },
      include: { profissionais: { select: { profissionalId: true } } },
    });
  }

  // Quem executa este serviço. Lista vazia = todos — é assim que o agendamento
  // público lê a ausência de mapeamento, e evita zerar a agenda de quem nunca
  // preencheu essa relação. Substitui o conjunto inteiro.
  async definirProfissionais(id: string, profissionalIds: string[]) {
    // ProfissionalServico não tem barbearia_id, então fica FORA do escopo de
    // tenant do prisma.db: as duas pontas precisam ser validadas aqui. buscar()
    // e o count() abaixo usam modelos escopados — é o que barra id alheio.
    await this.buscar(id);

    if (profissionalIds.length > 0) {
      const validos = await this.prisma.db.profissional.count({
        where: { id: { in: profissionalIds } },
      });
      if (validos !== profissionalIds.length) {
        throw new NotFoundException('Profissional não encontrado.');
      }
    }

    await this.prisma.db.profissionalServico.deleteMany({
      where: { servicoId: id },
    });
    if (profissionalIds.length > 0) {
      await this.prisma.db.profissionalServico.createMany({
        data: profissionalIds.map((profissionalId) => ({
          profissionalId,
          servicoId: id,
        })),
      });
    }
    return this.buscar(id);
  }

  async buscar(id: string) {
    const servico = await this.prisma.db.servico.findUnique({ where: { id } });
    if (!servico) {
      throw new NotFoundException('Serviço não encontrado.');
    }
    return servico;
  }

  criar(dto: CriarServicoDto) {
    return this.prisma.db.servico.create({
      data: { ...dto, barbeariaId: this.tenant.requireTenantId() },
    });
  }

  async atualizar(id: string, dto: AtualizarServicoDto) {
    await this.buscar(id);
    return this.prisma.db.servico.update({ where: { id }, data: dto });
  }

  async remover(id: string) {
    await this.buscar(id);
    await this.prisma.db.servico.delete({ where: { id } });
    return { success: true };
  }
}
