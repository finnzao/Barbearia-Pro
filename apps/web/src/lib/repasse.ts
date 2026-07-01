import { pagamentos, profissionais } from "@/lib/mock-data";

export type FrequenciaRepasse = "semanal" | "quinzenal" | "mensal";
export type ModoRepasse = "imediato" | "periodico" | "manual";
export type OrigemRepasse = "automatico" | "manual" | "split";
export type StatusRepasse = "pendente" | "pago" | "estornado";

export interface ConfigRepasse {
  modo: ModoRepasse;
  frequencia: FrequenciaRepasse;
  dia: number;
}

export interface ConfigRepasseRow {
  repasse_modo: ModoRepasse;
  repasse_frequencia: FrequenciaRepasse;
  repasse_dia: number;
}

export interface PendenciaRepasse {
  profissionalId: string;
  profissional: string;
  aPagar: number;
  aReceber: number;
  liquido: number;
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
  modo: "periodico",
  frequencia: "mensal",
  dia: 5,
};

export const CHAVE_REPASSE = "naregua:config-repasse";

export const configRepasseToRow = (cfg: ConfigRepasse): ConfigRepasseRow => ({
  repasse_modo: cfg.modo,
  repasse_frequencia: cfg.frequencia,
  repasse_dia: cfg.dia,
});

export const configRepasseFromRow = (row: ConfigRepasseRow): ConfigRepasse => ({
  modo: row.repasse_modo,
  frequencia: row.repasse_frequencia,
  dia: row.repasse_dia,
});

export function lerRepasse(): ConfigRepasse {
  if (typeof window === "undefined") return CONFIG_REPASSE_PADRAO;
  try {
    const cru = window.localStorage.getItem(CHAVE_REPASSE);
    if (!cru) return CONFIG_REPASSE_PADRAO;
    const obj = JSON.parse(cru);
    if (obj.modo === undefined && typeof obj.automatico === "boolean") {
      return {
        modo: obj.automatico ? "periodico" : "manual",
        frequencia: obj.frequencia ?? "mensal",
        dia: obj.dia ?? 5,
      };
    }
    return { ...CONFIG_REPASSE_PADRAO, ...obj };
  } catch {
    return CONFIG_REPASSE_PADRAO;
  }
}

export function salvarRepasse(cfg: ConfigRepasse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_REPASSE, JSON.stringify(cfg));
}

const parteSalao = (valor: number, percent: number) => valor - Math.round(valor * percent);
const parteProfissional = (valor: number, percent: number) => Math.round(valor * percent);

export function pendenciasRepasse(
  modo: ModoRepasse = "periodico",
  lista = pagamentos,
): PendenciaRepasse[] {
  return profissionais.map((p) => {
    const pagos = lista.filter((pg) => pg.profissionalId === p.id && pg.status === "pago");
    const eletronico = pagos.filter((pg) => pg.metodo !== "dinheiro");
    const dinheiro = pagos.filter((pg) => pg.metodo === "dinheiro");

    const aPagar =
      modo === "imediato"
        ? 0
        : eletronico.reduce((s, pg) => s + parteProfissional(pg.valor, pg.comissaoPercent), 0);

    const aReceber = dinheiro.reduce((s, pg) => s + parteSalao(pg.valor, pg.comissaoPercent), 0);

    return {
      profissionalId: p.id,
      profissional: p.nome,
      aPagar,
      aReceber,
      liquido: aPagar - aReceber,
    };
  });
}

export const repassesAnteriores: Repasse[] = [
  {
    id: "rp-202605-p1",
    profissionalId: "p1",
    profissional: "Téo Andrade",
    periodoInicio: "2026-05-01",
    periodoFim: "2026-05-31",
    valor: 312000,
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
    valor: 248000,
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
    valor: 69000,
    origem: "manual",
    status: "pago",
    data: "2026-06-10",
  },
];
