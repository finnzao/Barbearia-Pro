import { Avatar, Badge, Button, Card, ListItem } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { pct } from "@/lib/format";
import { profissionais } from "@/lib/mock-data";

export default function Profissionais() {
  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Profissionais</h1>
          <p className="page-sub">{profissionais.length} na equipe</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />}>Adicionar</Button>
      </div>

      <Card>
        <div>
          {profissionais.map((p) => (
            <ListItem
              key={p.id}
              leading={<Avatar name={p.nome} status="online" />}
              title={p.nome}
              subtitle={`Comissão ${pct(p.comissaoPercent)}`}
              trailing={<Badge tone="neutral" size="sm">Ativo</Badge>}
              divided
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
