import type { StatusAgendamento } from "@/lib/types";

const estilos: Record<StatusAgendamento, string> = {
  confirmado: "bg-amber-100 text-amber-800",
  concluido: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-700",
  pendente: "bg-stone-100 text-stone-600",
};

const rotulos: Record<StatusAgendamento, string> = {
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  pendente: "Pendente",
};

export function StatusBadge({ status }: { status: StatusAgendamento }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estilos[status]}`}
    >
      {rotulos[status]}
    </span>
  );
}
