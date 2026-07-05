import { IsBoolean, IsOptional } from 'class-validator';

// Só o essencial editável depois de criado: nome/preço/itens exigiriam
// recalcular assinaturas ativas, então ficam fixos — trocar de plano é criar
// um novo e migrar os assinantes.
export class AtualizarPlanoDto {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
