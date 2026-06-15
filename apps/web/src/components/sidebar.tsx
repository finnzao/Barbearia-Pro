"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/ds/icons";
import { IconButton } from "@/ds/components";

type Item = { href: string; label: string; icon: IconName };
type Secao = { titulo?: string; itens: Item[] };

const SECOES: Secao[] = [
  { itens: [{ href: "/painel", label: "Visão geral", icon: "grid" }] },
  {
    titulo: "Operação",
    itens: [
      { href: "/painel/agenda", label: "Agenda", icon: "clock" },
      { href: "/painel/calendario", label: "Calendário", icon: "calendar" },
      { href: "/painel/cobranca", label: "Gerar Pix", icon: "qr" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/painel/pagamentos", label: "Pagamentos", icon: "banknote" },
      { href: "/painel/profissionais", label: "Profissionais", icon: "users" },
      { href: "/painel/servicos", label: "Serviços", icon: "scissors" },
    ],
  },
  {
    titulo: "Análise",
    itens: [{ href: "/painel/analise", label: "Análise", icon: "trendingUp" }],
  },
  { itens: [{ href: "/painel/configuracoes", label: "Configurações", icon: "settings" }] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Ativo = link mais específico que prefixa a rota atual.
  const isActive = (href: string) =>
    href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);

  return (
    <>
      <div className="topbar">
        <IconButton label="Abrir menu" variant="ghost" onClick={() => setOpen(true)} style={{ color: "var(--stone-50)" }}>
          <Icon name="grid" />
        </IconButton>
        <span className="topbar__name">NaRégua</span>
      </div>

      <div className={open ? "scrim scrim--show" : "scrim"} onClick={() => setOpen(false)} />

      <aside className={open ? "sidebar sidebar--open" : "sidebar"}>
        <div className="sidebar__brand">
          <img src="/naregua/symbol-app-icon.svg" alt="NaRégua" />
          <span className="sidebar__name">NaRégua</span>
        </div>
        <div className="sidebar__pole" />

        <nav className="sidebar__nav">
          {SECOES.map((secao, i) => (
            <div key={secao.titulo ?? `s${i}`} className="sidebar__group">
              {secao.titulo && <span className="sidebar__section">{secao.titulo}</span>}
              {secao.itens.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={isActive(l.href) ? "navlink navlink--active" : "navlink"}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={l.icon} size={18} />
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <Link href="/agendar" className="navlink" onClick={() => setOpen(false)}>
            <Icon name="share" size={18} />
            Link do cliente
          </Link>
        </div>
      </aside>
    </>
  );
}
