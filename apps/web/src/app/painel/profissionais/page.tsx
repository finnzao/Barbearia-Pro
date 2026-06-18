"use client";

import { useState } from "react";
import { Glyph } from "@/app/painel/glyphs";
import { Avatar, Badge, Btn, Card, Field, Modal, Row, Select, pct } from "@/app/painel/ui";
import { profissionais as profsIniciais } from "@/lib/mock-data";
import type { Profissional, TipoChavePix } from "@/lib/types";

const FORM_VAZIO = { nome: "", apelido: "", comissao: "", chavePix: "", pixTipoChave: "email" as TipoChavePix };

const TIPOS_CHAVE: { value: TipoChavePix; label: string }[] = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Aleatória" },
];

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
    const chavePix = form.chavePix.trim();
    setLista((atual) => [
      ...atual,
      {
        id: crypto.randomUUID(),
        nome,
        apelido: form.apelido.trim() || nome.split(/\s+/)[0],
        comissaoPercent: comissaoNum / 100,
        chavePix: chavePix || undefined,
        pixTipoChave: chavePix ? form.pixTipoChave : undefined,
      },
    ]);
    fechar();
  };

  return (
    <div className="pn-page">
      <div className="pn-blockhead">
        <div className="pn-pagehead">
          <h1 className="pn-h1">Profissionais</h1>
          <p className="pn-sub">{lista.length} na equipe</p>
        </div>
        <Btn variant="accent" iconLeft={<Glyph name="novo" size={18} />} onClick={() => setAberto(true)}>
          Adicionar
        </Btn>
      </div>

      <Card>
        <div className="pn-list">
          {lista.map((p) => (
            <Row
              key={p.id}
              leading={<Avatar name={p.nome} />}
              title={p.nome}
              subtitle={`Comissão ${pct(p.comissaoPercent)} · ${p.chavePix ? `repasse → ${p.chavePix}` : "sem chave de repasse"}`}
              trailing={p.chavePix ? <Badge tone="green">Ativo</Badge> : <Badge tone="amber">Sem chave</Badge>}
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
            <Btn variant="ghost" size="sm" onClick={fechar}>
              Cancelar
            </Btn>
            <Btn variant="accent" size="sm" disabled={!valido} onClick={salvar}>
              Adicionar
            </Btn>
          </>
        }
      >
        <div className="pn-stack">
          <Field
            label="Nome completo"
            placeholder="Ex.: Téo Andrade"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Field
            label="Apelido"
            hint="Como aparece na agenda. Se vazio, usa o primeiro nome."
            placeholder="Téo"
            value={form.apelido}
            onChange={(e) => setForm({ ...form, apelido: e.target.value })}
          />
          <Field
            label="Comissão (%)"
            type="number"
            min={0}
            max={100}
            placeholder="50"
            value={form.comissao}
            onChange={(e) => setForm({ ...form, comissao: e.target.value })}
          />
          <Select
            label="Tipo da chave Pix"
            options={TIPOS_CHAVE}
            value={form.pixTipoChave}
            onChange={(e) => setForm({ ...form, pixTipoChave: e.target.value as TipoChavePix })}
          />
          <Field
            label="Chave Pix de repasse"
            hint="Destino do repasse — para onde o salão (ou o split) manda a parte dele. Não é onde o cliente paga."
            placeholder="teo.andrade@pix.com"
            value={form.chavePix}
            onChange={(e) => setForm({ ...form, chavePix: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
