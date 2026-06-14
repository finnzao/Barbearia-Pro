import { Avatar, Badge, Button, Card, ListItem, Money } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { agendamentos } from "@/lib/mock-data";

const railPorStatus: Record<string, string> = {
  concluido: "var(--green-line)",
  confirmado: "var(--blue-line)",
  pendente: "var(--amber-line)",
  cancelado: "var(--red-line)",
};

export default function Agenda() {
  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-sub">Sexta · 13 jun 2026</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />}>Novo agendamento</Button>
      </div>

      <Card title="Hoje" action={<span className="muted">{agendamentos.length} horários</span>}>
        <div>
          {agendamentos.map((a) => (
            <ListItem
              key={a.id}
              time={a.hora}
              railColor={railPorStatus[a.status]}
              leading={<Avatar name={a.cliente} size="sm" />}
              title={a.cliente}
              subtitle={`${a.servico} · ${a.profissional}`}
              trailing={
                <>
                  <Money value={a.preco} size="sm" tone={a.status === "cancelado" ? "muted" : "default"} />
                  <Badge status={a.status} size="sm" />
                </>
              }
              divided
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
