import type { DiaOcupacao } from "@/lib/types";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function Calendario({
  ano,
  mes,
  ocupacao,
  selecionado,
  hoje,
  onSelect,
}: {
  ano: number;
  mes: number; // 0-based
  ocupacao: DiaOcupacao[];
  selecionado: number | null;
  hoje: number | null;
  onSelect: (dia: number) => void;
}) {
  const primeiroDow = new Date(ano, mes, 1).getDay();
  const blanks = Array.from({ length: primeiroDow });

  return (
    <div>
      <div className="cal">
        {DOW.map((d) => (
          <div key={d} className="cal__dow">{d}</div>
        ))}
        {blanks.map((_, i) => (
          <div key={`b${i}`} className="cal__cell cal__cell--empty" />
        ))}
        {ocupacao.map((o) => {
          const fechado = o.cortes === 0;
          const pct = Math.round((o.cortes / o.capacidade) * 100);
          const cls = [
            "cal__cell",
            fechado && "cal__cell--closed",
            o.dia === hoje && "cal__cell--today",
            o.dia === selecionado && "cal__cell--on",
          ].filter(Boolean).join(" ");
          return (
            <button key={o.dia} className={cls} onClick={() => !fechado && onSelect(o.dia)} disabled={fechado}>
              <span className="cal__dd">{o.dia}</span>
              {fechado ? (
                <span className="cal__count" style={{ marginTop: "auto" }}>Fechado</span>
              ) : (
                <>
                  <div className="cal__bar"><span style={{ width: `${pct}%` }} /></div>
                  <span className="cal__count">{o.cortes}/{o.capacidade}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
