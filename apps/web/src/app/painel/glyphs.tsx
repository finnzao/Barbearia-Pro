import type { CSSProperties, ReactNode } from "react";

const FORMAS: Record<string, ReactNode> = {
  inicio: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  agenda: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      <path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3" />
    </>
  ),
  pagamentos: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.4" />
      <path d="M3 10.5h18" />
      <path d="M16 14.75h2" />
    </>
  ),
  equipe: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.8 19.5a5.2 5.2 0 0 1 10.4 0" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.6M16.8 19.5a5.2 5.2 0 0 0-2-4.1" />
    </>
  ),
  pix: (
    <>
      <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="2.4" transform="rotate(45 12 12)" />
      <path d="M12 9.2v5.6M9.2 12h5.6" />
    </>
  ),
  cliente: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  servico: (
    <>
      <circle cx="6.5" cy="6.5" r="2.6" />
      <circle cx="6.5" cy="17.5" r="2.6" />
      <path d="M19.5 5 8.8 15.7M14.7 14.3 19.5 19M8.8 8.3l3.3 3.3" />
    </>
  ),
  relatorios: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="12" width="3.2" height="6" rx="1" />
      <rect x="10.4" y="8" width="3.2" height="10" rx="1" />
      <rect x="15.3" y="5" width="3.2" height="13" rx="1" />
    </>
  ),
  config: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" />
    </>
  ),
  novo: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  estrela: <path d="M12 4l2.2 4.6 5 .6-3.6 3.5.9 5L12 15.9 7.5 18.2l.9-5L4.8 9.7l5-.6z" />,
  estrelaCheia: <path d="M12 4l2.2 4.6 5 .6-3.6 3.5.9 5L12 15.9 7.5 18.2l.9-5L4.8 9.7l5-.6z" fill="currentColor" stroke="none" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Glyph({
  name,
  size = 24,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {FORMAS[name] ?? FORMAS.inicio}
    </svg>
  );
}
