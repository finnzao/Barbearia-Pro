import { IsOptional, IsUUID, Matches } from 'class-validator';

export class HorariosQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve ser YYYY-MM-DD' })
  data!: string;

  @IsUUID()
  servicoId!: string;

  @IsOptional()
  @IsUUID()
  profissionalId?: string;
}
