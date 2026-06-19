"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Switch } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { HorarioFuncionamento } from "@/components/horario-funcionamento";
import { CONFIG_PADRAO, lerConfigSalva, salvarConfig, type ConfigAgendamento } from "@/lib/settings";

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

  // localStorage só existe no cliente, então hidrata depois da montagem.
  useEffect(() => {
    setCfg(lerConfigSalva());
  }, []);

  const set = (chave: keyof ConfigAgendamento) => (valor: boolean) => {
    setCfg((atual) => ({ ...atual, [chave]: valor }));
    setSalvo(false);
  };

  const salvar = () => {
    salvarConfig(cfg);
    setSalvo(true);
  };

  // Reaproveita a config para abrir o fluxo do cliente já no modo escolhido.
  const previewHref =
    `/agendar?profissional=${cfg.clienteEscolheProfissional ? 1 : 0}` +
    `&servico=${cfg.clienteEscolheServico ? 1 : 0}`;

  return (
    <div className="stack">
      <div className="page-head">
        <h1 className="page-title">Configurações</h1>
        <p className="page-sub">Como a barbearia recebe agendamentos pelo link público.</p>
      </div>

      <Card
        title="Agendamento online"
        action={
          <Button variant="accent" size="sm" iconLeft={<Icon name="check" size={16} />} onClick={salvar}>
            {salvo ? "Salvo" : "Salvar alterações"}
          </Button>
        }
        footer={
          <span className="muted">
            As escolhas valem para todos os clientes que abrirem o link de agendamento.
          </span>
        }
      >
        <div className="stack-sm">
          <p className="muted">
            Controle quanto o cliente decide sozinho. O que ficar desligado é definido pela barbearia no balcão.
          </p>
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

      <Card title="Link do cliente">
        <div className="stack-sm">
          <p className="muted">
            Veja exatamente o que o cliente encontra ao abrir o link, já no modo configurado acima.
          </p>
          <div className="row-between">
            <span className="muted">Abre o fluxo de agendamento em uma nova aba.</span>
            <Link
              href={previewHref}
              target="_blank"
              className="nr-btn nr-btn--secondary nr-btn--sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="arrowRight" size={15} /> Pré-visualizar fluxo
            </Link>
          </div>
        </div>
      </Card>

      <Card title="Horário de funcionamento">
        <div className="stack-sm">
          <p className="muted">Defina os dias e faixas de atendimento. Dia desligado fica fechado para agendamento.</p>
          <HorarioFuncionamento />
        </div>
      </Card>
    </div>
  );
}
