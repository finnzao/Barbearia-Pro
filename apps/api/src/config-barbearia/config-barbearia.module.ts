import { Module } from '@nestjs/common';
import { ConfigBarbeariaController } from './config-barbearia.controller';
import { ConfigBarbeariaService } from './config-barbearia.service';

@Module({
  controllers: [ConfigBarbeariaController],
  providers: [ConfigBarbeariaService],
})
export class ConfigBarbeariaModule {}
