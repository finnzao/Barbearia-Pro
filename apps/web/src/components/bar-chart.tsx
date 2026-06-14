// Gráfico de barras simples em CSS, alinhado aos tokens do DS.
// Destaca opcionalmente a maior barra (pico) e a menor (baixa).
const ALTURA_MAX = 150;

export interface BarraDado {
  label: string;
  value: number;
}

export function BarChart({
  data,
  unidade = "",
  accentMax = true,
  markMin = false,
}: {
  data: BarraDado[];
  unidade?: string;
  accentMax?: boolean;
  markMin?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const idxMax = data.reduce((mi, d, i) => (d.value > data[mi].value ? i : mi), 0);
  const idxMin = data.reduce((mi, d, i) => (d.value < data[mi].value ? i : mi), 0);

  return (
    <div className="barchart">
      {data.map((d, i) => {
        const ehMax = accentMax && i === idxMax;
        const ehMin = markMin && i === idxMin;
        const altura = Math.max(4, Math.round((d.value / max) * ALTURA_MAX));
        const cls = ehMax ? "barcol__bar barcol__bar--max" : ehMin ? "barcol__bar barcol__bar--min" : "barcol__bar";
        return (
          <div key={d.label} className="barcol">
            <span className="barcol__val">{d.value}{unidade}</span>
            <div className={cls} style={{ height: altura }} />
            <span className="barcol__label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
