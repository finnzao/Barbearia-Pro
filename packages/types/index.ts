// Contrato de tipos compartilhado entre a API e o web (@naregua/types).
// Types-only: uniões de string apagadas no build — importar com `import type`.
// Fonte da verdade dos VALORES continua sendo o schema.prisma (a API valida via
// Prisma/class-validator); aqui ficam os tipos para o front não duplicar, e um
// guard na API garante que os enums do Prisma batem com estas uniões.

export type StatusAgendamento =
  | "pendente"
  | "confirmado"
  | "concluido"
  | "cancelado";

export type OrigemAgendamento = "cliente" | "balcao";

export type MetodoPagamento =
  | "pix_dinamico"
  | "pix_estatico"
  | "dinheiro"
  | "cartao_debito"
  | "cartao_credito";

export type StatusPagamento = "pendente" | "pago" | "expirado" | "estornado";

export type StatusRepasse = "pendente" | "pago" | "estornado";

export type OrigemRepasse = "automatico" | "manual" | "split";

export type ModoRepasse = "imediato" | "periodico" | "manual";

export type FrequenciaRepasse = "semanal" | "quinzenal" | "mensal";

export type PapelUsuario = "dono" | "profissional" | "recepcao";

export type TipoChavePix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

/** Valor monetário em centavos inteiros (RN-02). Nunca float. */
export type Centavos = number;
