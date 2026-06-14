"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Switch } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { CONFIG_PADRAO, type ConfigAgendamento } from "@/lib/settings";

// Cada opção vira uma linha com título + explicação do efeito no fluxo do cliente.
function Opcao({
  titulo,
  descricao,
  checked,
  onChange,
}: {
  titulo: string;
  descricao: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="opt-row">
      <div>
        <div className="opt-row__title">{titulo}</div>
        <p className="opt-row__desc">{descricao}</p>
      </div>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export default function Configuracoes() {
  const [cfg, setCfg] = useState<ConfigAgendamento>(CONFIG_PADRAO);
  const [salvo, setSalvo] = useState(false);

  const set = (chave: keyof ConfigAgendamento) => (valor: boolean) => {
    setCfg((atual) => ({ ...atual, [chave]: valor }));
    setSalvo(false);
  };

  // Reaproveita a config para abrir o fluxo do cliente já no modo escolhido.
  const previewHref =
    `/agendar?profissional=${cfg.clienteEscolheProfissional ? 1 : 0}` +
    `&servico=${cfg.clienteEscolheServico ? 1 : 0}`;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">Como o cliente agenda pelo link</p>
        </div>
      </div>

      <Card
        title="Agendamento online"
        footer={
          <div className="row-between">
            <Link href={previewHref} target="_blank" className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="arrowRight" size={15} /> Pré-visualizar o fluxo do cliente
            </Link>
            <Button variant="accent" size="sm" iconLeft={<Icon name="check" size={16} />} onClick={() => setSalvo(true)}>
              {salvo ? "Salvo" : "Salvar"}
            </Button>
          </div>
        }
      >
        <div className="stack-sm">
          <Opcao
            titulo="Cliente escolhe o profissional"
            descricao="Ligado, o cliente seleciona quem vai cortar. Desligado, agenda no primeiro disponível e a barbearia distribui."
            checked={cfg.clienteEscolheProfissional}
            onChange={set("clienteEscolheProfissional")}
          />
          <Opcao
            titulo="Cliente escolhe o serviço antes do horário"
            descricao="Ligado, o cliente define o serviço (e vê o preço) antes de marcar. Desligado, ele só reserva o horário e o serviço é definido no balcão."
            checked={cfg.clienteEscolheServico}
            onChange={set("clienteEscolheServico")}
          />
        </div>
      </Card>
    </div>
  );
}
