import { StatusRepasse } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListarRepassesDto {
  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @IsOptional()
  @IsEnum(StatusRepasse)
  status?: StatusRepasse;
}
