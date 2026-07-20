"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, IconButton, Input, ListItem, Modal, Select } from "@/ds/components";
import { Icon } from "@/ds/icons";
import {
  cancelarAssinatura,
  criarAssinaturaCliente,
  criarCliente,
  getAssinaturasPorCliente,
  getClientes,
  getPlanos,
  getUsoAssinatura,
  marcarCicloPago,
  usarPlano,
} from "@/lib/api";
import type { AssinaturaCliente, Cliente, MetodoCobranca, Plano, UsoAssinatura } from "@/lib/types";
import { formatarTelefone, mascaraTelefone, normalizarTelefone, PAIS_PADRAO, telefoneValido } from "@/lib/telefone";
import { nomeValido, semNumeros } from "@/lib/nome";

const FORM_VAZIO = { nome: "", whatsapp: "" };

const METODO_LABEL: Record<MetodoCobranca, string> = {
  manual: "Manual",
  cartao_recorrente: "Cartão recorrente",
};

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [clienteAssinatura, setClienteAssinatura] = useState<Cliente | null>(null);

  useEffect(() => {
    getClientes()
      .then(setLista)
      .catch(() => setLista([]));
  }, []);

  const valido = nomeValido(form.nome) && telefoneValido(form.whatsapp);

  const fechar = () => {
    setAberto(false);
    setForm(FORM_VAZIO);
  };

  const salvar = async () => {
    if (!valido) return;
    setSalvando(true);
    try {
      const novo = await criarCliente({
        nome: form.nome.trim(),
        whatsapp: normalizarTelefone(form.whatsapp),
      });
      setLista((atual) => [...atual, novo]);
      fechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">{lista.length} cadastrados</p>
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={18} />} onClick={() => setAberto(true)}>Novo cliente</Button>
      </div>

      <Card>
        <div>
          {lista.map((c) => (
            <ListItem
              key={c.id}
              leading={<span style={{ color: "var(--brass-600)" }}><Icon name="user" size={20} /></span>}
              title={c.nome}
              subtitle={formatarTelefone(c.whatsapp)}
              trailing={
                <IconButton label="Assinatura" variant="ghost" size="sm" onClick={() => setClienteAssinatura(c)}>
                  <Icon name="banknote" size={18} />
                </IconButton>
              }
              divided
            />
          ))}
        </div>
      </Card>

      <Modal
        open={aberto}
        onClose={fechar}
        title="Novo cliente"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
            <Button variant="accent" size="sm" loading={salvando} disabled={!valido || salvando} onClick={salvar}>Adicionar</Button>
          </>
        }
      >
        <Input
          label="Nome"
          required
          placeholder="Ex.: Maria Silva"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: semNumeros(e.target.value) })}
        />
        <Input
          label="WhatsApp"
          required
          type="tel"
          inputMode="tel"
          prefix={`${PAIS_PADRAO.flag} ${PAIS_PADRAO.ddi}`}
          placeholder="(11) 98765-4321"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: mascaraTelefone(e.target.value) })}
        />
      </Modal>

      {clienteAssinatura && (
        <AssinaturaModal
          cliente={clienteAssinatura}
          onClose={() => setClienteAssinatura(null)}
        />
      )}
    </div>
  );
}

function AssinaturaModal({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [ativa, setAtiva] = useState<AssinaturaCliente | null>(null);
  const [uso, setUso] = useState<UsoAssinatura | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoEscolhido, setPlanoEscolhido] = useState("");
  const [metodo, setMetodo] = useState<MetodoCobranca>("manual");
  const [servicoUso, setServicoUso] = useState("");
  const [processando, setProcessando] = useState(false);

  // Busca pura (sem setState) para reutilizar tanto no efeito de montagem
  // quanto nas ações do usuário (assinar/cancelar/etc).
  const buscarDados = async () => {
    const [assinaturas, todosPlanos] = await Promise.all([
      getAssinaturasPorCliente(cliente.id),
      getPlanos(),
    ]);
    const atual = assinaturas.find((a) => a.status === "ativa") ?? null;
    const usoAtual = atual ? await getUsoAssinatura(atual.id) : null;
    return { atual, planosAtivos: todosPlanos.filter((p) => p.ativo), usoAtual };
  };

  const carregar = () => {
    setCarregando(true);
    buscarDados()
      .then(({ atual, planosAtivos, usoAtual }) => {
        setAtiva(atual);
        setPlanos(planosAtivos);
        setUso(usoAtual);
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    let ativoEfeito = true;
    buscarDados().then(({ atual, planosAtivos, usoAtual }) => {
      if (!ativoEfeito) return;
      setAtiva(atual);
      setPlanos(planosAtivos);
      setUso(usoAtual);
      setCarregando(false);
    });
    return () => {
      ativoEfeito = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  const assinar = async () => {
    if (!planoEscolhido) return;
    setProcessando(true);
    try {
      await criarAssinaturaCliente({
        clienteId: cliente.id,
        planoId: planoEscolhido,
        metodoCobranca: metodo,
      });
      carregar();
    } finally {
      setProcessando(false);
    }
  };

  const cancelar = async () => {
    if (!ativa) return;
    setProcessando(true);
    try {
      await cancelarAssinatura(ativa.id);
      carregar();
    } finally {
      setProcessando(false);
    }
  };

  const pagarCiclo = async () => {
    if (!ativa) return;
    setProcessando(true);
    try {
      await marcarCicloPago(ativa.id);
      carregar();
    } finally {
      setProcessando(false);
    }
  };

  const registrarUso = async () => {
    if (!ativa || !servicoUso) return;
    setProcessando(true);
    try {
      await usarPlano(ativa.id, servicoUso);
      setServicoUso("");
      carregar();
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Assinatura — ${cliente.nome}`}>
      {carregando ? (
        <p className="muted">Carregando…</p>
      ) : ativa ? (
        <div className="stack">
          <div className="row-between">
            <strong>{ativa.plano.nome}</strong>
            <Badge tone="brass" size="sm">{METODO_LABEL[ativa.metodoCobranca]}</Badge>
          </div>
          <p className="muted">
            {ativa.ultimoCicloPagoEm
              ? `Ciclo pago em ${new Date(ativa.ultimoCicloPagoEm).toLocaleDateString("pt-BR")}`
              : "Ciclo atual ainda não marcado como pago"}
          </p>

          {uso && (
            <div className="stack" style={{ gap: 4 }}>
              {uso.itens.map((i) => (
                <div key={i.servicoId} className="row-between">
                  <span>{i.servicoNome}</span>
                  <span className="muted">{i.usadoNoCiclo}/{i.quantidadeMes} usados</span>
                </div>
              ))}
            </div>
          )}

          <div className="row-between" style={{ gap: 8, alignItems: "flex-end" }}>
            <Select
              label="Registrar uso"
              placeholder="Escolha o serviço usado hoje"
              options={ativa.plano.itens.map((i) => ({ value: i.servicoId, label: i.servicoNome }))}
              value={servicoUso}
              onChange={(e) => setServicoUso(e.target.value)}
            />
            <Button variant="ghost" size="sm" disabled={!servicoUso || processando} onClick={registrarUso}>Usar</Button>
          </div>

          <div className="row-between">
            <Button variant="ghost" size="sm" disabled={processando} onClick={pagarCiclo}>Marcar ciclo pago</Button>
            <Button variant="ghost" size="sm" disabled={processando} onClick={cancelar}>Cancelar assinatura</Button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">Cliente sem assinatura ativa.</p>
          <Select
            label="Plano"
            placeholder="Escolha um plano"
            options={planos.map((p) => ({ value: p.id, label: p.nome }))}
            value={planoEscolhido}
            onChange={(e) => setPlanoEscolhido(e.target.value)}
          />
          <Select
            label="Método de cobrança"
            options={[
              { value: "manual", label: "Manual (baixa por ciclo)" },
              { value: "cartao_recorrente", label: "Cartão recorrente" },
            ]}
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as MetodoCobranca)}
          />
          <Button variant="accent" size="sm" disabled={!planoEscolhido || processando} onClick={assinar}>Assinar plano</Button>
        </div>
      )}
    </Modal>
  );
}
