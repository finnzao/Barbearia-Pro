import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AtualizarProfissionalDto } from './dto/atualizar-profissional.dto';
import { CriarProfissionalDto } from './dto/criar-profissional.dto';

@Injectable()
export class ProfissionaisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  listar() {
    return this.prisma.db.profissional.findMany({ orderBy: { nome: 'asc' } });
  }

  async buscar(id: string) {
    const profissional = await this.prisma.db.profissional.findUnique({
      where: { id },
    });
    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado.');
    }
    return profissional;
  }

  criar(dto: CriarProfissionalDto) {
    return this.prisma.db.profissional.create({
      data: { ...dto, barbeariaId: this.tenant.requireTenantId() },
    });
  }

  async atualizar(id: string, dto: AtualizarProfissionalDto) {
    await this.buscar(id);
    return this.prisma.db.profissional.update({ where: { id }, data: dto });
  }

  async remover(id: string) {
    await this.buscar(id);
    await this.prisma.db.profissional.delete({ where: { id } });
    return { success: true };
  }
}
