"use client";

import { useEffect, useState } from "react";
import { Badge, Btn, Card } from "@/app/painel/ui";
import {
  getMercadoPagoConexaoUrl,
  getMercadoPagoStatus,
  type MercadoPagoStatus,
} from "@/lib/api";
import { useQueryParam } from "@/lib/client-hooks";

// Conexão da conta Mercado Pago da barbearia (OAuth marketplace). O aviso vem
// do redirect do callback (?mp=conectado|erro). Para recepcao (403) não renderiza.
export function MercadoPagoCard() {
  const [mp, setMp] = useState<MercadoPagoStatus | null>(null);
  const mpAviso = useQueryParam("mp");

  useEffect(() => {
    getMercadoPagoStatus().then(setMp).catch(() => {});
  }, []);

  if (!mp) return null;

  const conectar = async () => {
    const { url } = await getMercadoPagoConexaoUrl();
    window.location.href = url;
  };

  return (
    <Card
      title="Conta Mercado Pago"
      action={
        mp.conectado ? (
          <Badge tone="green">Conectada</Badge>
        ) : (
          <Btn variant="accent" size="sm" onClick={conectar}>
            Conectar Mercado Pago
          </Btn>
        )
      }
    >
      {mpAviso === "conectado" && (
        <p className="pn-note">Conta conectada com sucesso — os Pix já caem direto nela.</p>
      )}
      {mpAviso === "erro" && <p className="pn-note">Não foi possível conectar. Tente de novo.</p>}
      <p className="pn-note">
        {mp.conectado
          ? `Os pagamentos Pix dos clientes caem direto na conta da barbearia (conta MP ${mp.mpUserId}).`
          : "Conecte a conta Mercado Pago da barbearia para receber Pix dos clientes direto nela. Sem isso, cobranças Pix não podem ser geradas."}
      </p>
    </Card>
  );
}
