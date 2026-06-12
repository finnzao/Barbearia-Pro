"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string; icon: React.ReactNode };

const I = {
  painel: (
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  ),
  agenda: (
    <path d="M7 2v2M17 2v2M3 8h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
  ),
  comissoes: (
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  ),
  profissionais: (
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  ),
  servicos: (
    <path d="M14.7 6.3a4 4 0 00-5.6 5.6L3 18v3h3l6.1-6.1a4 4 0 005.6-5.6l-2.5 2.5-2.5-2.5 2.5-2.5z" />
  ),
};

const itens: Item[] = [
  { href: "/painel", label: "Painel", icon: I.painel },
  { href: "/painel/agenda", label: "Agenda", icon: I.agenda },
  { href: "/painel/comissoes", label: "Comissões", icon: I.comissoes },
  { href: "/painel/profissionais", label: "Profissionais", icon: I.profissionais },
  { href: "/painel/servicos", label: "Serviços", icon: I.servicos },
];

function Marca() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <span
        aria-hidden
        className="h-8 w-3 shrink-0 rounded-full ring-1 ring-stone-700"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #dc2626 0 4px, #f5f5f4 4px 8px, #2563eb 8px 12px)",
        }}
      />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">Barbearia</p>
        <p className="text-[11px] text-stone-400">Painel do dono</p>
      </div>
    </div>
  );
}

function Links({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {itens.map((item) => {
        const ativo =
          item.href === "/painel"
            ? pathname === "/painel"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors ${
              ativo
                ? "border-amber-500 bg-stone-800 font-medium text-white"
                : "border-transparent text-stone-300 hover:bg-stone-800/60 hover:text-white"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px] shrink-0"
              aria-hidden
            >
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Barra superior — só no mobile */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-stone-700 hover:bg-stone-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-stone-900">Barbearia</span>
      </header>

      {/* Sidebar fixa — desktop */}
      <aside className="hidden w-60 shrink-0 flex-col bg-stone-900 md:flex">
        <Marca />
        <Links />
      </aside>

      {/* Drawer — mobile */}
      {aberto ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAberto(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-stone-900">
            <div className="flex items-center justify-between pr-3">
              <Marca />
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="rounded-md p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <Links onNavigate={() => setAberto(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
