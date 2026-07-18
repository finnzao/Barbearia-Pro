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

// Lockout por conta: além do throttle por IP (5/min), trava a conta após N
// falhas para conter brute force distribuído por vários IPs.
const MAX_FALHAS_LOGIN = 10;
const BLOQUEIO_MS = 15 * 60_000;
// Hash argon2 descartável, usado quando o e-mail não existe, para o login gastar
// o mesmo tempo em qualquer caso (evita enumeração de e-mail por timing).
const HASH_DUMMY =
  '$argon2id$v=19$m=65536,t=3,p=4$Htt1Wl/tJAsN2Cl3vjwBpw$VEWsbGIxOHpzk91mC0aF6NyV435VcNBdj0Bxr1qrW9M';

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

    // E-mail é globalmente único (V-09): resolve para no máximo um usuário.
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    // Conta travada: rejeita sem nem verificar a senha (mensagem própria).
    if (usuario?.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      throw new UnauthorizedException(
        'Conta temporariamente bloqueada por excesso de tentativas. Tente mais tarde.',
      );
    }

    // Sempre roda um verify (hash real ou dummy) → tempo constante, sem oráculo
    // de enumeração de e-mail.
    const senhaOk = await argon2.verify(
      usuario?.senhaHash ?? HASH_DUMMY,
      dto.senha,
    );

    if (!usuario || !senhaOk) {
      if (usuario) {
        await this.registrarFalhaLogin(usuario.id, usuario.loginFalhas);
      }
      throw invalidas;
    }

    if (usuario.loginFalhas > 0 || usuario.bloqueadoAte) {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { loginFalhas: 0, bloqueadoAte: null },
      });
    }

    return this.emitirTokens(usuario);
  }

  private async registrarFalhaLogin(usuarioId: string, falhasAtuais: number) {
    const falhas = falhasAtuais + 1;
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        loginFalhas: falhas,
        bloqueadoAte:
          falhas >= MAX_FALHAS_LOGIN
            ? new Date(Date.now() + BLOQUEIO_MS)
            : undefined,
      },
    });
  }

  async refresh(refreshToken: string) {
    const invalido = new UnauthorizedException('Refresh token inválido.');
    const tokenHash = this.hashRefresh(refreshToken);

    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });

    // Reuso de um token já revogado é sinal de roubo: revoga TODA a família de
    // tokens do usuário (o legítimo é forçado a logar de novo, o ladrão fica fora).
    if (registro?.revogadoEm) {
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: registro.usuarioId, revogadoEm: null },
        data: { revogadoEm: new Date() },
      });
      throw invalido;
    }

    if (!registro || registro.expiraEm < new Date()) {
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

    // O slug identifica o link público da barbearia (/agendar/:slug) — o painel
    // precisa dele para mostrar e compartilhar o link do cliente.
    const [barbearia] = await Promise.all([
      this.prisma.barbearia.findUnique({
        where: { id: usuario.barbeariaId },
        select: { slug: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: this.hashRefresh(refreshToken),
          expiraEm: new Date(Date.now() + this.config.refreshTtlMs),
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        barbeariaId: usuario.barbeariaId,
        barbeariaSlug: barbearia?.slug ?? null,
        papel: usuario.papel,
        profissionalId: usuario.profissionalId,
      },
    };
  }

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
