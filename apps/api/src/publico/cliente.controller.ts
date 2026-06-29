import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ClienteAtual } from './cliente-atual.decorator';
import { ClienteAuthService } from './cliente-auth.service';
import { ClienteJwtGuard } from './cliente-jwt.guard';
import { ClienteAutenticado } from './cliente-request';
import { DefinirSenhaDto, NotificacoesDto } from './dto/cliente-auth.dto';
import { PublicoService } from './publico.service';

@Public()
@UseGuards(ClienteJwtGuard)
@Controller('cliente')
export class ClienteController {
  constructor(
    private readonly publico: PublicoService,
    private readonly clienteAuth: ClienteAuthService,
  ) {}

  @Get('me')
  me(@ClienteAtual() cliente: ClienteAutenticado) {
    return this.publico.perfil(cliente.id);
  }

  @Get('meus-agendamentos')
  meusAgendamentos(@ClienteAtual() cliente: ClienteAutenticado) {
    return this.publico.meusAgendamentos(cliente.barbeariaId, cliente.id);
  }

  @HttpCode(200)
  @Post('agendamentos/:id/cancelar')
  cancelar(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.publico.cancelar(cliente.barbeariaId, cliente.id, id);
  }

  @HttpCode(200)
  @Post('definir-senha')
  definirSenha(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: DefinirSenhaDto,
  ) {
    return this.clienteAuth.definirSenha(cliente.id, dto.senha);
  }

  @Patch('notificacoes')
  notificacoes(
    @ClienteAtual() cliente: ClienteAutenticado,
    @Body() dto: NotificacoesDto,
  ) {
    return this.publico.definirNotificacoes(cliente.id, dto.optOut);
  }
}
