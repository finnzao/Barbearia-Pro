"use client";

import { useState } from "react";
import { Avatar, Badge, Button, Card, Input, ListItem, Modal } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { pct } from "@/lib/format";
import { profissionais as profsIniciais } from "@/lib/mock-data";
import type { Profissional } from "@/lib/types";

const FORM_VAZIO = { nome: "", apelido: "", comissao: "" };

export default function Profissionais() {
  const [lista, setLista] = useState<Profissional[]>(profsIniciais);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  const comissaoNum = Number(form.comissao);
  const valido = form.nome.trim() !== "" && comissaoNum >= 0 && comissaoNum <= 100;

  const fechar = () => {
    setAberto(false);
    setForm(FORM_VAZIO);
  };

  const salvar = () => {
    if (!valido) return;
    const nome = form.nome.trim();
    setLista((atual) => [
      ...atual,
      {
        id: crypto.randomUUID(),
        nome,
        apelido: form.apelido.trim() || nome.split(/\s+/)[0],
        comissaoPercent: comissaoNum / 100,
      },
    ]);
    fechar();
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Profissionais</h1>
          <p className="page-sub">{lista.length} na equipe</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />} onClick={() => setAberto(true)}>Adicionar</Button>
      </div>

      <Card>
        <div>
          {lista.map((p) => (
            <ListItem
              key={p.id}
              leading={<Avatar name={p.nome} status="online" />}
              title={p.nome}
              subtitle={`Comissão ${pct(p.comissaoPercent)}`}
              trailing={<Badge tone="neutral" size="sm">Ativo</Badge>}
              divided
            />
          ))}
        </div>
      </Card>

      <Modal
        open={aberto}
        onClose={fechar}
        title="Novo profissional"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
            <Button variant="accent" size="sm" disabled={!valido} onClick={salvar}>Adicionar</Button>
          </>
        }
      >
        <Input
          label="Nome completo"
          required
          placeholder="Ex.: Téo Andrade"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
        <Input
          label="Apelido"
          hint="Como aparece na agenda. Se vazio, usa o primeiro nome."
          placeholder="Téo"
          value={form.apelido}
          onChange={(e) => setForm({ ...form, apelido: e.target.value })}
        />
        <Input
          label="Comissão (%)"
          required
          type="number"
          min={0}
          max={100}
          mono
          placeholder="50"
          value={form.comissao}
          onChange={(e) => setForm({ ...form, comissao: e.target.value })}
        />
      </Modal>
    </div>
  );
}
