import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { ConfigBarbeariaService } from './config-barbearia.service';
import { AtualizarConfigDto } from './dto/atualizar-config.dto';
import { SubstituirHorariosDto } from './dto/substituir-horarios.dto';

@Controller('config')
export class ConfigBarbeariaController {
  constructor(private readonly config: ConfigBarbeariaService) {}

  @Get()
  obter() {
    return this.config.obter();
  }

  @Roles(PapelUsuario.dono)
  @Patch()
  atualizar(@Body() dto: AtualizarConfigDto) {
    return this.config.atualizar(dto);
  }

  @Get('horarios')
  listarHorarios() {
    return this.config.listarHorarios();
  }

  @Roles(PapelUsuario.dono)
  @Put('horarios')
  substituirHorarios(@Body() dto: SubstituirHorariosDto) {
    return this.config.substituirHorarios(dto);
  }
}
