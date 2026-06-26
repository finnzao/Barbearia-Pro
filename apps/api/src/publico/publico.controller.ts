import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { ConfigService } from '../config/config.service';
import { ClienteAuthService } from './cliente-auth.service';
import { AgendarPublicoDto } from './dto/agendar-publico.dto';
import {
  LoginOtpDto,
  LoginSenhaDto,
  SolicitarOtpDto,
} from './dto/cliente-auth.dto';
import { HorariosQueryDto } from './dto/horarios-query.dto';
import { PublicoService } from './publico.service';

@Public()
@Controller('publico')
export class PublicoController {
  constructor(
    private readonly publico: PublicoService,
    private readonly clienteAuth: ClienteAuthService,
    private readonly config: ConfigService,
  ) {}

  @Get(':slug')
  resumo(@Param('slug') slug: string) {
    return this.publico.resumo(slug);
  }

  @Get(':slug/servicos')
  servicos(@Param('slug') slug: string) {
    return this.publico.servicos(slug);
  }

  @Get(':slug/profissionais')
  profissionais(@Param('slug') slug: string) {
    return this.publico.profissionais(slug);
  }

  @Get(':slug/horarios')
  horarios(@Param('slug') slug: string, @Query() query: HorariosQueryDto) {
    return this.publico.horariosDisponiveis(slug, query);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':slug/agendar')
  agendar(@Param('slug') slug: string, @Body() dto: AgendarPublicoDto) {
    return this.publico.agendar(slug, dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post(':slug/otp')
  async otp(@Param('slug') slug: string, @Body() dto: SolicitarOtpDto) {
    const barbearia = await this.publico.resolverBarbearia(slug);
    const codigo = await this.clienteAuth.solicitarOtp(barbearia, dto.whatsapp);
    return { enviado: true, ...(this.config.producao ? {} : { codigo }) };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post(':slug/login/otp')
  async loginOtp(@Param('slug') slug: string, @Body() dto: LoginOtpDto) {
    const barbearia = await this.publico.resolverBarbearia(slug);
    return this.clienteAuth.loginOtp(barbearia, dto.whatsapp, dto.codigo);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post(':slug/login/senha')
  async loginSenha(@Param('slug') slug: string, @Body() dto: LoginSenhaDto) {
    const barbearia = await this.publico.resolverBarbearia(slug);
    return this.clienteAuth.loginSenha(barbearia, dto.whatsapp, dto.senha);
  }
}
