import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PapelUsuario, Prisma, Usuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistrarDto } from './dto/registrar.dto';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registrar(dto: RegistrarDto) {
    const senhaHash = await argon2.hash(dto.senha);

    try {
      const usuario = await this.prisma.$transaction(async (tx) => {
        const barbearia = await tx.barbearia.create({
          data: {
            nome: dto.nomeBarbearia,
            slug: dto.slug,
            config: { create: {} },
          },
        });

        return tx.usuario.create({
          data: {
            barbeariaId: barbearia.id,
            email: dto.email,
            senhaHash,
            papel: PapelUsuario.dono,
          },
        });
      });

      return this.emitirTokens(usuario);
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new ConflictException('Barbearia ou e-mail já cadastrado.');
      }
      throw erro;
    }
  }

  async login(dto: LoginDto) {
    const invalidas = new UnauthorizedException('Credenciais inválidas.');

    const usuario = await this.prisma.usuario.findFirst({
      where: { email: dto.email },
      orderBy: { criadoEm: 'asc' },
    });
    if (!usuario) {
      throw invalidas;
    }

    const senhaOk = await argon2.verify(usuario.senhaHash, dto.senha);
    if (!senhaOk) {
      throw invalidas;
    }

    return this.emitirTokens(usuario);
  }

  async refresh(refreshToken: string) {
    const invalido = new UnauthorizedException('Refresh token inválido.');
    const tokenHash = this.hashRefresh(refreshToken);

    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });

    if (!registro || registro.revogadoEm || registro.expiraEm < new Date()) {
      throw invalido;
    }

    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revogadoEm: new Date() },
    });

    return this.emitirTokens(registro.usuario);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashRefresh(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    return { success: true };
  }

  private async emitirTokens(usuario: Usuario) {
    const payload: JwtPayload = {
      sub: usuario.id,
      barbeariaId: usuario.barbeariaId,
      papel: usuario.papel,
      profissionalId: usuario.profissionalId,
    };

    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: this.hashRefresh(refreshToken),
        expiraEm: new Date(Date.now() + this.config.refreshTtlMs),
      },
    });

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        barbeariaId: usuario.barbeariaId,
        papel: usuario.papel,
        profissionalId: usuario.profissionalId,
      },
    };
  }

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
