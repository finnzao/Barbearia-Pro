import { Module } from '@nestjs/common';
import { AssinaturasClienteController } from './assinaturas-cliente.controller';
import { AssinaturasClienteService } from './assinaturas-cliente.service';
import { PlanosController } from './planos.controller';
import { PlanosService } from './planos.service';

@Module({
  controllers: [PlanosController, AssinaturasClienteController],
  providers: [PlanosService, AssinaturasClienteService],
})
export class AssinaturasModule {}
