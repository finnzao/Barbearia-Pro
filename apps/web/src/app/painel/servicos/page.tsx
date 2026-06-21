"use client";

import { useState } from "react";
import { Button, Card, Input, ListItem, Modal, Money } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { servicos as servicosIniciais } from "@/lib/mock-data";
import type { Servico } from "@/lib/types";
import { reaisParaCentavos } from "@/lib/money";


const FORM_VAZIO = { nome: "", duracaoMin: "", preco: "" };

export default function Servicos() {
  const [lista, setLista] = useState<Servico[]>(servicosIniciais);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  const valido = form.nome.trim() !== "" && Number(form.duracaoMin) > 0 && reaisParaCentavos(form.preco) >= 0;

  const fechar = () => {
    setAberto(false);
    setForm(FORM_VAZIO);
  };

  const salvar = () => {
    if (!valido) return;
    setLista((atual) => [
      ...atual,
      { id: crypto.randomUUID(), nome: form.nome.trim(), duracaoMin: Number(form.duracaoMin), preco: Number(form.preco) },
    ]);
    fechar();
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Serviços</h1>
          <p className="page-sub">{lista.length} no catálogo</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />} onClick={() => setAberto(true)}>Novo serviço</Button>
      </div>

      <Card>
        <div>
          {lista.map((s) => (
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

      <Modal
        open={aberto}
        onClose={fechar}
        title="Novo serviço"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
            <Button variant="accent" size="sm" disabled={!valido} onClick={salvar}>Adicionar</Button>
          </>
        }
      >
        <Input
          label="Nome"
          required
          placeholder="Ex.: Corte + barba"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
        <Input
          label="Duração (min)"
          required
          type="number"
          min={1}
          mono
          placeholder="45"
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
    </div>
  );
}
