"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Switch } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { Bloqueios } from "@/components/bloqueios";
import { HorarioFuncionamento } from "@/components/horario-funcionamento";
import { getConfigAgendamento, salvarConfigAgendamento } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CONFIG_PADRAO, type ConfigAgendamento } from "@/lib/settings";

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
  const { usuario } = useAuth();
  const slug = usuario?.barbeariaSlug ?? null;

  useEffect(() => {
    getConfigAgendamento()
      .then(setCfg)
      .catch(() => setCfg(CONFIG_PADRAO));
  }, []);

  const set = (chave: keyof ConfigAgendamento) => (valor: boolean) => {
    setCfg((atual) => ({ ...atual, [chave]: valor }));
    setSalvo(false);
  };

  const salvar = async () => {
    await salvarConfigAgendamento(cfg);
    setSalvo(true);
  };

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
            Este é o link de agendamento da sua barbearia. Compartilhe no WhatsApp, na
            bio do Instagram ou onde seus clientes estiverem.
          </p>
          {slug ? (
            <div className="row-between">
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                /agendar/{slug}
              </code>
              <Link
                href={`/agendar/${slug}`}
                target="_blank"
                className="nr-btn nr-btn--secondary nr-btn--sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="arrowRight" size={15} /> Abrir link
              </Link>
            </div>
          ) : (
            <p className="muted">Entre novamente para carregar o link.</p>
          )}
        </div>
      </Card>

      <Card title="Horário de funcionamento">
        <div className="stack-sm">
          <p className="muted">Defina os dias e faixas de atendimento. Dia desligado fica fechado para agendamento.</p>
          <HorarioFuncionamento />
        </div>
      </Card>

      <Card title="Férias, folgas e bloqueios">
        <div className="stack-sm">
          <p className="muted">
            Períodos em que ninguém pode ser agendado. Some ao horário de
            funcionamento: o cliente deixa de ver esses horários no link.
          </p>
          <Bloqueios />
        </div>
      </Card>
    </div>
  );
}
