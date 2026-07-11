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

// Dinheiro, cartão e Pix fixo (chave estática de balcão) entram pelo registro
// manual — o dinheiro já caiu fora do sistema, então nascem pagos. Só o Pix
// dinâmico é gerado como cobrança real e confirmado sozinho pelo webhook.
export const exigeBaixaManual = (m: MetodoPagamento): boolean =>
  m !== "pix_dinamico";
