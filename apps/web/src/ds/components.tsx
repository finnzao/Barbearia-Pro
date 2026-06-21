// Componentes core do NaRégua. O CSS vive em ds/components.css (carregado no layout),
// então aqui ficam apenas a marcação e os tipos. Mantêm as mesmas classes do design system.
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Icon } from "./icons";
import { formatBRLParts } from "@/lib/money";

const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

/* ---------------- Button ---------------- */
type ButtonProps = {
  variant?: "primary" | "accent" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx("nr-btn", `nr-btn--${variant}`, `nr-btn--${size}`, fullWidth && "nr-btn--full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="nr-btn__spin" aria-hidden="true" />}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

/* ---------------- IconButton ---------------- */
type IconButtonProps = {
  variant?: "ghost" | "solid" | "outline";
  size?: "sm" | "md" | "lg";
  label: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({ variant = "ghost", size = "md", label, className = "", children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cx("nr-iconbtn", `nr-iconbtn--${variant}`, `nr-iconbtn--${size}`, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Input ---------------- */
type InputProps = {
  label?: string;
  hint?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
  prefix?: ReactNode;
  suffix?: ReactNode;
  mono?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">;

export function Input({
  label,
  hint,
  error,
  size = "md",
  required,
  disabled,
  prefix,
  suffix,
  mono,
  id,
  className = "",
  ...rest
}: InputProps) {
  const fid = id || (label ? "nr-" + label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className={cx("nr-field", className)}>
      {label && (
        <label className="nr-field__label" htmlFor={fid}>
          {label}
          {required && <span className="nr-req">*</span>}
        </label>
      )}
      <div className={cx("nr-field__wrap", `nr-field__wrap--${size}`, error && "nr-field__wrap--error", disabled && "nr-field__wrap--disabled")}>
        {prefix && <span className="nr-field__affix">{prefix}</span>}
        <input
          id={fid}
          className={cx("nr-field__input", mono && "nr-field__input--mono")}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          {...rest}
        />
        {suffix && <span className="nr-field__affix">{suffix}</span>}
      </div>
      {(hint || error) && (
        <span className={cx("nr-field__hint", error && "nr-field__hint--error")}>{error || hint}</span>
      )}
    </div>
  );
}

/* ---------------- Select ---------------- */
type SelectOption = { value: string; label: string };
type SelectProps = {
  label?: string;
  hint?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
  options: SelectOption[];
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">;

export function Select({
  label,
  hint,
  error,
  size = "md",
  options,
  placeholder,
  required,
  disabled,
  id,
  className = "",
  ...rest
}: SelectProps) {
  const fid = id || (label ? "nr-" + label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className={cx("nr-field", className)}>
      {label && (
        <label className="nr-field__label" htmlFor={fid}>
          {label}
          {required && <span className="nr-req">*</span>}
        </label>
      )}
      <div className={cx("nr-field__wrap", `nr-field__wrap--${size}`, error && "nr-field__wrap--error", disabled && "nr-field__wrap--disabled")}>
        <select id={fid} className="nr-field__input nr-field__select" disabled={disabled} aria-invalid={error ? "true" : undefined} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="nr-field__affix"><Icon name="chevronDown" size={16} /></span>
      </div>
      {(hint || error) && (
        <span className={cx("nr-field__hint", error && "nr-field__hint--error")}>{error || hint}</span>
      )}
    </div>
  );
}

/* ---------------- Switch ---------------- */
type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked, defaultChecked, onChange, label, disabled = false, className = "" }: SwitchProps) {
  return (
    <label className={cx("nr-switch", disabled && "nr-switch--disabled", className)}>
      <input type="checkbox" role="switch" checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled} />
      <span className="nr-switch__track">
        <span className="nr-switch__thumb" />
      </span>
      {label && <span className="nr-switch__label">{label}</span>}
    </label>
  );
}

/* ---------------- Badge ---------------- */
export type StatusKind = "confirmado" | "concluido" | "cancelado" | "pendente" | "disponivel";
type BadgeProps = {
  status?: StatusKind;
  tone?: "neutral" | "brass" | "solid";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
  children?: ReactNode;
};

const STATUS_LABEL: Record<StatusKind, string> = {
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  pendente: "Pendente",
  disponivel: "Disponível",
};

export function Badge({ status, tone = "neutral", size = "md", dot = false, className = "", children }: BadgeProps) {
  const kind = status || tone;
  const showDot = dot || !!status;
  return (
    <span className={cx("nr-badge", `nr-badge--${kind}`, `nr-badge--${size}`, className)}>
      {showDot && <span className="nr-badge__dot" />}
      {children || (status && STATUS_LABEL[status])}
    </span>
  );
}

/* ---------------- Card ---------------- */
type CardProps = {
  elevation?: "none" | "sm" | "md";
  padded?: boolean;
  interactive?: boolean;
  title?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function Card({
  elevation = "sm",
  padded = false,
  interactive = false,
  title,
  action,
  footer,
  className = "",
  children,
  ...rest
}: CardProps) {
  const structured = title || action || footer;
  const elev = elevation === "md" ? "nr-card--raised" : elevation === "none" ? "nr-card--flat" : "";
  const cls = cx("nr-card", elev, padded && !structured && "nr-card--pad", interactive && "nr-card--interactive", className);
  if (!structured) {
    return (
      <div className={cls} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <div className={cls} {...rest}>
      {(title || action) && (
        <div className="nr-card__head">
          {title && <span className="nr-card__title">{title}</span>}
          {action && <span className="nr-card__action">{action}</span>}
        </div>
      )}
      <div className="nr-card__body">{children}</div>
      {footer && <div className="nr-card__foot">{footer}</div>}
    </div>
  );
}

/* ---------------- Money ---------------- */
// Toda figura financeira passa por aqui: mono, tabular, com centavos atenuados.
// `value` chega SEMPRE em centavos; a conversão para reais é feita por
// formatBRLParts (lib/money.ts) — fonte única, nunca dividir por 100 aqui.
type MoneyProps = {
  value?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  tone?: "default" | "credit" | "debit" | "muted" | "auto";
  sign?: "auto" | "always";
  symbol?: boolean;
  className?: string;
};

export function Money({ value = 0, size = "md", tone = "default", sign = "auto", symbol = true, className = "" }: MoneyProps) {
  const { negative, integer, fraction } = formatBRLParts(value);
  const resolved = tone === "auto" ? (value < 0 ? "debit" : value > 0 ? "credit" : "default") : tone;
  const prefix = negative ? "−" : sign === "always" && value > 0 ? "+" : "";
  return (
    <span className={cx("nr-money", `nr-money--${size}`, resolved !== "default" && `nr-money--${resolved}`, className)}>
      {prefix}
      {symbol && <span className="nr-money__sym">R$</span>}
      {integer}
      <span className="nr-money__cents">,{fraction}</span>
    </span>
  );
}

/* ---------------- Avatar ---------------- */
const SEEDS = ["#6A5E50", "#8C601A", "#234A8C", "#1F6B41", "#9E2F28", "#4D433A"];
function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
function seedColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SEEDS[h % SEEDS.length];
}

type AvatarProps = {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg";
  ring?: boolean;
  status?: "online" | "busy" | "away";
  className?: string;
};

export function Avatar({ name = "", src, size = "md", ring = false, status, className = "" }: AvatarProps) {
  const statusColor =
    status === "online" ? "var(--green-text)" : status === "busy" ? "var(--red-text)" : status === "away" ? "var(--amber-text)" : null;
  return (
    <span className={cx("nr-avatar", `nr-avatar--${size}`, ring && "nr-avatar--ring", className)} style={src ? undefined : { background: seedColor(name) }}>
      {src ? <img className="nr-avatar__img" src={src} alt={name} /> : initials(name)}
      {statusColor && <span className="nr-avatar__status" style={{ background: statusColor }} />}
    </span>
  );
}

/* ---------------- MetricCard ---------------- */
type MetricCardProps = {
  label: string;
  value: ReactNode;
  money?: boolean;
  icon?: ReactNode;
  delta?: number;
  note?: string;
  accent?: boolean;
  className?: string;
};

export function MetricCard({ label, value, money = false, icon, delta, note, accent = false, className = "" }: MetricCardProps) {
  return (
    <div className={cx("nr-metric", accent && "nr-metric--accent", className)}>
      <div className="nr-metric__top">
        {icon && <span className="nr-metric__icon">{icon}</span>}
        <span className="nr-metric__label">{label}</span>
      </div>
      {money ? <Money value={typeof value === "number" ? value : 0} size="lg" /> : <span className="nr-metric__value">{value}</span>}
      {(delta != null || note) && (
        <div className="nr-metric__foot">
          {delta != null && (
            <span className={`nr-metric__delta nr-metric__delta--${delta >= 0 ? "up" : "down"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>
          )}
          {note && <span className="nr-metric__note">{note}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------------- ListItem ---------------- */
type ListItemProps = {
  time?: ReactNode;
  railColor?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  divided?: boolean;
  onClick?: () => void;
  className?: string;
};

export function ListItem({ time, railColor, leading, title, subtitle, trailing, divided = false, onClick, className = "" }: ListItemProps) {
  const isButton = !!onClick;
  const cls = cx("nr-li", isButton && "nr-li--button", divided && "nr-li--divided", className);
  const inner = (
    <>
      {time && <span className="nr-li__time">{time}</span>}
      {railColor && <span className="nr-li__rail" style={{ background: railColor }} />}
      {leading}
      <span className="nr-li__main">
        <span className="nr-li__title">{title}</span>
        {subtitle && <span className="nr-li__sub">{subtitle}</span>}
      </span>
      {trailing && <span className="nr-li__trail">{trailing}</span>}
    </>
  );
  return isButton ? (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/* ---------------- Tabs ---------------- */
type TabItem = string | { id: string; label: string; count?: number };
type TabsProps = {
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  fullWidth?: boolean;
  className?: string;
};

export function Tabs({ items, value, onChange, fullWidth = false, className = "" }: TabsProps) {
  return (
    <div className={cx("nr-tabs", fullWidth && "nr-tabs--full", className)} role="tablist">
      {items.map((it) => {
        const id = typeof it === "string" ? it : it.id;
        const label = typeof it === "string" ? it : it.label;
        const count = typeof it === "string" ? undefined : it.count;
        return (
          <button key={id} type="button" role="tab" aria-selected={id === value} className="nr-tab" onClick={() => onChange?.(id)}>
            {label}
            {count != null && <span className="nr-tab__count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Modal ---------------- */
// Controlado pelo pai (open/onClose); sem hooks aqui para o módulo do DS seguir
// importável por Server Components.
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, footer, children, className = "" }: ModalProps) {
  if (!open) return null;
  return (
    <div className="nr-modal" role="dialog" aria-modal="true">
      <div className="nr-modal__scrim" onClick={onClose} />
      <div className={cx("nr-modal__panel", className)}>
        <div className="nr-modal__head">
          {title && <span className="nr-modal__title">{title}</span>}
          <IconButton label="Fechar" variant="ghost" size="sm" className="nr-modal__close" onClick={onClose}>
            <Icon name="x" size={18} />
          </IconButton>
        </div>
        <div className="nr-modal__body">{children}</div>
        {footer && <div className="nr-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
