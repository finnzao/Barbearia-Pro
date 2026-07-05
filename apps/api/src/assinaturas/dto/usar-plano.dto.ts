import { IsUUID } from 'class-validator';

// Registra que o cliente usou um serviço do plano hoje (walk-in/balcão),
// mesmo padrão do recebimento manual de pagamento: já nasce concluído.
export class UsarPlanoDto {
  @IsUUID()
  servicoId!: string;
}
