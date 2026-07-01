// Força mínima de senha: >= 8 caracteres, com ao menos uma letra e um número.
// Política deliberadamente simples (ajustável); o limite superior fica no @MaxLength do DTO.
export const SENHA_FORTE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const SENHA_FORTE_MSG =
  'senha deve ter ao menos 8 caracteres, incluindo letra e número';
