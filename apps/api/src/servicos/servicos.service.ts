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
    return this.prisma.db.servico.findMany({ orderBy: { nome: 'asc' } });
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
