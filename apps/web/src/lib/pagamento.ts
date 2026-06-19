import type { MetodoPagamento } from "./types";

// Rótulos legíveis das formas de pagamento, usados na agenda, em pagamentos
// e nos relatórios — fonte única para manter tudo consistente.
export const METODO_PAGAMENTO_LABEL: Record<MetodoPagamento, string> = {
  pix_dinamico: "Pix dinâmico",
  pix_estatico: "Pix fixo",
  dinheiro: "Dinheiro",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
};

export const METODOS_PAGAMENTO: { value: MetodoPagamento; label: string }[] = (
  Object.keys(METODO_PAGAMENTO_LABEL) as MetodoPagamento[]
).map((m) => ({ value: m, label: METODO_PAGAMENTO_LABEL[m] }));

// Dinheiro e cartão entram pelo balcão: a baixa é registrada à mão.
// Pix (dinâmico ou fixo) é confirmado automaticamente pelo recebimento.
export const exigeBaixaManual = (m: MetodoPagamento): boolean =>
  m === "dinheiro" || m === "cartao_debito" || m === "cartao_credito";
