import { PapelUsuario } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  barbeariaId: string;
  papel: PapelUsuario;
  profissionalId: string | null;
  // O token de cliente (público) é assinado com o mesmo segredo, mas carrega
  // `tipo: 'cliente'` e nenhum `papel` — o JwtAuthGuard de staff o rejeita.
  tipo?: 'cliente';
}
