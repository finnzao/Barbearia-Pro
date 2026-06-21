"use client";

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Glyph } from "@/app/painel/glyphs";
import { formatBRL } from "@/lib/money";

// Fonte única: brl é só um apelido de formatBRL (centavos → "R$ x,xx").
export const brl = formatBRL;
export const pct = (v: number) => `${Math.round(v * 100)}%`;

type Tom = "neutral" | "green" | "amber" | "red" | "blue";

export function Card({
  title,
  action,
  footer,
  dark,
  children,
  style,
}: {
  title?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  dark?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section className={dark ? "pn-card pn-card--dark" : "pn-card"} style={style}>
      {(title || action) && (
        <header className="pn-card__head">
          {title ? <h2 className="pn-card__title">{title}</h2> : <span />}
          {action && <div className="pn-card__action">{action}</div>}
        </header>
      )}
      <div className="pn-card__body">{children}</div>
      {footer && <footer className="pn-card__foot">{footer}</footer>}
    </section>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const iniciais = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`pn-avatar pn-avatar--${size}`} aria-hidden="true">
      {iniciais}
    </span>
  );
}

export function Money({
  value,
  size = "md",
  tone = "ink",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "muted" | "debit" | "credit";
}) {
  return <span className={`pn-money pn-money--${size} pn-money--${tone}`}>{brl(value)}</span>;
}

export function Badge({ tone = "neutral", children }: { tone?: Tom; children: ReactNode }) {
  return <span className={`pn-badge pn-badge--${tone}`}>{children}</span>;
}

export function Btn({
  variant = "primary",
  size = "md",
  full,
  iconLeft,
  children,
  ...rest
}: {
  variant?: "primary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  iconLeft?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ["pn-btn", `pn-btn--${variant}`, `pn-btn--${size}`, full ? "pn-btn--full" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {iconLeft}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="pn-field">
      <span className="pn-field__label">{label}</span>
      <input className="pn-input" {...rest} />
      {hint && <span className="pn-field__hint">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  hint,
  options,
  placeholder,
  ...rest
}: {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="pn-field">
      <span className="pn-field__label">{label}</span>
      <div className="pn-select">
        <select className="pn-input" {...rest}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Glyph name="seta" size={16} />
      </div>
      {hint && <span className="pn-field__hint">{hint}</span>}
    </label>
  );
}

export function Seg({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="pn-seg" role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          className={value === it.id ? "pn-seg__item pn-seg__item--on" : "pn-seg__item"}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Row({
  leading,
  title,
  subtitle,
  trailing,
  time,
  rail,
  onClick,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  time?: string;
  rail?: string;
  onClick?: () => void;
}) {
  const conteudo = (
    <>
      {time && <span className="pn-row__time">{time}</span>}
      {leading && <span className="pn-row__lead">{leading}</span>}
      <span className="pn-row__body">
        <span className="pn-row__title">{title}</span>
        {subtitle && <span className="pn-row__sub">{subtitle}</span>}
      </span>
      {trailing && <span className="pn-row__trail">{trailing}</span>}
    </>
  );
  const style = rail ? { borderLeft: `3px solid ${rail}` } : undefined;
  if (onClick) {
    return (
      <button type="button" className="pn-row pn-row--tap" style={style} onClick={onClick}>
        {conteudo}
      </button>
    );
  }
  return (
    <div className="pn-row" style={style}>
      {conteudo}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="pn-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pn-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="pn-modal__head">
          <h2 className="pn-modal__title">{title}</h2>
          <button type="button" className="pn-modal__close" aria-label="Fechar" onClick={onClose}>
            <Glyph name="x" size={20} />
          </button>
        </header>
        <div className="pn-modal__body">{children}</div>
        {footer && <footer className="pn-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}
