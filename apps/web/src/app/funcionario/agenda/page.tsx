"use client";

import { useEffect, useState } from "react";
import { Input } from "@/ds/components";
import type { AgendamentoFuncionario } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { formatBRL } from "@/lib/money";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgendaPage() {
  const { requisitar } = useAuth();
  const [data, setData] = useState(hojeISO);
  const [itens, setItens] = useState<AgendamentoFuncionario[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );

  useEffect(() => {
    let ativo = true;
    setEstado("carregando");
    requisitar<AgendamentoFuncionario[]>(`/funcionario/agenda?data=${data}`)
      .then((r) => {
        if (ativo) {
          setItens(r);
          setEstado("ok");
        }
      })
      .catch(() => {
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
    };
  }, [data, requisitar]);

  return (
    <>
      <h1 className="fn-titulo">Minha agenda</h1>

      <Input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        aria-label="Data da agenda"
      />

      {estado === "carregando" && <p className="fn-vazio">Carregando…</p>}
      {estado === "erro" && (
        <p className="fn-vazio">Não foi possível carregar a agenda.</p>
      )}
      {estado === "ok" && itens.length === 0 && (
        <p className="fn-vazio">Nenhum atendimento neste dia.</p>
      )}

      {estado === "ok" && itens.length > 0 && (
        <div className="fn-lista">
          {itens.map((a) => (
            <div key={a.id} className="fn-item">
              <span className="fn-item__hora">{hora(a.inicio)}</span>
              <div className="fn-item__corpo">
                <div className="fn-item__cliente">
                  {a.clienteNome ?? "Cliente"}
                </div>
                <div className="fn-item__status">{a.status}</div>
              </div>
              {a.precoCentavos != null && (
                <span className="fn-item__valor">
                  {formatBRL(a.precoCentavos)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
