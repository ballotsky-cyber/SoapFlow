# SoapFlow

Interactive demo of a multi-warehouse soap distribution operations app: inventory, receiving, transfers, procurement, sales, dispatch, finance, reports and administration.

The demo runs entirely in the browser. It has no backend: an illustrative dataset and simulated business rules (stock postings, weighted-average cost, reservations, maker-checker approvals, audit trail) live in a client-side engine and are saved to `localStorage`. Use **Profile menu → Reset demonstration data** to restore the seed, and **Switch demo role** to see the app as different roles.

## Stack

- Next.js (App Router) · React · TypeScript
- Tailwind CSS v4 with CSS-variable design tokens (`src/app/globals.css`), using one brand colour
- An in-house shadcn-style component kit on Radix primitives (`src/components/ui`)
- `lucide-react` icons, `react-day-picker` + `date-fns` for the date picker

## Project layout

```
src/
  app/                    root layout, global tokens, catch-all route → client app
  components/
    ui/                   reusable primitives: Button, Input, Select, DropdownMenu, DatePicker, Dialog, Tabs, Table, Badge, Card, Checkbox/Radio/Switch, Pagination…
    shared/               app-level building blocks: Page, PageHeader, DetailHeader, StatCard, StatusBadge…
    app/                  shell: sidebar, top bar, search, notifications, role switcher, toasts, confirm dialog, routing
  features/<module>/      one folder per module (dashboard, inventory, catalogue, stock-control, receiving, transfers, procurement, sales, dispatch, finance, reports, admin)
  lib/store/              demo engine (engine.js), its types, and the useSoap() hook + URL ↔ route mapping
```

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck
```

Deep links work, for example `/sales-orders/SO-2026-1201` or `/inventory?tab=batches`.
