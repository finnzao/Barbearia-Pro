import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController health (integração)', () => {
  it('retorna ok quando o banco responde', async () => {
    const prisma = new PrismaClient();
    const controller = new AppController(prisma as unknown as PrismaService);

    await expect(controller.health()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    });

    await prisma.$disconnect();
  });

  it('falha quando o banco está fora', async () => {
    const prisma = new PrismaClient({
      datasourceUrl: 'postgresql://user:pass@localhost:1/indisponivel',
    });
    const controller = new AppController(prisma as unknown as PrismaService);

    await expect(controller.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await prisma.$disconnect();
  });
});
