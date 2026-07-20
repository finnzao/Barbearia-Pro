// Validação de nome de pessoa (DRY): reutilizável em qualquer formulário.
// Sem número, mínimo 2 caracteres úteis. Sem lib externa.

const TEM_NUMERO = /\d/;

/** Remove dígitos — usar no onChange pra o campo nunca aceitar número. */
export function semNumeros(v: string): string {
  return v.replace(/\d/g, "");
}

/** Nome válido: ao menos 2 caracteres não-espaço e nenhum dígito. */
export function nomeValido(v: string): boolean {
  return v.trim().length >= 2 && !TEM_NUMERO.test(v);
}
