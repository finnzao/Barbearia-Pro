"use client";

import { useState } from "react";
import { Avatar, Badge, Button, Card, Input, ListItem, Modal, Money, Select } from "@/ds/components";
import { Icon } from "@/ds/icons";
import { agendamentos as agendaInicial, profissionais, servicos } from "@/lib/mock-data";
import type { Agendamento, StatusAgendamento } from "@/lib/types";

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

const FORM_VAZIO = { hora: "", cliente: "", servicoId: "", profissionalId: "", status: "confirmado" as StatusAgendamento };

export default function Agenda() {
  const [lista, setLista] = useState<Agendamento[]>(agendaInicial);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  const valido = form.hora !== "" && form.cliente.trim() !== "" && form.servicoId !== "" && form.profissionalId !== "";

  const fechar = () => {
    setAberto(false);
    setForm(FORM_VAZIO);
  };

  const salvar = () => {
    if (!valido) return;
    const servico = servicos.find((s) => s.id === form.servicoId)!;
    const prof = profissionais.find((p) => p.id === form.profissionalId)!;
    setLista((atual) =>
      [
        ...atual,
        {
          id: crypto.randomUUID(),
          hora: form.hora,
          cliente: form.cliente.trim(),
          servico: servico.nome,
          profissionalId: prof.id,
          profissional: prof.apelido,
          preco: servico.preco,
          status: form.status,
        },
      ].sort((a, b) => a.hora.localeCompare(b.hora)),
    );
    fechar();
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-sub">Sexta · 13 jun 2026</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />} onClick={() => setAberto(true)}>Novo agendamento</Button>
      </div>

      <Card title="Hoje" action={<span className="muted">{lista.length} horários</span>}>
        <div>
          {lista.map((a) => (
            <ListItem
              key={a.id}
              time={a.hora}
              railColor={railPorStatus[a.status]}
              leading={<Avatar name={a.cliente} size="sm" />}
              title={a.cliente}
              subtitle={`${a.servico} · ${a.profissional}`}
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
      </Card>

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
        <Input
          label="Cliente"
          required
          placeholder="Nome do cliente"
          value={form.cliente}
          onChange={(e) => setForm({ ...form, cliente: e.target.value })}
        />
        <Input
          label="Horário"
          required
          type="time"
          mono
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
      </Modal>
    </div>
  );
}
