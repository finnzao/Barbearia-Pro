// Guard de compile-time: garante que os enums gerados pelo Prisma (fonte da
// verdade, a partir do schema.prisma) batem com o contrato compartilhado com o
// web (@naregua/types). Se alguém adicionar um valor no schema e esquecer de
// atualizar @naregua/types (ou vice-versa), o build da API quebra aqui.

import type {
  FrequenciaRepasse as PrismaFrequenciaRepasse,
  MetodoCobranca as PrismaMetodoCobranca,
  MetodoPagamento as PrismaMetodoPagamento,
  ModoRepasse as PrismaModoRepasse,
  OrigemAgendamento as PrismaOrigemAgendamento,
  OrigemRepasse as PrismaOrigemRepasse,
  PapelUsuario as PrismaPapelUsuario,
  StatusAgendamento as PrismaStatusAgendamento,
  StatusAssinaturaCliente as PrismaStatusAssinaturaCliente,
  StatusPagamento as PrismaStatusPagamento,
  StatusRepasse as PrismaStatusRepasse,
  TipoChavePix as PrismaTipoChavePix,
} from '@prisma/client';
import type {
  FrequenciaRepasse,
  MetodoCobranca,
  MetodoPagamento,
  ModoRepasse,
  OrigemAgendamento,
  OrigemRepasse,
  PapelUsuario,
  StatusAgendamento,
  StatusAssinaturaCliente,
  StatusPagamento,
  StatusRepasse,
  TipoChavePix,
} from '@naregua/types';

type Equivalente<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;

// Cada campo só compila se os dois tipos forem exatamente equivalentes.
const _contrato: {
  statusAgendamento: Equivalente<PrismaStatusAgendamento, StatusAgendamento>;
  origemAgendamento: Equivalente<PrismaOrigemAgendamento, OrigemAgendamento>;
  metodoPagamento: Equivalente<PrismaMetodoPagamento, MetodoPagamento>;
  statusPagamento: Equivalente<PrismaStatusPagamento, StatusPagamento>;
  statusRepasse: Equivalente<PrismaStatusRepasse, StatusRepasse>;
  origemRepasse: Equivalente<PrismaOrigemRepasse, OrigemRepasse>;
  modoRepasse: Equivalente<PrismaModoRepasse, ModoRepasse>;
  frequenciaRepasse: Equivalente<PrismaFrequenciaRepasse, FrequenciaRepasse>;
  papelUsuario: Equivalente<PrismaPapelUsuario, PapelUsuario>;
  tipoChavePix: Equivalente<PrismaTipoChavePix, TipoChavePix>;
  metodoCobranca: Equivalente<PrismaMetodoCobranca, MetodoCobranca>;
  statusAssinaturaCliente: Equivalente<
    PrismaStatusAssinaturaCliente,
    StatusAssinaturaCliente
  >;
} = {
  statusAgendamento: true,
  origemAgendamento: true,
  metodoPagamento: true,
  statusPagamento: true,
  statusRepasse: true,
  origemRepasse: true,
  modoRepasse: true,
  frequenciaRepasse: true,
  papelUsuario: true,
  tipoChavePix: true,
  metodoCobranca: true,
  statusAssinaturaCliente: true,
};

void _contrato;
