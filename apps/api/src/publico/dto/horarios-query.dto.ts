import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ProfissionaisQueryDto {
  @IsOptional()
  @IsUUID()
  servicoId?: string;
}

export class HorariosQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve ser YYYY-MM-DD' })
  data!: string;

  // Opcional: ver AgendarPublicoDto.servicoId. Sem serviço a grade usa o passo
  // padrão, já que não há duração para reservar.
  @IsOptional()
  @IsUUID()
  servicoId?: string;

  @IsOptional()
  @IsUUID()
  profissionalId?: string;
}
