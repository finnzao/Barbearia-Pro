"use client";

import { useEffect, useState } from "react";
import { Glyph } from "@/app/painel/glyphs";
import { Avatar, Badge, Btn, Card, Money, Modal, Row, Seg, Select, brl, pct } from "@/app/painel/ui";
import {
  criarPagamento,
  criarRepasseApi,
  darBaixaPagamento,
  getComissoes,
  getPagamentos,
  getProfissionais,
  getRepasses,
  getServicos,
  intervaloPeriodo,
  type PagamentoLista,
} from "@/lib/api";
import { useHash, useLocalStorage } from "@/lib/client-hooks";
import { METODO_PAGAMENTO_LABEL, METODOS_PAGAMENTO, exigeBaixaManual } from "@/lib/pagamento";
import {
  CHAVE_REPASSE,
  CONFIG_REPASSE_PADRAO,
  lerRepasse,
  pendenciasRepasse,
  type ConfigRepasse,
  type FrequenciaRepasse,
  type ModoRepasse,
  type OrigemRepasse,
  type Repasse,
  type StatusRepasse,
} from "@/lib/repasse";
import type {
  ComissaoProfissional,
  MetodoPagamento,
  Pagamento,
  Periodo,
  Profissional,
  Servico,
} from "@/lib/types";

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

// Recebimento manual de balcão só vale para dinheiro e cartão — o Pix (dinâmico
// ou fixo) entra sozinho pela cobrança, então não aparece aqui.
const METODOS_RECEBIMENTO = METODOS_PAGAMENTO.filter((m) => exigeBaixaManual(m.value));

const FORM_RECEBIMENTO_VAZIO = {
  profissionalId: "",
  servicoId: "",
  metodo: "" as "" | MetodoPagamento,
};

const origemLabel: Record<OrigemRepasse, string> = { automatico: "Automático", manual: "Manual", split: "Split" };
const statusRepasseLabel: Record<StatusRepasse, string> = { pendente: "Pendente", pago: "Pago", estornado: "Estornado" };
const statusRepasseTom: Record<StatusRepasse, "green" | "amber" | "red"> = { pendente: "amber", pago: "green", estornado: "red" };

function mapPagamento(p: PagamentoLista, profs: Profissional[]): Pagamento {
  return {
    id: p.id,
    profissionalId: p.profissionalId,
    profissional: profs.find((x) => x.id === p.profissionalId)?.apelido ?? "",
    agendamentoId: p.agendamentoId,
    servico: p.servicoNome,
    valor: p.valorCentavos,
    comissaoPercent: Number(p.comissaoPercent),
    metodo: p.metodo,
    status: p.status,
    pagoEm: p.pagoEm,
  };
}

function rotuloPeriodo(r: Repasse): string {
  const ini = new Date(`${r.periodoInicio}T00:00:00`);
  const fim = new Date(`${r.periodoFim}T00:00:00`);
  const mes = fim.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  if (r.periodoInicio === r.periodoFim) return `${fim.getDate()} ${mes}`;
  return `${ini.getDate()}–${fim.getDate()} ${mes}`;
}

export default function Pagamentos() {
  // Aba inicial pode vir do hash (deep-link); o clique do usuário prevalece.
  const hash = useHash();
  const abaDoHash =
    hash === "#comissoes"
      ? "comissoes"
      : hash === "#repasses"
        ? "repasses"
        : null;
  const [abaEscolhida, setAba] = useState<string | null>(null);
  const aba = abaEscolhida ?? abaDoHash ?? "pagamentos";
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [pags, setPags] = useState<Pagamento[]>([]);
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [servs, setServs] = useState<Servico[]>([]);
  const [cfg, setCfg] = useLocalStorage<ConfigRepasse>(
    CHAVE_REPASSE,
    CONFIG_REPASSE_PADRAO,
    lerRepasse,
  );
  const [repassados, setRepassados] = useState<Set<string>>(new Set());
  const [historico, setHistorico] = useState<Repasse[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoProfissional[]>([]);

  // Registro manual de recebimento (dinheiro / cartão).
  const [novoAberto, setNovoAberto] = useState(false);
  const [formReceb, setFormReceb] = useState(FORM_RECEBIMENTO_VAZIO);

  useEffect(() => {
    Promise.all([getProfissionais(), getServicos(), getPagamentos()])
      .then(([ps, ss, pgs]) => {
        setProfs(ps);
        setServs(ss);
        setPags(pgs.map((p) => mapPagamento(p, ps)));
        return getRepasses(ps);
      })
      .then(setHistorico)
      .catch(() => {});
  }, []);

  // Comissões vêm da API real, filtradas pelo período selecionado (dia/semana/mês).
  useEffect(() => {
    const { de, ate } = intervaloPeriodo(periodo);
    getComissoes({ de, ate })
      .then(setComissoes)
      .catch(() => setComissoes([]));
  }, [periodo]);

  const ajustarCfg = (patch: Partial<ConfigRepasse>) => {
    // o setter do useLocalStorage já persiste (mesmo formato do salvarRepasse).
    setCfg({ ...cfg, ...patch });
  };
  const mudarFrequencia = (frequencia: FrequenciaRepasse) =>
    ajustarCfg({ frequencia, dia: frequencia === "mensal" ? 5 : 1 });

  const darBaixa = async (id: string) => {
    const atualizado = await darBaixaPagamento(id);
    setPags((atual) =>
      atual.map((pg) => (pg.id === id ? mapPagamento(atualizado, profs) : pg)),
    );
  };

  // Recebimento de balcão: registra a entrada já como paga (o dinheiro/cartão
  // acabou de acontecer na cadeira). Vai direto para comissões e repasses.
  const servicoReceb = servs.find((s) => s.id === formReceb.servicoId) || null;
  const recebimentoValido =
    formReceb.profissionalId !== "" && formReceb.servicoId !== "" && formReceb.metodo !== "";

  const fecharRecebimento = () => {
    setNovoAberto(false);
    setFormReceb(FORM_RECEBIMENTO_VAZIO);
  };

  const registrarRecebimento = async () => {
    const servico = servs.find((s) => s.id === formReceb.servicoId);
    const prof = profs.find((p) => p.id === formReceb.profissionalId);
    if (!servico || !prof || formReceb.metodo === "") return;
    const criado = await criarPagamento({
      profissionalId: prof.id,
      valorCentavos: servico.preco,
      metodo: formReceb.metodo,
      servicoNome: servico.nome,
      servicoId: servico.id,
    });
    setPags((atual) => [mapPagamento(criado, profs), ...atual]);
    fecharRecebimento();
  };

  const recebidosPagos = pags.filter((pg) => pg.status === "pago");
  const totalRecebido = recebidosPagos.reduce((s, pg) => s + pg.valor, 0);
  const aConfirmar = pags.filter((pg) => pg.status !== "pago" && exigeBaixaManual(pg.metodo)).length;

  const totalFaturado = comissoes.reduce((s, c) => s + c.faturado, 0);
  const totalComissao = comissoes.reduce((s, c) => s + c.comissao, 0);
  const totalLiquido = comissoes.reduce((s, c) => s + c.liquidoBarbearia, 0);

  const pendenciasBrutas = pendenciasRepasse(cfg.modo, pags, profs);
  const pendencias = pendenciasBrutas.filter((p) => p.liquido > 0 && !repassados.has(p.profissionalId));
  const aReceberDinheiro = pendenciasBrutas.filter((p) => p.liquido < 0);
  const totalPendente = pendencias.reduce((s, p) => s + p.liquido, 0);

  // Repassa de verdade (POST /repasses); a UI marca como "feito" na hora,
  // mas a fonte de verdade do histórico é sempre o próximo refetch da API.
  const repassar = async (p: { profissionalId: string; profissional: string; liquido: number }) => {
    // periodoInicio/Fim precisam ser datetime ISO completo — o Prisma rejeita
    // uma data pura ("2026-07-04") num campo DateTime.
    const agora = new Date().toISOString();
    const novo = await criarRepasseApi(
      {
        profissionalId: p.profissionalId,
        periodoInicio: agora,
        periodoFim: agora,
        valorCentavos: p.liquido,
        origem: "manual",
      },
      profs,
    );
    setHistorico((h) => [novo, ...h]);
    setRepassados((r) => new Set(r).add(p.profissionalId));
  };
  const repassarTodos = async () => {
    for (const p of pendencias) {
      await repassar(p);
    }
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

          <Card
            title="Recebimentos de hoje"
            action={
              <Btn variant="accent" size="sm" iconLeft={<Glyph name="novo" size={16} />} onClick={() => setNovoAberto(true)}>
                Novo recebimento
              </Btn>
            }
          >
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

      <Modal
        open={novoAberto}
        onClose={fecharRecebimento}
        title="Novo recebimento"
        footer={
          <>
            <Btn variant="ghost" size="sm" onClick={fecharRecebimento}>
              Cancelar
            </Btn>
            <Btn variant="accent" size="sm" disabled={!recebimentoValido} onClick={registrarRecebimento}>
              Registrar
            </Btn>
          </>
        }
      >
        <div className="pn-stack">
          <p className="pn-note">
            Registre aqui as entradas de balcão em dinheiro ou cartão. Pix dinâmico e Pix fixo entram sozinhos pela
            cobrança — não precisam de registro manual.
          </p>
          <Select
            label="Profissional"
            placeholder="Quem atendeu"
            options={profs.map((p) => ({ value: p.id, label: p.nome }))}
            value={formReceb.profissionalId}
            onChange={(e) => setFormReceb({ ...formReceb, profissionalId: e.target.value })}
          />
          <Select
            label="Serviço"
            placeholder="Selecione o serviço"
            options={servs.map((s) => ({ value: s.id, label: s.nome }))}
            value={formReceb.servicoId}
            onChange={(e) => setFormReceb({ ...formReceb, servicoId: e.target.value })}
          />
          <Select
            label="Forma de pagamento"
            placeholder="Dinheiro ou cartão"
            hint="O Pix não aparece aqui porque é confirmado automaticamente no recebimento."
            options={METODOS_RECEBIMENTO}
            value={formReceb.metodo}
            onChange={(e) => setFormReceb({ ...formReceb, metodo: e.target.value as MetodoPagamento })}
          />
          {servicoReceb && (
            <div className="pn-rowline">
              <span className="pn-note">Valor recebido</span>
              <Money value={servicoReceb.preco} size="lg" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
