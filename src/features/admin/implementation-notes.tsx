import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NOTES: { title: string; dot: string; items: string[] }[] = [
  {
    title: "Simulated in the browser (prototype only)",
    dot: "bg-warning",
    items: [
      "All data is illustrative and stored in this browser (localStorage). “Reset demonstration data” restores the seed set.",
      "Role switching is a demo convenience; permissions, warehouse access and approval controls are evaluated client-side to show the intended UI.",
      "Stock postings, weighted-average recalculation, reservations, invoices, credit notes and audit entries are computed in a single-threaded script — no real concurrency, locking or transactions.",
      "Document numbers use a counter shared between browser tabs plus a collision check, and tabs adopt each other’s saved changes. This is best-effort for one browser — real multi-user numbering needs a database sequence.",
      "“Download PDF” uses the browser’s print dialog (Save as PDF). “Send” records the send in the audit trail and opens the user’s email client; there is no mail server.",
      "Financial trend history (revenue/COGS before today) is a generated series; transactions you post today are added on top.",
      "File attachments (POD, evidence, supplier documents) record the file name only; nothing is uploaded. Exports produce CSV in the browser.",
      "Payments are never “verified” by a bank or mobile-money provider — verification is a manual finance step in both prototype and production.",
    ],
  },
  {
    title: "Must be enforced by the backend",
    dot: "bg-primary",
    items: [
      "Authentication, role-based authorisation and per-user warehouse scoping on every endpoint (403 + audit on denial). UI hiding is never the control.",
      "Stock balances derived only from an append-only inventory_movements table; posted receipts, dispatches, transfers, adjustments and payments are immutable — corrections are reversing entries.",
      "Atomic posting (single DB transaction per document) with idempotency keys so a double-click or retry cannot duplicate stock or payments; unique constraints on document refs and external payment references.",
      "Concurrency-safe reservations (SELECT … FOR UPDATE / optimistic versioning on inventory_balances) so two orders cannot reserve the same stock; CHECK constraints preventing negative sellable stock.",
      "Moving weighted-average cost with fixed-point NUMERIC(19,4) unit costs and NUMERIC(19,2) money; cost carried on transfers; COGS captured at dispatch.",
      "Maker-checker approvals (requester ≠ approver) for adjustments, opening balances, receipts, expenses and credit overrides; FEFO and expiry blocking at dispatch.",
      "Server-side audit log written in the same transaction as the change; Flyway-managed schema migrations.",
    ],
  },
];

const API_MAP: [string, string][] = [
  ["Product catalogue form", "POST/PUT /api/products · /api/packaging-units"],
  ["Goods receipt wizard", "POST /api/goods-receipts → POST /{id}/submit → POST /{id}/post"],
  ["Transfer actions", "POST /api/stock-transfers/{id}/approve | dispatch | receive"],
  ["Purchase order", "POST /api/purchase-orders → /{id}/approve"],
  ["Estimate", "POST/PUT /api/estimates → /{id}/send | accept | reject | duplicate | convert"],
  ["Sales order", "POST/PUT /api/sales-orders (reserve) → /{id}/approve | cancel"],
  ["Invoice", "POST /api/invoices (direct or { salesOrderId, lines[] }) → /{id}/issue | cancel | void | send | fulfil"],
  ["Credit note & return", "POST /api/credit-notes → /api/customer-returns/{id}/receive | inspect"],
  ["Dispatch & delivery", "POST /api/dispatches → /{id}/verify | handover | depart | delivery-outcome"],
  ["Customer payment", "POST /api/customer-payments (allocations[]) → /{id}/verify | reverse"],
  ["Stock adjustment / count", "POST /api/stock-adjustments → /{id}/approve; /api/stock-counts"],
  ["Reports", "GET /api/reports/{key}?from&to&warehouseId&brand&sku (CSV/XLSX)"],
  ["Users & roles", "GET/PATCH /api/users/{id} · /api/roles"],
  ["Audit trail", "GET /api/audit-logs (read-only)"],
];

/** "Implementation notes" tab of Settings (route tab=notes). */
export function ImplementationNotes() {
  return (
    <Card className="flex max-w-[980px] flex-col gap-4 px-4 py-5 text-[13px] leading-relaxed sm:px-6">
      <div>
        <div className="text-base font-semibold">Implementation notes</div>
        <div className="text-muted-foreground">What this prototype simulates, and what the production backend (React + TypeScript · Spring Boot REST · PostgreSQL · Flyway) must provide.</div>
      </div>
      {NOTES.map((n) => (
        <div key={n.title} className="flex flex-col gap-1.5">
          <div className="font-semibold">{n.title}</div>
          {n.items.map((i) => (
            <div key={i} className="grid grid-cols-[14px_1fr] gap-1.5 text-secondary-foreground">
              <span className={cn("mt-2 size-1.5 rounded-full", n.dot)} />
              <span>{i}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-muted/70">
            <tr>
              <th className="border-b px-2.5 py-2 text-left font-semibold">Screen / form</th>
              <th className="border-b px-2.5 py-2 text-left font-semibold">Resource &amp; operation</th>
            </tr>
          </thead>
          <tbody>
            {API_MAP.map(([sc, r]) => (
              <tr key={sc}>
                <td className="border-b px-2.5 py-1.5 align-top">{sc}</td>
                <td className="min-w-[220px] border-b px-2.5 py-1.5 font-mono text-[11.5px]">{r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
