"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/ds/icons";
import { IconButton } from "@/ds/components";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/painel", label: "Visão geral", icon: "grid" },
  { href: "/painel/agenda", label: "Agenda", icon: "clock" },
  { href: "/painel/calendario", label: "Calendário", icon: "calendar" },
  { href: "/painel/analise", label: "Análise", icon: "trendingUp" },
  { href: "/painel/comissoes", label: "Comissões", icon: "banknote" },
  { href: "/painel/profissionais", label: "Profissionais", icon: "users" },
  { href: "/painel/servicos", label: "Serviços", icon: "scissors" },
  { href: "/painel/configuracoes", label: "Configurações", icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Considera ativo o link mais específico que prefixa a rota atual.
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
          {LINKS.map((l) => (
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
