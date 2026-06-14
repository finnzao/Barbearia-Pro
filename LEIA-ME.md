# NaRégua — Frontend com Design System integrado

Monorepo `pnpm` + `turbo` com o app web (Next.js) já vestido com o **NaRégua Design System**
e o **fluxo do cliente** (as etapas de agendamento) implementado de ponta a ponta.

```
apps/
  web/   Next.js (App Router) — painel do dono + fluxo do cliente
  api/   NestJS — esqueleto da API (porta 3333, prefixo /api)
```

## Rodando

```bash
pnpm install
pnpm dev            # sobe web (3000) e api (3333)
```

- Painel do dono: http://localhost:3000/painel
- Fluxo do cliente: http://localhost:3000/agendar

## O que foi integrado do Design System

Os tokens e componentes foram portados para dentro do app em `apps/web/src/ds/`:

- `tokens.css` — cores (stone + brass), tipografia, espaçamento, raios, sombras e movimento.
  As fontes (Archivo, Bricolage Grotesque, JetBrains Mono) são carregadas via `next/font` no
  `layout.tsx` e ligadas aos tokens.
- `components.tsx` — os 11 primitivos tipados (Button, IconButton, Input, Switch, Badge, Card,
  Money, Avatar, MetricCard, ListItem, Tabs). O CSS vive em `components.css` (global), então os
  componentes renderizam igual no servidor e no cliente, sem flash de estilo.
- `icons.tsx` — o icon set (Lucide) como componente `Icon` tipado.

As telas do painel (visão geral, agenda, comissões, profissionais, serviços) foram reconstruídas
com esses componentes. Dinheiro, contagens e horas usam sempre a fonte mono, como manda a marca.

## As duas opções do dono (Configurações)

Em **/painel/configuracoes** o dono controla como o cliente agenda:

1. **Cliente escolhe o profissional** — ligado, o cliente seleciona quem corta; desligado, o
   agendamento vai para o "primeiro disponível".
2. **Cliente escolhe o serviço antes do horário** — ligado, ele define o serviço (e vê o preço)
   antes de marcar; desligado, só reserva o horário e o serviço é definido no balcão.

Essas duas opções **alteram as etapas** do fluxo do cliente em `/agendar`:

- A etapa de serviço só existe quando "escolher serviço" está ligada.
- O seletor de profissional só aparece quando "escolher profissional" está ligada.
- O contador de passos e a navegação se ajustam sozinhos.

O contrato fica em `apps/web/src/lib/settings.ts`. Hoje o padrão vem de `CONFIG_PADRAO`; o botão
"Pré-visualizar" abre o `/agendar` no modo escolhido via querystring
(`/agendar?profissional=0&servico=1`). Quando a API existir, essas flags viram colunas em
`config_barbearia`, escopadas por `barbearia_id`.

## Observações de engenharia

- Sem dependências novas além do que o Next/Tailwind já trazem — o DS é CSS + React puro.
- Os dados são mockados em `apps/web/src/lib/mock-data.ts`; as funções têm a mesma forma que as
  chamadas de API terão depois, então as telas não mudam quando o backend entrar.
- API e web não colidem de porta: a API roda em 3333.
