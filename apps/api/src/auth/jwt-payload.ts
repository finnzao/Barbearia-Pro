import { PapelUsuario } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  barbeariaId: string;
  papel: PapelUsuario;
  profissionalId: string | null;
}
