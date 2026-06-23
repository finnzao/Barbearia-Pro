import type {
  Agendamento,
  ComissaoProfissional,
  Periodo,
  Profissional,
  ResumoHoje,
  Servico,
} from "./types";
import {
  agendamentos,
  comissoesDerivadas,
  pagamentos,
  profissionais,
  resumoHoje,
  servicos,
} from "./mock-data";

// ---------------------------------------------------------------------------
// Esta é a ÚNICA camada que conhece a origem dos dados.
// Enquanto o backend não existe, devolvemos o mock.
//
// Quando a API do Nest estiver pronta, troque cada corpo por algo como:
//
//   const base = process.env.NEXT_PUBLIC_API_URL!;
//   const res = await fetch(`${base}/agendamentos`, { cache: "no-store" });
//   return res.json();
//
// Os componentes que consomem estas funções não precisam mudar.
// ---------------------------------------------------------------------------

const delay = () => new Promise((r) => setTimeout(r, 0));

export async function getResumoHoje(): Promise<ResumoHoje> {
  await delay();
  return resumoHoje();
}

export async function getAgendamentos(): Promise<Agendamento[]> {
  await delay();
  return agendamentos;
}

export async function getComissoes(_periodo: Periodo): Promise<ComissaoProfissional[]> {
  await delay();
  return comissoesDerivadas(pagamentos);
}

export async function getProfissionais(): Promise<Profissional[]> {
  await delay();
  return profissionais;
}

export async function getServicos(): Promise<Servico[]> {
  await delay();
  return servicos;
}
