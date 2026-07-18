import { IsArray, IsUUID } from 'class-validator';

export class DefinirProfissionaisDto {
  // Vazio = qualquer profissional atende este serviço (é o padrão).
  @IsArray()
  @IsUUID(undefined, { each: true })
  profissionalIds!: string[];
}
