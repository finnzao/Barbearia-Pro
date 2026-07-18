import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PapelUsuario } from "@prisma/client";
import { Test } from "@nestjs/testing";
import { ThrottlerStorage } from "@nestjs/throttler";
import { AppModule } from "../../src/app.module";
import { configurarApp } from "../../src/app.setup";

export async function criarAppTeste(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configurarApp(app);
  await app.init();
  return app;
}

/**
 * Zera os contadores do rate limit. O throttle é por IP e todo teste vem do
 * mesmo 127.0.0.1: sem isto, uma suíte com muitos casos estoura o limite e o
 * 429 mascara o status que o teste queria verificar. Chame no beforeEach, junto
 * do resetDatabase — é isolamento, não desligamento: o guard segue ativo.
 */
export function limparThrottle(app: INestApplication): void {
  const storage = app.get<ThrottlerStorage>(ThrottlerStorage);
  (storage as unknown as { storage?: Map<string, unknown> }).storage?.clear();
}

/**
 * Header de autenticação sem passar por /auth/registrar|login — esses endpoints
 * têm throttle apertado (de propósito), e uma suíte com muitos casos esbarra no
 * limite e vira 401 aleatório. Assina com o JwtService do próprio app, então o
 * token é idêntico ao de produção.
 */
export async function authDe(
  app: INestApplication,
  usuario: {
    id: string;
    barbeariaId: string;
    papel: PapelUsuario;
    profissionalId?: string | null;
  },
): Promise<{ Authorization: string }> {
  const token = await app.get(JwtService).signAsync({
    sub: usuario.id,
    barbeariaId: usuario.barbeariaId,
    papel: usuario.papel,
    profissionalId: usuario.profissionalId ?? null,
  });
  return { Authorization: `Bearer ${token}` };
}
