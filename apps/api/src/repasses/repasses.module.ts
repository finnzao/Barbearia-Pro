import { Module } from '@nestjs/common';
import { RepassesController } from './repasses.controller';
import { RepassesService } from './repasses.service';

@Module({
  controllers: [RepassesController],
  providers: [RepassesService],
})
export class RepassesModule {}
