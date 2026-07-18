"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Input,
  ListItem,
  Modal,
  Money,
  Select,
  Switch,
} from "@/ds/components";
import { Icon } from "@/ds/icons";
import {
  atualizarServico,
  criarServico,
  definirProfissionaisDoServico,
  getProfissionais,
  getServicos,
  removerServico,
} from "@/lib/api";
import type { Profissional, Servico } from "@/lib/types";
import { toCents } from "@/lib/money";

// A agenda anda de 30 em 30 min; a API recusa duração fora desse passo (ver
// apps/api/src/common/agenda.ts, que é quem manda). Aqui é só o menu.
const DURACOES = [30, 60, 90, 120, 150, 180];

function rotuloDuracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const OPCOES_DURACAO = DURACOES.map((d) => ({
  value: String(d),
  label: rotuloDuracao(d),
}));

const FORM_VAZIO = { nome: "", duracaoMin: "30", preco: "" };

export default function Servicos() {
  const [lista, setLista] = useState<Servico[]>([]);
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [novo, setNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  // Serviço em edição: mesmo modal cuida de dados, equipe e exclusão.
  const [editando, setEditando] = useState<Servico | null>(null);
  const [edit, setEdit] = useState(FORM_VAZIO);
  const [ativo, setAtivo] = useState(true);
  const [marcados, setMarcados] = useState<string[]>([]);

  const recarregar = async () => setLista(await getServicos());

  useEffect(() => {
    getServicos()
      .then(setLista)
      .catch(() => setLista([]));
    getProfissionais()
      .then(setProfs)
      .catch(() => {});
  }, []);

  const validoNovo =
    form.nome.trim() !== "" && toCents(Number(form.preco)) >= 0 && form.preco !== "";

  const fecharNovo = () => {
    setNovo(false);
    setForm(FORM_VAZIO);
    setErro(null);
  };

  const salvarNovo = async () => {
    if (!validoNovo) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarServico({
        nome: form.nome.trim(),
        duracaoMin: Number(form.duracaoMin),
        precoCentavos: toCents(Number(form.preco)),
      });
      await recarregar();
      fecharNovo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const abrirEdicao = (s: Servico) => {
    setEdit({
      nome: s.nome,
      duracaoMin: String(s.duracaoMin),
      preco: String(s.preco / 100),
    });
    setAtivo(s.ativo ?? true);
    setMarcados(s.profissionalIds ?? []);
    setErro(null);
    setEditando(s);
  };

  const alternar = (id: string) =>
    setMarcados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );

  const salvarEdicao = async () => {
    if (!editando) return;
    setSalvando(true);
    setErro(null);
    try {
      await atualizarServico(editando.id, {
        nome: edit.nome.trim(),
        duracaoMin: Number(edit.duracaoMin),
        precoCentavos: toCents(Number(edit.preco)),
        ativo,
      });
      // Marcar todos é o mesmo que não restringir: grava vazio, e assim um
      // profissional novo já entra atendendo em vez de ficar de fora calado.
      const ids = marcados.length === profs.length ? [] : marcados;
      await definirProfissionaisDoServico(editando.id, ids);
      await recarregar();
      setEditando(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!editando) return;
    setSalvando(true);
    setErro(null);
    try {
      await removerServico(editando.id);
      await recarregar();
      setEditando(null);
    } catch {
      // Serviço com histórico não sai: desativar é o caminho.
      setErro(
        "Este serviço tem agendamentos e não pode ser excluído. Desative-o.",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Serviços</h1>
          <p className="page-sub">{lista.length} no catálogo</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />} onClick={() => setNovo(true)}>
          Novo serviço
        </Button>
      </div>

      <Card footer={<span className="muted">Toque em um serviço para editar, definir quem faz ou desativar.</span>}>
        <div>
          {lista.map((s) => {
            const quem = s.profissionalIds ?? [];
            const nomes = quem
              .map((id) => profs.find((p) => p.id === id)?.apelido)
              .filter(Boolean)
              .join(", ");
            return (
              <ListItem
                key={s.id}
                leading={<span style={{ color: "var(--brass-600)" }}><Icon name="scissors" size={20} /></span>}
                title={s.nome}
                subtitle={`${rotuloDuracao(s.duracaoMin)} · ${nomes || "toda a equipe"}`}
                trailing={
                  <>
                    <Money value={s.preco} size="sm" tone={s.ativo === false ? "muted" : "default"} />
                    {s.ativo === false && <Badge status="cancelado" size="sm">Inativo</Badge>}
                  </>
                }
                onClick={() => abrirEdicao(s)}
                divided
              />
            );
          })}
        </div>
      </Card>

      <Modal
        open={novo}
        onClose={fecharNovo}
        title="Novo serviço"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fecharNovo}>Cancelar</Button>
            <Button variant="accent" size="sm" loading={salvando} disabled={!validoNovo || salvando} onClick={salvarNovo}>
              Adicionar
            </Button>
          </>
        }
      >
        {erro && <p className="muted">{erro}</p>}
        <Input
          label="Nome"
          required
          placeholder="Ex.: Corte + barba"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
        <Select
          label="Duração"
          hint="A agenda trabalha em blocos de 30 min."
          options={OPCOES_DURACAO}
          value={form.duracaoMin}
          onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
        />
        <Input
          label="Preço (R$)"
          required
          type="number"
          min={0}
          step="0.01"
          mono
          placeholder="80"
          value={form.preco}
          onChange={(e) => setForm({ ...form, preco: e.target.value })}
        />
      </Modal>

      <Modal
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando?.nome ?? ""}
        footer={
          <>
            <Button variant="ghost" size="sm" disabled={salvando} onClick={excluir}>
              Excluir
            </Button>
            <Button variant="accent" size="sm" loading={salvando} disabled={salvando} onClick={salvarEdicao}>
              Salvar
            </Button>
          </>
        }
      >
        {erro && <p className="muted">{erro}</p>}
        <Input
          label="Nome"
          required
          value={edit.nome}
          onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
        />
        <Select
          label="Duração"
          hint="A agenda trabalha em blocos de 30 min."
          options={OPCOES_DURACAO}
          value={edit.duracaoMin}
          onChange={(e) => setEdit({ ...edit, duracaoMin: e.target.value })}
        />
        <Input
          label="Preço (R$)"
          required
          type="number"
          min={0}
          step="0.01"
          mono
          value={edit.preco}
          onChange={(e) => setEdit({ ...edit, preco: e.target.value })}
        />

        <div className="opt-row">
          <div>
            <div className="opt-row__title">Ativo</div>
            <p className="opt-row__desc">Desligado, some do link do cliente (o histórico fica).</p>
          </div>
          <Switch checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
        </div>

        <div className="seclbl" style={{ marginTop: "var(--sp-2)" }}>Quem faz</div>
        <p className="muted">Sem ninguém marcado, toda a equipe atende.</p>
        <div className="stack-sm">
          {profs.map((p) => (
            <div key={p.id} className="opt-row">
              <div>
                <div className="opt-row__title">{p.nome}</div>
              </div>
              <Switch checked={marcados.includes(p.id)} onChange={() => alternar(p.id)} />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
