import { Button, Card, ListItem, Money } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { servicos } from "@/lib/mock-data";

export default function Servicos() {
  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Serviços</h1>
          <p className="page-sub">{servicos.length} no catálogo</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />}>Novo serviço</Button>
      </div>

      <Card>
        <div>
          {servicos.map((s) => (
            <ListItem
              key={s.id}
              leading={<span style={{ color: "var(--brass-600)" }}><Icon name="scissors" size={20} /></span>}
              title={s.nome}
              subtitle={`${s.duracaoMin} min`}
              trailing={<Money value={s.preco} size="sm" />}
              divided
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
