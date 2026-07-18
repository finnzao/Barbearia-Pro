"use client";

import { useEffect, useState } from "react";
import { Button, IconButton, Input, Select } from "@/ds/components";
import { Icon } from "@/ds/icons";
import {
  criarBloqueio,
  getBloqueios,
  getProfissionais,
  removerBloqueio,
  type Bloqueio,
} from "@/lib/api";
import type { Profissional } from "@/lib/types";

const TODOS = "";

// datetime-local devolve "2026-07-20T09:00" (hora local do navegador, que é a
// da barbearia). new Date() interpreta assim e o toISOString manda em UTC.
function paraIso(valor: string): string {
  return new Date(valor).toISOString();
}

function formatar(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Bloqueios() {
  const [lista, setLista] = useState<Bloqueio[]>([]);
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [profissionalId, setProfissionalId] = useState(TODOS);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    getBloqueios().then(setLista).catch(() => setLista([]));
    getProfissionais().then(setProfs).catch(() => {});
  }, []);

  const valido = inicio !== "" && fim !== "" && new Date(fim) > new Date(inicio);

  const adicionar = async () => {
    if (!valido) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarBloqueio({
        profissionalId: profissionalId || undefined,
        inicio: paraIso(inicio),
        fim: paraIso(fim),
        motivo: motivo.trim() || undefined,
      });
      setLista(await getBloqueios());
      setInicio("");
      setFim("");
      setMotivo("");
      setProfissionalId(TODOS);
    } catch {
      setErro("Não foi possível salvar o bloqueio.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
    await removerBloqueio(id).catch(() => {});
    setLista(await getBloqueios());
  };

  return (
    <div className="stack-sm">
      <Select
        label="Quem fica indisponível"
        options={[
          { value: TODOS, label: "A barbearia toda" },
          ...profs.map((p) => ({ value: p.id, label: p.nome })),
        ]}
        value={profissionalId}
        onChange={(e) => setProfissionalId(e.target.value)}
      />
      <Input
        label="Início"
        type="datetime-local"
        value={inicio}
        onChange={(e) => setInicio(e.target.value)}
      />
      <Input
        label="Fim"
        type="datetime-local"
        value={fim}
        onChange={(e) => setFim(e.target.value)}
      />
      <Input
        label="Motivo (opcional)"
        placeholder="Férias, folga, almoço..."
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      {erro && <p className="muted">{erro}</p>}
      <Button
        variant="accent"
        size="sm"
        disabled={!valido || salvando}
        iconLeft={<Icon name="plus" size={16} />}
        onClick={adicionar}
      >
        Adicionar bloqueio
      </Button>

      {lista.length === 0 ? (
        <p className="muted">Nenhum bloqueio. A agenda segue o horário normal.</p>
      ) : (
        lista.map((b) => (
          <div key={b.id} className="row-between">
            <span>
              <b>{b.profissional?.apelido ?? "Barbearia toda"}</b>{" "}
              {formatar(b.inicio)} → {formatar(b.fim)}
              {b.motivo ? ` · ${b.motivo}` : ""}
            </span>
            <IconButton
              label="Remover bloqueio"
              variant="ghost"
              onClick={() => remover(b.id)}
            >
              <Icon name="x" size={16} />
            </IconButton>
          </div>
        ))
      )}
    </div>
  );
}
