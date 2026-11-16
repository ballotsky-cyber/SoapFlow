# SoapFlow

Interactive demo of a multi-warehouse soap distribution operations app: inventory, receiving, transfers, procurement, products, sales (estimates → orders → invoices → payments → receipts), deliveries, finance, reports and administration.

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
  lib/store/              demo engine (engine.js), commercial module (commerce.ts), types, and the useSoap() hook + URL ↔ route mapping
tests/                    node:test suites run against the real engine
```

## Commercial module

`src/lib/store/commerce.ts` is installed into the engine and enforces every commercial rule (the screens only pre-validate):

- **Products** — categories, brands, units of measurement and per-product unit conversions (e.g. 1 carton = 24 pieces, 1 pallet = 9,600 bars), tax rates, images, reorder levels. Products used in any transaction cannot be deleted, only discontinued.
- **Document chain** — Product → Customer → Estimate → Sales order → Invoice → Payment → Receipt, plus direct sales orders, direct invoices, credit notes and customer returns. Every link is stored and shown as *Related documents*; every action is written to the audit trail.
- **Snapshots** — document lines keep the product name, unit conversion, unit price and tax rate they were created with, so catalogue changes never alter issued documents.
- **Invoicing** — orders can be invoiced in several partial invoices; ordered, delivered, invoiced and invoiceable quantities are tracked per line and over-invoicing is blocked. Settings choose whether confirmed orders can be invoiced before delivery or only delivered quantities, and whether dispatch raises invoices automatically. Issued invoices are never edited: corrections go through credit notes or voids.
- **Stock** — estimates, orders and invoices never move stock. Confirmation reserves (optionally with backorders); stock is deducted once, at dispatch. Returned goods go to quarantine and come back to sellable stock only after inspection.
- **Status independence** — order, fulfilment, invoice and payment statuses are tracked separately.
- **Numbering** — references are unique across browser tabs (shared counter + collision check). Saved demo data is migrated forward (`SCHEMA` version) rather than reset.

Money is integer pesewas, quantities are integer base units, tax rates are basis points. PDFs use the browser's print dialog (*Save as PDF*); *Send* marks the document as sent and opens the user's email client — there is no mail server in the demo.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck
npm test           # workflow tests against the engine (Node 22+, no extra dependencies)
```

Deep links work, for example `/sales-orders/SO-2026-1201`, `/invoices?action=new&so=SO-2026-1201` or `/inventory?tab=batches`.
