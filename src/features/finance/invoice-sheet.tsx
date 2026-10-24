"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fact, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { toMinor } from "./money";
import type { CreditNote, Payment } from "./types";

/** Right-hand drawer with invoice detail, allocations and the credit-note form. (The kit has no Sheet, so it is built on the Radix dialog here.) */
export function InvoiceSheet({ id, onClose, onPay }: { id: string; onClose: () => void; onPay: (customer: string, inv: string) => void }) {
  const S = useSoap();
  const s = S.s;
  const [cn1, setCn] = React.useState({ amount: "", reason: "" });
  const i0 = s.invoices.find((x) => x.id === id);
  if (!i0) return null;

  const status = S.invStatus(i0);
  const bal = S.invBal(i0);
  const canVerify = S.can("fin.verify");
  const allocs: { key: string; ref: string; meta: string; v: string }[] = [];
  (s.payments as Payment[]).forEach((p) =>
    p.alloc.filter((a) => a.inv === i0.id).forEach((a, k) => allocs.push({ key: p.id + k, ref: p.id, meta: p.method + " · " + S.fmtDate(p.date) + " · " + p.status, v: (p.status === "Reversed" ? "reversed " : "") + S.money(a.amount) })),
  );
  (s.creditNotes as CreditNote[]).filter((n) => n.inv === i0.id).forEach((n) => allocs.push({ key: n.id, ref: n.id, meta: "Credit note · " + n.reason, v: S.money(n.amount) }));
  const lines = i0.lines || [];
  const meta = (i0.so ? i0.so + " · " : "") + (i0.dsp ? i0.dsp + " · " : "") + "issued " + S.fmtDate(i0.date) + " · due " + S.fmtDate(i0.due);

  const issueCn = () => {
    const r = S.creditNote(i0.id, toMinor(cn1.amount), cn1.reason.trim());
    S.result(r, "Credit note issued");
    if (r.ok) setCn({ amount: "", reason: "" });
  };

  return (
    <D.Root open onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[100] bg-overlay backdrop-blur-[2px] animate-fade-in" />
        <D.Content className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-[560px] flex-col border-l bg-card shadow-pop outline-none animate-fade-in">
          <div className="flex justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Ref className="text-sm">{i0.id}</Ref>
                <StatusBadge status={status} />
              </div>
              <D.Title className="mt-1 text-base font-semibold">{S.cust(i0.customer).name}</D.Title>
              <D.Description className="text-xs text-muted-foreground">{meta}</D.Description>
            </div>
            <D.Close className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-auto px-5 py-4 text-[12.5px]">
            <div className="grid grid-cols-2 gap-2">
              <Fact k="Total" v={<span className="tabular">{S.money(i0.total)}</span>} />
              <Fact k="Balance due" v={<span className={cn("tabular", status === "Overdue" && "text-danger")}>{S.money(bal)}</span>} />
              <Fact k="Paid" v={<span className="tabular text-success">{S.money(i0.paid)}</span>} />
              <Fact k="Credited" v={<span className="tabular text-muted-foreground">{S.money(i0.credited)}</span>} />
            </div>
            <div>
              <div className="mb-1.5 font-semibold">Lines</div>
              {lines.map((l, k) => (
                <div key={k} className="flex justify-between gap-2 border-b py-1.5 last:border-0">
                  <span className="min-w-0">{l.sku + " · " + S.qty(l.sku, l.qty) + " @ " + S.money(l.price) + (l.discPct ? " −" + l.discPct + "%" : "")}</span>
                  <span className="tabular">{S.money(l.qty * l.price - Math.round((l.qty * l.price * l.discPct) / 100))}</span>
                </div>
              ))}
              {!lines.length && <div className="text-muted-foreground">Opening-balance invoice (no line detail in demo data).</div>}
            </div>
            <div>
              <div className="mb-1.5 font-semibold">Payments &amp; credits allocated</div>
              {allocs.map((a) => (
                <div key={a.key} className="flex justify-between gap-2 border-b py-1.5 last:border-0">
                  <span className="min-w-0"><span className="font-mono">{a.ref}</span> · {a.meta}</span>
                  <span className="whitespace-nowrap tabular text-success">{a.v}</span>
                </div>
              ))}
              {!allocs.length && <div className="text-muted-foreground">Nothing allocated yet.</div>}
            </div>
            {canVerify && bal > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="font-semibold">Issue credit note</div>
                <div className="flex flex-wrap gap-2">
                  <Input value={cn1.amount} onChange={(e) => setCn((c) => ({ ...c, amount: e.target.value }))} inputMode="decimal" placeholder="Amount GHS" className="h-8 w-full text-right tabular sm:w-32" />
                  <Input value={cn1.reason} onChange={(e) => setCn((c) => ({ ...c, reason: e.target.value }))} placeholder="Reason (required)" className="h-8 min-w-0 flex-1 basis-40" />
                  <Button size="sm" variant="outline" onClick={issueCn}>Issue</Button>
                </div>
              </div>
            )}
          </div>
          {S.can("fin.record") && bal > 0 && (
            <div className="flex justify-end border-t px-5 py-3">
              <Button onClick={() => onPay(i0.customer, i0.id)}>Record payment for this invoice</Button>
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
