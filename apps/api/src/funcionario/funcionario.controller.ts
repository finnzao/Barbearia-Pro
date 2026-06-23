import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../tenant/authenticated-request';
import { AgendaQueryDto } from './dto/agenda-query.dto';
import { FuncionarioService } from './funcionario.service';

@Roles(PapelUsuario.profissional)
@Controller('funcionario')
export class FuncionarioController {
  constructor(private readonly funcionario: FuncionarioService) {}

  @Get('agenda')
  agenda(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() query: AgendaQueryDto,
  ) {
    return this.funcionario.agenda(this.profissionalId(usuario), query.data);
  }

  @Get('comissoes')
  comissoes(@CurrentUser() usuario: AuthenticatedUser) {
    return this.funcionario.comissoes(this.profissionalId(usuario));
  }

  @Get('repasses')
  repasses(@CurrentUser() usuario: AuthenticatedUser) {
    return this.funcionario.repasses(this.profissionalId(usuario));
  }

  private profissionalId(usuario: AuthenticatedUser): string {
    if (!usuario.profissionalId) {
      throw new ForbiddenException('Usuário sem profissional vinculado.');
    }
    return usuario.profissionalId;
  }
}
