import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cliente } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICADOR_WHATSAPP,
  NotificadorWhatsapp,
} from './notificador-whatsapp';

const MAX_TENTATIVAS = 5;

interface BarbeariaRef {
  id: string;
  nome: string;
}

@Injectable()
export class ClienteAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(NOTIFICADOR_WHATSAPP)
    private readonly notificador: NotificadorWhatsapp,
  ) {}

  async solicitarOtp(barbearia: BarbeariaRef, whatsapp: string) {
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codigoHash = await argon2.hash(codigo);

    await this.prisma.verificacaoCliente.updateMany({
      where: { barbeariaId: barbearia.id, whatsapp, consumidoEm: null },
      data: { consumidoEm: new Date() },
    });
    await this.prisma.verificacaoCliente.create({
      data: {
        barbeariaId: barbearia.id,
        whatsapp,
        codigoHash,
        expiraEm: new Date(Date.now() + this.config.otpTtlMs),
      },
    });

    await this.notificador.enviarCodigo(whatsapp, codigo, barbearia.nome);
    return codigo;
  }

  async loginOtp(barbearia: BarbeariaRef, whatsapp: string, codigo: string) {
    const invalido = new UnauthorizedException('Código inválido ou expirado.');

    const verificacao = await this.prisma.verificacaoCliente.findFirst({
      where: {
        barbeariaId: barbearia.id,
        whatsapp,
        consumidoEm: null,
        expiraEm: { gt: new Date() },
      },
      orderBy: { criadoEm: 'desc' },
    });
    if (!verificacao) {
      throw invalido;
    }

    if (verificacao.tentativas >= MAX_TENTATIVAS) {
      await this.prisma.verificacaoCliente.update({
        where: { id: verificacao.id },
        data: { consumidoEm: new Date() },
      });
      throw invalido;
    }

    const ok = await argon2.verify(verificacao.codigoHash, codigo);
    if (!ok) {
      await this.prisma.verificacaoCliente.update({
        where: { id: verificacao.id },
        data: { tentativas: { increment: 1 } },
      });
      throw invalido;
    }

    await this.prisma.verificacaoCliente.update({
      where: { id: verificacao.id },
      data: { consumidoEm: new Date() },
    });

    const cliente = await this.prisma.cliente.upsert({
      where: {
        barbeariaId_whatsapp: { barbeariaId: barbearia.id, whatsapp },
      },
      update: {},
      create: { barbeariaId: barbearia.id, whatsapp, nome: whatsapp },
    });

    return this.emitirToken(cliente);
  }

  async loginSenha(barbearia: BarbeariaRef, whatsapp: string, senha: string) {
    const invalido = new UnauthorizedException('Credenciais inválidas.');

    const cliente = await this.prisma.cliente.findUnique({
      where: {
        barbeariaId_whatsapp: { barbeariaId: barbearia.id, whatsapp },
      },
    });
    if (!cliente?.senhaHash) {
      throw invalido;
    }

    const ok = await argon2.verify(cliente.senhaHash, senha);
    if (!ok) {
      throw invalido;
    }

    return this.emitirToken(cliente);
  }

  async definirSenha(clienteId: string, senha: string) {
    await this.prisma.cliente.update({
      where: { id: clienteId },
      data: { senhaHash: await argon2.hash(senha) },
    });
    return { success: true };
  }

  private async emitirToken(cliente: Cliente) {
    const accessToken = await this.jwt.signAsync(
      { sub: cliente.id, barbeariaId: cliente.barbeariaId, tipo: 'cliente' },
      { expiresIn: this.config.clienteJwtExpiresIn as unknown as number },
    );
    return {
      accessToken,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        whatsapp: cliente.whatsapp,
        temSenha: !!cliente.senhaHash,
      },
    };
  }
}
