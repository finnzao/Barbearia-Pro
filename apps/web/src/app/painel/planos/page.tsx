"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, IconButton, Input, ListItem, Modal, Money, Select } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { criarPlano, getPlanos, getProfissionais, getServicos } from "@/lib/api";
import { formatBRL, toCents } from "@/lib/money";
import type { Plano, Profissional, Servico } from "@/lib/types";

interface ItemForm {
  servicoId: string;
  quantidadeMes: string;
}

const FORM_VAZIO = { nome: "", preco: "" };

export default function Planos() {
  const [lista, setLista] = useState<Plano[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [novoItem, setNovoItem] = useState<ItemForm>({ servicoId: "", quantidadeMes: "1" });

  useEffect(() => {
    getPlanos().then(setLista).catch(() => setLista([]));
    getServicos().then(setServicos).catch(() => setServicos([]));
    getProfissionais().then(setProfissionais).catch(() => setProfissionais([]));
  }, []);

  const servicoPorId = (id: string) => servicos.find((s) => s.id === id);

  // Comissão de referência para o simulador: média dos profissionais ativos.
  const comissaoMedia = useMemo(() => {
    const ativos = profissionais.filter((p) => p.ativo);
    if (ativos.length === 0) return 0;
    return ativos.reduce((s, p) => s + p.comissaoPercent, 0) / ativos.length;
  }, [profissionais]);

  const adicionarItem = () => {
    if (!novoItem.servicoId || Number(novoItem.quantidadeMes) < 1) return;
    if (itens.some((i) => i.servicoId === novoItem.servicoId)) return;
    setItens((atual) => [...atual, novoItem]);
    setNovoItem({ servicoId: "", quantidadeMes: "1" });
  };

  const removerItem = (servicoId: string) => {
    setItens((atual) => atual.filter((i) => i.servicoId !== servicoId));
  };

  // Simulador: valor avulso, custo estimado (comissão média) e lucro por cenário de uso.
  const simulacao = useMemo(() => {
    const valorAvulsoCentavos = itens.reduce((soma, i) => {
      const servico = servicos.find((s) => s.id === i.servicoId);
      if (!servico) return soma;
      return soma + servico.preco * Number(i.quantidadeMes || 0);
    }, 0);
    const custoCentavos = Math.round(valorAvulsoCentavos * comissaoMedia);
    const precoCentavos = toCents(Number(form.preco || 0));
    const cenarios = [1, 0.75, 0.5].map((fracaoUso) => ({
      uso: Math.round(fracaoUso * 100),
      lucroCentavos: precoCentavos - Math.round(custoCentavos * fracaoUso),
    }));
    return { valorAvulsoCentavos, custoCentavos, precoCentavos, cenarios };
  }, [itens, servicos, comissaoMedia, form.preco]);

  const valido = form.nome.trim() !== "" && Number(form.preco) > 0 && itens.length > 0;

  const fechar = () => {
    setAberto(false);
    setForm(FORM_VAZIO);
    setItens([]);
    setNovoItem({ servicoId: "", quantidadeMes: "1" });
  };

  const salvar = async () => {
    if (!valido) return;
    setSalvando(true);
    try {
      const novo = await criarPlano({
        nome: form.nome.trim(),
        precoCentavos: toCents(Number(form.preco)),
        itens: itens.map((i) => ({
          servicoId: i.servicoId,
          quantidadeMes: Number(i.quantidadeMes),
        })),
      });
      setLista((atual) => [novo, ...atual]);
      fechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Planos de assinatura</h1>
          <p className="page-sub">{lista.length} planos cadastrados</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />} onClick={() => setAberto(true)}>Novo plano</Button>
      </div>

      <Card>
        <div>
          {lista.map((p) => (
            <ListItem
              key={p.id}
              leading={<span style={{ color: "var(--brass-600)" }}><Icon name="banknote" size={20} /></span>}
              title={p.nome}
              subtitle={p.itens.map((i) => `${i.quantidadeMes}× ${i.servicoNome}`).join(", ")}
              trailing={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Money value={p.preco} size="sm" />
                  {!p.ativo && <Badge tone="neutral" size="sm">Inativo</Badge>}
                </div>
              }
              divided
            />
          ))}
        </div>
      </Card>

      <Modal
        open={aberto}
        onClose={fechar}
        title="Novo plano"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
            <Button variant="accent" size="sm" loading={salvando} disabled={!valido || salvando} onClick={salvar}>Criar plano</Button>
          </>
        }
      >
        <Input
          label="Nome do plano"
          required
          placeholder="Ex.: Plano Mensal"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />

        <div className="row-between" style={{ gap: 8, alignItems: "flex-end" }}>
          <Select
            label="Serviço"
            placeholder="Escolha um serviço"
            options={servicos
              .filter((s) => !itens.some((i) => i.servicoId === s.id))
              .map((s) => ({ value: s.id, label: s.nome }))}
            value={novoItem.servicoId}
            onChange={(e) => setNovoItem({ ...novoItem, servicoId: e.target.value })}
          />
          <Input
            label="Vezes/mês"
            type="number"
            min={1}
            mono
            style={{ maxWidth: 100 }}
            value={novoItem.quantidadeMes}
            onChange={(e) => setNovoItem({ ...novoItem, quantidadeMes: e.target.value })}
          />
          <Button variant="ghost" size="sm" onClick={adicionarItem} disabled={!novoItem.servicoId}>Adicionar</Button>
        </div>

        {itens.length > 0 && (
          <div className="stack" style={{ gap: 4 }}>
            {itens.map((i) => {
              const servico = servicoPorId(i.servicoId);
              return (
                <div key={i.servicoId} className="row-between">
                  <span>{i.quantidadeMes}× {servico?.nome ?? "Serviço"}</span>
                  <IconButton
                    label="Remover item"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerItem(i.servicoId)}
                  >
                    <Icon name="x" size={16} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <Input
          label="Preço do plano (R$)"
          required
          type="number"
          min={0}
          step="0.01"
          mono
          placeholder="99"
          value={form.preco}
          onChange={(e) => setForm({ ...form, preco: e.target.value })}
        />

        {itens.length > 0 && (
          <Card title="Simulação de lucro">
            <p className="muted">
              Valor avulso: {formatBRL(simulacao.valorAvulsoCentavos)} · comissão média dos
              profissionais ativos: {(comissaoMedia * 100).toFixed(0)}%
            </p>
            <div className="stack" style={{ gap: 4 }}>
              {simulacao.cenarios.map((c) => (
                <div key={c.uso} className="row-between">
                  <span>Cliente usa {c.uso}% do plano</span>
                  <strong style={{ color: c.lucroCentavos >= 0 ? "var(--green-600)" : "var(--red-600)" }}>
                    {formatBRL(c.lucroCentavos)} de lucro
                  </strong>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Modal>
    </div>
  );
}
