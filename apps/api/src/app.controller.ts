import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }

    return { status: 'ok', database: 'ok' };
  }
}
