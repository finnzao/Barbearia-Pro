import { profissionais } from "@/lib/mock-data";

export type FrequenciaRepasse = "semanal" | "quinzenal" | "mensal";
export type OrigemRepasse = "automatico" | "manual";
export type StatusRepasse = "pendente" | "pago" | "estornado";

export interface ConfigRepasse {
  automatico: boolean;
  frequencia: FrequenciaRepasse;
  dia: number;
}

export interface PendenciaRepasse {
  profissionalId: string;
  profissional: string;
  valor: number;
}

export interface Repasse {
  id: string;
  profissionalId: string;
  profissional: string;
  periodoInicio: string;
  periodoFim: string;
  valor: number;
  origem: OrigemRepasse;
  status: StatusRepasse;
  data: string;
}

export const CONFIG_REPASSE_PADRAO: ConfigRepasse = {
  automatico: true,
  frequencia: "mensal",
  dia: 5,
};

const CHAVE = "naregua:config-repasse";

export function lerRepasse(): ConfigRepasse {
  if (typeof window === "undefined") return CONFIG_REPASSE_PADRAO;
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) return CONFIG_REPASSE_PADRAO;
    return { ...CONFIG_REPASSE_PADRAO, ...JSON.parse(cru) };
  } catch {
    return CONFIG_REPASSE_PADRAO;
  }
}

export function salvarRepasse(cfg: ConfigRepasse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, JSON.stringify(cfg));
}

const PENDENCIA_MOCK: Record<string, number> = {
  p1: 840,
  p2: 612,
  p3: 455,
};

export function pendenciasRepasse(): PendenciaRepasse[] {
  return profissionais.map((p) => ({
    profissionalId: p.id,
    profissional: p.nome,
    valor: PENDENCIA_MOCK[p.id] ?? 0,
  }));
}

export const repassesAnteriores: Repasse[] = [
  {
    id: "rp-202605-p1",
    profissionalId: "p1",
    profissional: "Téo Andrade",
    periodoInicio: "2026-05-01",
    periodoFim: "2026-05-31",
    valor: 3120,
    origem: "automatico",
    status: "pago",
    data: "2026-06-05",
  },
  {
    id: "rp-202605-p2",
    profissionalId: "p2",
    profissional: "Rafael Lima",
    periodoInicio: "2026-05-01",
    periodoFim: "2026-05-31",
    valor: 2480,
    origem: "automatico",
    status: "pago",
    data: "2026-06-05",
  },
  {
    id: "rp-saida-p3",
    profissionalId: "p3",
    profissional: "Bruno Souza",
    periodoInicio: "2026-06-01",
    periodoFim: "2026-06-10",
    valor: 690,
    origem: "manual",
    status: "pago",
    data: "2026-06-10",
  },
];
