import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant.context';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  listar() {
    return this.prisma.db.cliente.findMany({ orderBy: { nome: 'asc' } });
  }

  async buscar(id: string) {
    const cliente = await this.prisma.db.cliente.findUnique({ where: { id } });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return cliente;
  }

  criar(dto: CriarClienteDto) {
    return this.prisma.db.cliente.create({
      data: { ...dto, barbeariaId: this.tenant.requireTenantId() },
    });
  }

  async atualizar(id: string, dto: AtualizarClienteDto) {
    await this.buscar(id);
    return this.prisma.db.cliente.update({ where: { id }, data: dto });
  }

  async remover(id: string) {
    await this.buscar(id);
    await this.prisma.db.cliente.delete({ where: { id } });
    return { success: true };
  }
}
