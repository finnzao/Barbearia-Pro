"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, ListItem, Modal, Money, Select, Switch, Tabs } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { pct } from "@/lib/format";
import { agendamentos, comissoesPorPeriodo, profissionais } from "@/lib/mock-data";
import { CHAVES_PIX, gradeQr, pixEstatico } from "@/lib/pix";
import {
  CONFIG_REPASSE_PADRAO,
  lerRepasse,
  pendenciasRepasse,
  repassesAnteriores,
  salvarRepasse,
  type ConfigRepasse,
  type FrequenciaRepasse,
  type OrigemRepasse,
  type Repasse,
  type StatusRepasse,
} from "@/lib/repasse";

type Periodo = "dia" | "semana" | "mes";
type Metodo = "pix_dinamico" | "pix_estatico" | "dinheiro" | "cartao";

const ABAS = [
  { id: "pagamentos", label: "Pagamentos" },
  { id: "comissoes", label: "Comissões" },
  { id: "repasses", label: "Repasses" },
];

const ABAS_PERIODO = [
  { id: "dia", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

const FREQUENCIAS = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
];

const DIAS_SEMANA = [
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

const DIAS_MES = Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

const metodoLabel: Record<Metodo, string> = {
  pix_dinamico: "Pix dinâmico",
  pix_estatico: "Pix fixo",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

const origemLabel: Record<OrigemRepasse, string> = {
  automatico: "Automático",
  manual: "Manual",
};

const statusRepasseLabel: Record<StatusRepasse, string> = {
  pendente: "Pendente",
  pago: "Pago",
  estornado: "Estornado",
};

const statusRepasseTom: Record<StatusRepasse, "concluido" | "pendente" | "cancelado"> = {
  pendente: "pendente",
  pago: "concluido",
  estornado: "cancelado",
};

const hojeISO = () => new Date().toISOString().slice(0, 10);

function rotuloPeriodo(r: Repasse): string {
  const ini = new Date(`${r.periodoInicio}T00:00:00`);
  const fim = new Date(`${r.periodoFim}T00:00:00`);
  const mes = fim.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  if (r.periodoInicio === r.periodoFim) return `${fim.getDate()} ${mes}`;
  return `${ini.getDate()}–${fim.getDate()} ${mes}`;
}

function extrato() {
  const metodos: Metodo[] = ["pix_dinamico", "pix_estatico", "dinheiro", "cartao"];
  return agendamentos
    .filter((a) => a.status === "concluido")
    .map((a, i) => ({
      id: `pg-${a.id}`,
      hora: a.hora,
      profissional: a.profissional,
      servico: a.servico,
      valor: a.preco,
      metodo: metodos[i % metodos.length],
    }));
}

export default function Pagamentos() {
  const [aba, setAba] = useState("pagamentos");
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [pixDe, setPixDe] = useState<{ nome: string; chave: string } | null>(null);

  const [cfg, setCfg] = useState<ConfigRepasse>(CONFIG_REPASSE_PADRAO);
  const [repassados, setRepassados] = useState<Set<string>>(new Set());
  const [feitos, setFeitos] = useState<Repasse[]>([]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#comissoes") setAba("comissoes");
    else if (hash === "#repasses") setAba("repasses");
    setCfg(lerRepasse());
  }, []);

  const ajustarCfg = (patch: Partial<ConfigRepasse>) => {
    setCfg((atual) => {
      const proximo = { ...atual, ...patch };
      salvarRepasse(proximo);
      return proximo;
    });
  };

  const mudarFrequencia = (frequencia: FrequenciaRepasse) =>
    ajustarCfg({ frequencia, dia: frequencia === "mensal" ? 5 : 1 });

  const linhas = useMemo(() => extrato(), []);
  const totalRecebido = linhas.reduce((s, l) => s + l.valor, 0);
  const comissoes = useMemo(() => comissoesPorPeriodo(periodo), [periodo]);
  const totalComissao = comissoes.reduce((s, c) => s + c.comissao, 0);

  const pendencias = pendenciasRepasse().filter((p) => p.valor > 0 && !repassados.has(p.profissionalId));
  const totalPendente = pendencias.reduce((s, p) => s + p.valor, 0);
  const historico = [...feitos, ...repassesAnteriores];

  const criarRepasse = (profissionalId: string, profissional: string, valor: number): Repasse => ({
    id: `rp-${profissionalId}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    profissionalId,
    profissional,
    periodoInicio: hojeISO(),
    periodoFim: hojeISO(),
    valor,
    origem: "manual",
    status: "pago",
    data: hojeISO(),
  });

  const repassar = (p: { profissionalId: string; profissional: string; valor: number }) => {
    setFeitos((f) => [criarRepasse(p.profissionalId, p.profissional, p.valor), ...f]);
    setRepassados((r) => new Set(r).add(p.profissionalId));
  };

  const repassarTodos = () => {
    const novos = pendencias.map((p) => criarRepasse(p.profissionalId, p.profissional, p.valor));
    setFeitos((f) => [...novos, ...f]);
    setRepassados((r) => {
      const n = new Set(r);
      pendencias.forEach((p) => n.add(p.profissionalId));
      return n;
    });
  };

  const nomeDia = DIAS_SEMANA.find((d) => Number(d.value) === cfg.dia)?.label ?? "";
  const resumoCfg = !cfg.automatico
    ? "Automático desligado — os repasses só acontecem quando você dispara."
    : cfg.frequencia === "mensal"
      ? `Todo dia ${cfg.dia} de cada mês.`
      : cfg.frequencia === "semanal"
        ? `Toda ${nomeDia}.`
        : `A cada quinzena, ${nomeDia}.`;

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Pagamentos</h1>
          <p className="page-sub">Recebimentos e repasse da equipe</p>
        </div>
        <Tabs items={ABAS} value={aba} onChange={setAba} />
      </div>

      {aba === "pagamentos" && (
        <>
          <Card title="Pix fixo da equipe" action={<span className="muted">toque para ver o QR</span>}>
            <div>
              {profissionais.map((p) => {
                const chave = CHAVES_PIX[p.id];
                return (
                  <ListItem
                    key={p.id}
                    leading={<Avatar name={p.nome} size="sm" />}
                    title={p.nome}
                    subtitle={chave ?? "Sem chave cadastrada"}
                    trailing={<Icon name="qr" size={20} />}
                    onClick={chave ? () => setPixDe({ nome: p.nome, chave }) : undefined}
                    divided
                  />
                );
              })}
            </div>
          </Card>

          <Card title="Recebimentos de hoje" action={<Money value={totalRecebido} size="sm" />}>
            <div>
              {linhas.map((l) => (
                <ListItem
                  key={l.id}
                  time={l.hora}
                  leading={<Avatar name={l.profissional} size="sm" />}
                  title={l.servico}
                  subtitle={`${l.profissional} · ${metodoLabel[l.metodo]}`}
                  trailing={
                    <>
                      <Money value={l.valor} size="sm" />
                      <Badge status="concluido" size="sm">Pago</Badge>
                    </>
                  }
                  divided
                />
              ))}
            </div>
          </Card>
        </>
      )}

      {aba === "comissoes" && (
        <Card
          title="A pagar"
          action={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Tabs items={ABAS_PERIODO} value={periodo} onChange={(id) => setPeriodo(id as Periodo)} />
              <Money value={totalComissao} size="md" />
            </div>
          }
          footer={<span className="muted">A baixa lança a comissão a cada Pix recebido.</span>}
        >
          <div>
            {comissoes.map((c) => (
              <ListItem
                key={c.profissionalId}
                leading={<Avatar name={c.profissional} />}
                title={c.profissional}
                subtitle={`${c.atendimentos} atendimentos`}
                trailing={
                  <>
                    <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{pct(c.comissaoPercent)}</span>
                    <Money value={c.comissao} size="sm" />
                  </>
                }
                divided
              />
            ))}
          </div>
        </Card>
      )}

      {aba === "repasses" && (
        <>
          <Card title="Repasse automático" action={<Switch checked={cfg.automatico} onChange={(e) => ajustarCfg({ automatico: e.target.checked })} />}>
            <div className="stack-sm">
              <Select
                label="Frequência"
                options={FREQUENCIAS}
                value={cfg.frequencia}
                disabled={!cfg.automatico}
                onChange={(e) => mudarFrequencia(e.target.value as FrequenciaRepasse)}
              />
              <Select
                label={cfg.frequencia === "mensal" ? "Dia do mês" : "Dia da semana"}
                options={cfg.frequencia === "mensal" ? DIAS_MES : DIAS_SEMANA}
                value={String(cfg.dia)}
                disabled={!cfg.automatico}
                onChange={(e) => ajustarCfg({ dia: Number(e.target.value) })}
              />
              <p className="muted">{resumoCfg}</p>
            </div>
          </Card>

          <Card
            title="A repassar"
            action={
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Money value={totalPendente} size="md" />
                <Button
                  variant="accent"
                  size="sm"
                  disabled={pendencias.length === 0}
                  iconLeft={<Icon name="banknote" size={16} />}
                  onClick={repassarTodos}
                >
                  Repassar todos
                </Button>
              </div>
            }
          >
            {pendencias.length > 0 ? (
              <div>
                {pendencias.map((p) => (
                  <ListItem
                    key={p.profissionalId}
                    leading={<Avatar name={p.profissional} size="sm" />}
                    title={p.profissional}
                    subtitle="Disponível para repasse"
                    trailing={
                      <>
                        <Money value={p.valor} size="sm" />
                        <Button variant="primary" size="sm" onClick={() => repassar(p)}>
                          Repassar
                        </Button>
                      </>
                    }
                    divided
                  />
                ))}
              </div>
            ) : (
              <p className="muted">Tudo repassado por aqui.</p>
            )}
          </Card>

          <Card title="Histórico de repasses">
            <div>
              {historico.map((r) => (
                <ListItem
                  key={r.id}
                  leading={<Avatar name={r.profissional} size="sm" />}
                  title={r.profissional}
                  subtitle={`${origemLabel[r.origem]} · ${rotuloPeriodo(r)}`}
                  trailing={
                    <>
                      <Money value={r.valor} size="sm" />
                      <Badge status={statusRepasseTom[r.status]} size="sm">{statusRepasseLabel[r.status]}</Badge>
                    </>
                  }
                  divided
                />
              ))}
            </div>
          </Card>
        </>
      )}

      <Modal open={!!pixDe} onClose={() => setPixDe(null)} title={pixDe ? `Pix fixo · ${pixDe.nome}` : ""}>
        {pixDe && <PixFixo nome={pixDe.nome} chave={pixDe.chave} />}
      </Modal>
    </div>
  );
}

function PixFixo({ nome, chave }: { nome: string; chave: string }) {
  const [copiado, setCopiado] = useState(false);
  const codigo = pixEstatico(chave);
  const grade = useMemo(() => gradeQr(codigo), [codigo]);

  const copiar = async () => {
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
  };

  return (
    <div className="cobranca">
      <div className="cobranca__resumo">
        <span>{nome}</span>
        <span className="muted">{chave}</span>
      </div>
      <svg className="cobranca__qr" viewBox={`0 0 ${grade.length} ${grade.length}`} role="img" aria-label="QR do Pix fixo">
        {grade.map((linha, y) => linha.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
      </svg>
      <button className="cobranca__cc" onClick={copiar}>
        <span className="cobranca__cc-code">{codigo}</span>
        <span className="cobranca__cc-act">
          <Icon name={copiado ? "check" : "copy"} size={16} /> {copiado ? "Copiado" : "Copiar"}
        </span>
      </button>
    </div>
  );
}
