"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Input, ListItem, Modal, Money, Select } from "@/ds/components";
import { Icon } from "@/ds/icons";
import {
  GRADE_DIA,
  agendamentosDoDia,
  profissionais,
  servicos,
  totalAgendamentosDoDia,
} from "@/lib/mock-data";
import { METODO_PAGAMENTO_LABEL, METODOS_PAGAMENTO } from "@/lib/pagamento";
import type { Agendamento, MetodoPagamento, StatusAgendamento } from "@/lib/types";

const CAPACIDADE = 16;
const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const railPorStatus: Record<string, string> = {
  concluido: "var(--green-line)",
  confirmado: "var(--blue-line)",
  pendente: "var(--amber-line)",
  cancelado: "var(--red-line)",
};

const STATUS: { value: StatusAgendamento; label: string }[] = [
  { value: "confirmado", label: "Confirmado" },
  { value: "pendente", label: "Pendente" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const FORM_VAZIO = {
  hora: "",
  cliente: "",
  servicoId: "",
  profissionalId: "",
  status: "confirmado" as StatusAgendamento,
  formaPagamento: "" as "" | MetodoPagamento,
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const primeiroNome = (nome: string) => nome.split(" ")[0];

interface DataRef {
  ano: number;
  mes: number;
  dia: number;
}

// Mês/dia de referência usados no render do servidor (sexta, 13 jun 2026).
// A data real do usuário é aplicada no cliente, após a montagem.
const HOJE_PADRAO: DataRef = { ano: 2026, mes: 5, dia: 13 };

const chaveDe = (a: number, m: number, d: number) => `${a}-${m}-${d}`;

export default function Agenda() {
  // Referência estável para o render do servidor (evita divergência de hidratação);
  // a data real entra após a montagem, abaixo.
  const [ano, setAno] = useState(HOJE_PADRAO.ano);
  const [mes, setMes] = useState(HOJE_PADRAO.mes);
  const [dia, setDia] = useState(HOJE_PADRAO.dia);
  const [hoje, setHoje] = useState<DataRef | null>(null);
  const [extras, setExtras] = useState<Record<string, Agendamento[]>>({});
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  useEffect(() => {
    const d = new Date();
    const real: DataRef = { ano: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
    setHoje(real);
    setAno(real.ano);
    setMes(real.mes);
    setDia(real.dia);
  }, []);

  const chaveSel = chaveDe(ano, mes, dia);
  const diaFechado = new Date(ano, mes, dia).getDay() === 0;

  // Estrutura do mês memoizada: só recalcula quando muda mês, dia, hoje ou os
  // agendamentos adicionados — e não a cada tecla digitada no modal.
  const celulas = useMemo(() => {
    const primeiroDow = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const vazias = Array.from({ length: primeiroDow }, () => null);
    const dias = Array.from({ length: totalDias }, (_, i) => {
      const d = i + 1;
      const data = new Date(ano, mes, d);
      const fechado = data.getDay() === 0;
      const count = totalAgendamentosDoDia(ano, mes, d) + (extras[chaveDe(ano, mes, d)]?.length ?? 0);
      const ehHoje = !!hoje && d === hoje.dia && mes === hoje.mes && ano === hoje.ano;
      return { d, fechado, count, ehHoje };
    });
    return [...vazias, ...dias] as (null | { d: number; fechado: boolean; count: number; ehHoje: boolean })[];
  }, [ano, mes, hoje, extras]);

  // Agendamentos do dia selecionado (gerados + adicionados na sessão), por hora.
  const agendamentosSel = useMemo(() => {
    const base = agendamentosDoDia(ano, mes, dia);
    const adicionados = extras[chaveSel] ?? [];
    return [...base, ...adicionados].sort((a, b) => a.hora.localeCompare(b.hora));
  }, [ano, mes, dia, extras, chaveSel]);

  const porHora = useMemo(() => {
    const mapa = new Map<string, Agendamento>();
    agendamentosSel.forEach((a) => mapa.set(a.hora, a));
    return mapa;
  }, [agendamentosSel]);

  const livres = GRADE_DIA.filter((h) => !porHora.has(h));
  const faturadoDia = agendamentosSel
    .filter((a) => a.status !== "cancelado")
    .reduce((s, a) => s + a.preco, 0);

  const mesLabel = capitalizar(
    new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  );
  const rotuloDia = capitalizar(
    new Date(ano, mes, dia).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
  );

  const irMes = (delta: number) => {
    const base = hoje ?? HOJE_PADRAO;
    const ref = new Date(ano, mes + delta, 1);
    const a = ref.getFullYear();
    const m = ref.getMonth();
    setAno(a);
    setMes(m);
    if (a === base.ano && m === base.mes) {
      setDia(base.dia);
    } else {
      let d = 1;
      while (new Date(a, m, d).getDay() === 0) d += 1; // pula domingo (fechado)
      setDia(d);
    }
  };

  const abrirNovo = (horaPre = "") => {
    setForm({ ...FORM_VAZIO, hora: horaPre });
    setAberto(true);
  };
  const fechar = () => {
    setAberto(false);
    setForm(FORM_VAZIO);
  };

  const exigeForma = form.status === "concluido";
  const valido =
    form.hora !== "" &&
    form.cliente.trim() !== "" &&
    form.servicoId !== "" &&
    form.profissionalId !== "" &&
    (!exigeForma || form.formaPagamento !== "");

  const salvar = () => {
    if (!valido) return;
    const servico = servicos.find((s) => s.id === form.servicoId)!;
    const prof = profissionais.find((p) => p.id === form.profissionalId)!;
    const novo: Agendamento = {
      id: crypto.randomUUID(),
      hora: form.hora,
      cliente: form.cliente.trim(),
      servico: servico.nome,
      profissionalId: prof.id,
      profissional: prof.apelido,
      preco: servico.preco,
      status: form.status,
      formaPagamento: exigeForma && form.formaPagamento ? form.formaPagamento : undefined,
    };
    setExtras((atual) => ({ ...atual, [chaveSel]: [...(atual[chaveSel] ?? []), novo] }));
    fechar();
  };

  // Horários oferecidos no modal: livres + (se editando hora pré-escolhida) ela mesma.
  const opcoesHora = (form.hora && !livres.includes(form.hora) ? [form.hora, ...livres] : livres).map(
    (h) => ({ value: h, label: h }),
  );

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-sub">Toque em um dia para ver os agendamentos, serviços e horários.</p>
        </div>
        <Button
          variant="primary"
          iconLeft={<Icon name="plus" size={18} />}
          disabled={diaFechado}
          onClick={() => abrirNovo()}
        >
          Novo agendamento
        </Button>
      </div>

      <Card
        title={mesLabel}
        action={
          <div className="cal-nav">
            <button type="button" className="cal-nav__btn" aria-label="Mês anterior" onClick={() => irMes(-1)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="cal-nav__btn" aria-label="Próximo mês" onClick={() => irMes(1)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        }
      >
        <div className="cal">
          {DOW.map((d) => (
            <div key={d} className="cal__dow">{d}</div>
          ))}
          {celulas.map((cel, i) => {
            if (cel === null) return <div key={`e${i}`} className="cal__cell cal__cell--empty" aria-hidden="true" />;
            const { d, fechado, count, ehHoje } = cel;
            const sel = d === dia;
            const cls = [
              "cal__cell",
              fechado ? "cal__cell--closed" : "",
              ehHoje ? "cal__cell--today" : "",
              sel && !fechado ? "cal__cell--on" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={d}
                role="button"
                tabIndex={fechado ? -1 : 0}
                aria-pressed={sel}
                aria-disabled={fechado}
                className={cls}
                onClick={() => !fechado && setDia(d)}
                onKeyDown={(e) => {
                  if (!fechado && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setDia(d);
                  }
                }}
              >
                <span className="cal__dd">{d}</span>
                {fechado ? (
                  <span className="cal__count">Fechado</span>
                ) : (
                  <>
                    <span className="cal__count">{count > 0 ? `${count} ag.` : "Livre"}</span>
                    <span className="cal__bar">
                      <span style={{ width: `${Math.min(100, Math.round((count / CAPACIDADE) * 100))}%` }} />
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {diaFechado ? (
        <Card title={rotuloDia}>
          <p className="muted">A barbearia não atende aos domingos. Escolha outro dia no calendário.</p>
        </Card>
      ) : (
        <>
          <Card
            title={rotuloDia}
            action={
              <span className="muted">
                {agendamentosSel.length} {agendamentosSel.length === 1 ? "agendamento" : "agendamentos"}
              </span>
            }
            footer={
              agendamentosSel.length > 0 ? (
                <span className="muted">
                  Previsto para o dia: <Money value={faturadoDia} size="sm" />
                </span>
              ) : undefined
            }
          >
            {agendamentosSel.length === 0 ? (
              <p className="muted">Nenhum agendamento neste dia. Use um horário livre abaixo para marcar.</p>
            ) : (
              <div>
                {agendamentosSel.map((a) => (
                  <ListItem
                    key={a.id}
                    time={a.hora}
                    railColor={railPorStatus[a.status]}
                    leading={<Avatar name={a.cliente} size="sm" />}
                    title={a.cliente}
                    subtitle={
                      a.formaPagamento
                        ? `${a.servico} · ${a.profissional} · ${METODO_PAGAMENTO_LABEL[a.formaPagamento]}`
                        : `${a.servico} · ${a.profissional}`
                    }
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
            )}
          </Card>

          <Card
            title="Horários do dia"
            action={<span className="muted">{livres.length} livres de {GRADE_DIA.length}</span>}
          >
            <div className="dayslots">
              {GRADE_DIA.map((h) => {
                const ag = porHora.get(h);
                if (ag) {
                  return (
                    <div
                      key={h}
                      className="dayslot dayslot--rich dayslot--taken"
                      title={`${ag.hora} · ${ag.cliente} · ${ag.servico}`}
                    >
                      <span>{h}</span>
                      <span className="dayslot__nome">{primeiroNome(ag.cliente)}</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={h}
                    type="button"
                    className="dayslot dayslot--rich dayslot--free"
                    onClick={() => abrirNovo(h)}
                    title={`Marcar às ${h}`}
                  >
                    <span>{h}</span>
                    <span className="dayslot__nome">livre</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Modal
        open={aberto}
        onClose={fechar}
        title="Novo agendamento"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
            <Button variant="accent" size="sm" disabled={!valido} onClick={salvar}>Agendar</Button>
          </>
        }
      >
        <p className="muted" style={{ marginBottom: "var(--sp-2)" }}>{rotuloDia}</p>
        <Input
          label="Cliente"
          required
          placeholder="Nome do cliente"
          value={form.cliente}
          onChange={(e) => setForm({ ...form, cliente: e.target.value })}
        />
        <Select
          label="Horário"
          required
          placeholder="Selecione um horário livre"
          options={opcoesHora}
          value={form.hora}
          onChange={(e) => setForm({ ...form, hora: e.target.value })}
        />
        <Select
          label="Serviço"
          required
          placeholder="Selecione o serviço"
          options={servicos.map((s) => ({ value: s.id, label: s.nome }))}
          value={form.servicoId}
          onChange={(e) => setForm({ ...form, servicoId: e.target.value })}
        />
        <Select
          label="Profissional"
          required
          placeholder="Selecione o profissional"
          options={profissionais.map((p) => ({ value: p.id, label: p.nome }))}
          value={form.profissionalId}
          onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}
        />
        <Select
          label="Status"
          options={STATUS}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as StatusAgendamento })}
        />
        {exigeForma && (
          <Select
            label="Forma de pagamento"
            required
            placeholder="Como o cliente pagou"
            hint="Registrada na finalização do atendimento e usada nos relatórios financeiros."
            options={METODOS_PAGAMENTO}
            value={form.formaPagamento}
            onChange={(e) => setForm({ ...form, formaPagamento: e.target.value as MetodoPagamento })}
          />
        )}
      </Modal>
    </div>
  );
}
