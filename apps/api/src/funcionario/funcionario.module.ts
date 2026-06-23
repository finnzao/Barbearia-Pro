import { Module } from '@nestjs/common';
import { FuncionarioController } from './funcionario.controller';
import { FuncionarioService } from './funcionario.service';

@Module({
  controllers: [FuncionarioController],
  providers: [FuncionarioService],
})
export class FuncionarioModule {}
