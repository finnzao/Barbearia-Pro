"use client";

import { useEffect, useMemo, useState } from "react";
import { Glyph } from "@/app/painel/glyphs";
import { Avatar, Badge, Btn, Card, Money, Modal, Row, Seg, Select, brl, pct } from "@/app/painel/ui";
import { comissoesDerivadas, pagamentos as pagamentosIniciais, profissionais } from "@/lib/mock-data";
import { METODO_PAGAMENTO_LABEL, exigeBaixaManual } from "@/lib/pagamento";
import { CHAVE_CENTRAL, gradeQr, MARCADOR_PROF, NOME_RECEBEDOR, pixEstaticoBalcao } from "@/lib/pix";
import {
  CONFIG_REPASSE_PADRAO,
  lerRepasse,
  pendenciasRepasse,
  repassesAnteriores,
  salvarRepasse,
  type ConfigRepasse,
  type FrequenciaRepasse,
  type ModoRepasse,
  type OrigemRepasse,
  type Repasse,
  type StatusRepasse,
} from "@/lib/repasse";
import type { ComissaoProfissional, Pagamento, Periodo } from "@/lib/types";

const ABAS = [
  { id: "pagamentos", label: "Recebimentos" },
  { id: "comissoes", label: "Comissões" },
  { id: "repasses", label: "Repasses" },
];
const DESC_ABA: Record<string, string> = {
  pagamentos: "Tudo que entrou hoje e as cobranças de balcão por profissional.",
  comissoes: "Quanto cada profissional ganhou e quanto fica com a barbearia.",
  repasses: "Como e quando a parte de cada um é acertada.",
};
const ABAS_PERIODO = [
  { id: "dia", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];
const MODOS = [
  { value: "imediato", label: "Imediato (split no pagamento)" },
  { value: "periodico", label: "Periódico (calendário)" },
  { value: "manual", label: "Manual (sob demanda)" },
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

const FATOR_PERIODO: Record<Periodo, number> = { dia: 1, semana: 6, mes: 26 };
const origemLabel: Record<OrigemRepasse, string> = { automatico: "Automático", manual: "Manual", split: "Split" };
const statusRepasseLabel: Record<StatusRepasse, string> = { pendente: "Pendente", pago: "Pago", estornado: "Estornado" };
const statusRepasseTom: Record<StatusRepasse, "green" | "amber" | "red"> = { pendente: "amber", pago: "green", estornado: "red" };

const hojeISO = () => new Date().toISOString().slice(0, 10);

function rotuloPeriodo(r: Repasse): string {
  const ini = new Date(`${r.periodoInicio}T00:00:00`);
  const fim = new Date(`${r.periodoFim}T00:00:00`);
  const mes = fim.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  if (r.periodoInicio === r.periodoFim) return `${fim.getDate()} ${mes}`;
  return `${ini.getDate()}–${fim.getDate()} ${mes}`;
}

function comissoesNoPeriodo(pags: Pagamento[], periodo: Periodo): ComissaoProfissional[] {
  const f = FATOR_PERIODO[periodo];
  return comissoesDerivadas(pags).map((c) => {
    const faturado = c.faturado * f;
    const comissao = c.comissao * f;
    return {
      ...c,
      atendimentos: c.atendimentos * f,
      faturado,
      comissao,
      liquidoBarbearia: faturado - comissao,
    };
  });
}

export default function Pagamentos() {
  const [aba, setAba] = useState("pagamentos");
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [pixDe, setPixDe] = useState<{ id: string; nome: string } | null>(null);
  const [pags, setPags] = useState<Pagamento[]>(pagamentosIniciais);
  const [cfg, setCfg] = useState<ConfigRepasse>(CONFIG_REPASSE_PADRAO);
  const [repassados, setRepassados] = useState<Set<string>>(new Set());
  const [feitos, setFeitos] = useState<Repasse[]>([]);
  const [copiado, setCopiado] = useState(false);

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

  const darBaixa = (id: string) =>
    setPags((atual) =>
      atual.map((pg) => (pg.id === id ? { ...pg, status: "pago", pagoEm: new Date().toISOString() } : pg)),
    );

  const recebidosPagos = pags.filter((pg) => pg.status === "pago");
  const totalRecebido = recebidosPagos.reduce((s, pg) => s + pg.valor, 0);
  const aConfirmar = pags.filter((pg) => pg.status !== "pago" && exigeBaixaManual(pg.metodo)).length;

  const comissoes = useMemo(() => comissoesNoPeriodo(pags, periodo), [pags, periodo]);
  const totalFaturado = comissoes.reduce((s, c) => s + c.faturado, 0);
  const totalComissao = comissoes.reduce((s, c) => s + c.comissao, 0);
  const totalLiquido = comissoes.reduce((s, c) => s + c.liquidoBarbearia, 0);

  const pendenciasBrutas = useMemo(() => pendenciasRepasse(cfg.modo, pags), [cfg.modo, pags]);
  const pendencias = pendenciasBrutas.filter((p) => p.liquido > 0 && !repassados.has(p.profissionalId));
  const aReceberDinheiro = pendenciasBrutas.filter((p) => p.liquido < 0);
  const totalPendente = pendencias.reduce((s, p) => s + p.liquido, 0);
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
  const repassar = (p: { profissionalId: string; profissional: string; liquido: number }) => {
    setFeitos((f) => [criarRepasse(p.profissionalId, p.profissional, p.liquido), ...f]);
    setRepassados((r) => new Set(r).add(p.profissionalId));
  };
  const repassarTodos = () => {
    const novos = pendencias.map((p) => criarRepasse(p.profissionalId, p.profissional, p.liquido));
    setFeitos((f) => [...novos, ...f]);
    setRepassados((r) => {
      const n = new Set(r);
      pendencias.forEach((p) => n.add(p.profissionalId));
      return n;
    });
  };

  const nomeDia = DIAS_SEMANA.find((d) => Number(d.value) === cfg.dia)?.label ?? "";
  const resumoCfg =
    cfg.modo === "imediato"
      ? "A cada Pix/cartão recebido, o split já credita a parte do profissional na chave dele — nada acumula."
      : cfg.modo === "manual"
        ? "Os repasses só acontecem quando você dispara, sob demanda."
        : cfg.frequencia === "mensal"
          ? `Automático: todo dia ${cfg.dia} de cada mês.`
          : cfg.frequencia === "semanal"
            ? `Automático: toda ${nomeDia}.`
            : `Automático: a cada quinzena, ${nomeDia}.`;

  return (
    <div className="pn-page">
      <div className="pn-pagehead">
        <h1 className="pn-h1">Pagamentos</h1>
        <p className="pn-sub">Recebimentos, comissões e repasse da equipe.</p>
      </div>

      <Seg items={ABAS} value={aba} onChange={setAba} />
      <p className="pn-note">{DESC_ABA[aba]}</p>

      {aba === "pagamentos" && (
        <>
          <div className="pn-sumstrip">
            <div className="pn-sum">
              <span className="pn-sum__lbl">Recebido hoje</span>
              <div className="pn-sum__num">{brl(totalRecebido)}</div>
            </div>
            <div className="pn-sum">
              <span className="pn-sum__lbl">Pagamentos</span>
              <div className="pn-sum__num">{recebidosPagos.length}</div>
            </div>
            <div className="pn-sum">
              <span className="pn-sum__lbl">A confirmar</span>
              <div className={aConfirmar > 0 ? "pn-sum__num pn-sum__num--accent" : "pn-sum__num"}>{aConfirmar}</div>
            </div>
          </div>

          <Card title="Recebimentos de hoje">
            <div className="pn-list">
              {pags.map((pg) => {
                const pago = pg.status === "pago";
                const pendenteManual = !pago && exigeBaixaManual(pg.metodo);
                return (
                  <Row
                    key={pg.id}
                    leading={<Avatar name={pg.profissional} size="sm" />}
                    title={pg.servico ?? "Avulso (Pix na cadeira)"}
                    subtitle={`${pg.profissional} · ${METODO_PAGAMENTO_LABEL[pg.metodo]}`}
                    trailing={
                      <>
                        <Money value={pg.valor} size="sm" tone={pago ? "ink" : "muted"} />
                        {pago ? (
                          <Badge tone="green">Pago</Badge>
                        ) : pendenteManual ? (
                          <Btn variant="primary" size="sm" iconLeft={<Glyph name="check" size={15} />} onClick={() => darBaixa(pg.id)}>
                            Registrar
                          </Btn>
                        ) : (
                          <Badge tone="amber">Aguardando</Badge>
                        )}
                      </>
                    }
                  />
                );
              })}
            </div>
          </Card>

          <Card title="Pix fixo da equipe" action={<span className="pn-note">toque para ver o QR</span>}>
            <p className="pn-note">
              QR fixo de balcão de cada profissional: conta do salão com o marcador dele embutido, já pronto para o split.
            </p>
            <div className="pn-list">
              {profissionais.map((p) => (
                <Row
                  key={p.id}
                  leading={<Avatar name={p.nome} size="sm" />}
                  title={p.nome}
                  subtitle={`Conta do salão · marcador ${MARCADOR_PROF[p.id] ?? p.id}`}
                  trailing={<Glyph name="pix" size={20} style={{ color: "var(--pn-accent-strong)" }} />}
                  onClick={() => setPixDe({ id: p.id, nome: p.nome })}
                />
              ))}
            </div>
          </Card>
        </>
      )}

      {aba === "comissoes" && (
        <Card
          title="Comissões e líquido"
          action={<Money value={totalComissao} size="md" />}
          footer="Comissão = pagamentos pagos × a taxa congelada de cada um. Líquido da barbearia = faturado − comissões."
        >
          <Seg items={ABAS_PERIODO} value={periodo} onChange={(id) => setPeriodo(id as Periodo)} />
          <div className="pn-sumstrip">
            <div className="pn-sum">
              <span className="pn-sum__lbl">Faturado</span>
              <div className="pn-sum__num">{brl(totalFaturado)}</div>
            </div>
            <div className="pn-sum">
              <span className="pn-sum__lbl">Comissões</span>
              <div className="pn-sum__num">{brl(totalComissao)}</div>
            </div>
            <div className="pn-sum">
              <span className="pn-sum__lbl">Líquido da barbearia</span>
              <div className="pn-sum__num pn-sum__num--accent">{brl(totalLiquido)}</div>
            </div>
          </div>
          <div className="pn-list">
            {comissoes.map((c) => (
              <Row
                key={c.profissionalId}
                leading={<Avatar name={c.profissional} />}
                title={c.profissional}
                subtitle={`${c.atendimentos} atendimentos pagos · faturou ${brl(c.faturado)}`}
                trailing={
                  <>
                    <span className="pn-note">{pct(c.comissaoPercent)}</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      <Money value={c.comissao} size="sm" />
                      <span className="pn-note">líquido salão {brl(c.liquidoBarbearia)}</span>
                    </div>
                  </>
                }
              />
            ))}
          </div>
        </Card>
      )}

      {aba === "repasses" && (
        <>
          <Card title="Modo de repasse">
            <Select
              label="Como a comissão é acertada"
              options={MODOS}
              value={cfg.modo}
              onChange={(e) => ajustarCfg({ modo: e.target.value as ModoRepasse })}
            />
            {cfg.modo === "periodico" && (
              <>
                <Select
                  label="Frequência"
                  options={FREQUENCIAS}
                  value={cfg.frequencia}
                  onChange={(e) => mudarFrequencia(e.target.value as FrequenciaRepasse)}
                />
                <Select
                  label={cfg.frequencia === "mensal" ? "Dia do mês" : "Dia da semana"}
                  options={cfg.frequencia === "mensal" ? DIAS_MES : DIAS_SEMANA}
                  value={String(cfg.dia)}
                  onChange={(e) => ajustarCfg({ dia: Number(e.target.value) })}
                />
              </>
            )}
            <p className="pn-note">{resumoCfg}</p>
          </Card>

          <Card
            title="A repassar"
            action={
              <>
                <Money value={totalPendente} size="md" />
                <Btn variant="accent" size="sm" disabled={pendencias.length === 0} iconLeft={<Glyph name="pagamentos" size={16} />} onClick={repassarTodos}>
                  Repassar todos
                </Btn>
              </>
            }
          >
            {pendencias.length > 0 ? (
              <div className="pn-list">
                {pendencias.map((p) => (
                  <Row
                    key={p.profissionalId}
                    leading={<Avatar name={p.profissional} size="sm" />}
                    title={p.profissional}
                    subtitle="Disponível para repasse"
                    trailing={
                      <>
                        <Money value={p.liquido} size="sm" />
                        <Btn variant="primary" size="sm" onClick={() => repassar(p)}>
                          Repassar
                        </Btn>
                      </>
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="pn-note">
                {cfg.modo === "imediato" ? "No modo imediato o split já creditou tudo." : "Tudo repassado por aqui."}
              </p>
            )}
          </Card>

          {aReceberDinheiro.length > 0 && (
            <Card title="A receber da equipe (dinheiro vivo)" action={<span className="pn-note">compensa no próximo repasse</span>}>
              <div className="pn-list">
                {aReceberDinheiro.map((p) => (
                  <Row
                    key={p.profissionalId}
                    leading={<Avatar name={p.profissional} size="sm" />}
                    title={p.profissional}
                    subtitle="Recebeu em dinheiro — parte do salão a acertar"
                    trailing={
                      <>
                        <Money value={p.liquido} size="sm" tone="debit" />
                        <Badge tone="amber">A receber</Badge>
                      </>
                    }
                  />
                ))}
              </div>
            </Card>
          )}

          <Card title="Histórico de repasses">
            <div className="pn-list">
              {historico.map((r) => (
                <Row
                  key={r.id}
                  leading={<Avatar name={r.profissional} size="sm" />}
                  title={r.profissional}
                  subtitle={`${origemLabel[r.origem]} · ${rotuloPeriodo(r)}`}
                  trailing={
                    <>
                      <Money value={r.valor} size="sm" />
                      <Badge tone={statusRepasseTom[r.status]}>{statusRepasseLabel[r.status]}</Badge>
                    </>
                  }
                />
              ))}
            </div>
          </Card>
        </>
      )}

      <Modal open={!!pixDe} onClose={() => setPixDe(null)} title={pixDe ? `Pix fixo · ${pixDe.nome}` : ""}>
        {pixDe && (
          <div className="pn-pix">
            <div className="pn-pix__resumo">
              <span className="pn-pix__name">{pixDe.nome}</span>
              <span className="pn-pix__meta">{NOME_RECEBEDOR} · {CHAVE_CENTRAL}</span>
              <span className="pn-pix__meta">marcador {MARCADOR_PROF[pixDe.id] ?? pixDe.id}</span>
            </div>
            <PixQr seed={pixEstaticoBalcao(MARCADOR_PROF[pixDe.id] ?? pixDe.id)} />
            <button
              type="button"
              className="pn-copia"
              onClick={async () => {
                await navigator.clipboard.writeText(pixEstaticoBalcao(MARCADOR_PROF[pixDe.id] ?? pixDe.id));
                setCopiado(true);
              }}
            >
              <span className="pn-copia__code">{pixEstaticoBalcao(MARCADOR_PROF[pixDe.id] ?? pixDe.id)}</span>
              <span className="pn-copia__act">
                <Glyph name={copiado ? "check" : "copy"} size={16} />
                {copiado ? "Copiado" : "Copiar"}
              </span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PixQr({ seed }: { seed: string }) {
  const grade = useMemo(() => gradeQr(seed), [seed]);
  return (
    <svg className="pn-qr" viewBox={`0 0 ${grade.length} ${grade.length}`} role="img" aria-label="QR do Pix fixo">
      {grade.map((linha, y) => linha.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}
