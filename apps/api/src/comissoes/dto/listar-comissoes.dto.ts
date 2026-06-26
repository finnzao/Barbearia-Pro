import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ListarComissoesDto {
  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'de deve estar no formato YYYY-MM-DD',
  })
  de?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'ate deve estar no formato YYYY-MM-DD',
  })
  ate?: string;
}
