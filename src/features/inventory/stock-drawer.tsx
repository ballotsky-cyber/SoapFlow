"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Fact } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

/** Right-hand side sheet (the kit has no Sheet component; built on the same Radix dialog primitive). */
function Sheet({ onClose, header, footer, children }: { onClose: () => void; header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  return (
    <D.Root open onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[100] bg-overlay backdrop-blur-[2px] animate-fade-in" />
        <D.Content className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-[680px] flex-col border-l bg-card shadow-pop outline-none">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div className="min-w-0">{header}</div>
            <D.Close className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-4 sm:px-5">{children}</div>
          <div className="flex flex-wrap justify-end gap-2 border-t px-4 py-3 sm:px-5">{footer}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function StockDrawer({ sku, canAdjust, onClose }: { sku: string; canAdjust: boolean; onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();
  const allW = S.allowedWh();
  const costV = S.canView("cost.view");
  const warn = s.settings.expiryWarnDays;
  const p = S.prod(sku);
  const bpc = S.bpc(p.sku);

  const facts = [
    { k: "Packaging", v: `1 ctn = ${p.cartonPacks} pk × ${p.packBars} bars` },
    { k: "Bars per carton", v: String(bpc) },
    { k: "Selling price", v: S.money(p.price) + " /bar" },
    ...(costV ? [{ k: "Default purchase cost", v: S.cost(p.cost4) + " /bar" }] : []),
    { k: "Min. per warehouse", v: S.qty(p.sku, p.min) },
    { k: "Batch tracking", v: p.batch ? "Required" : "Not tracked" },
    { k: "Status", v: p.status },
  ];
  const whHead = ["Warehouse", "Sellable", "Reserved", "Available", "Damaged", "Quarantined", "In transit"].concat(costV ? ["Avg cost/bar"] : []);
  const batches = s.batches
    .filter((b) => b.sku === p.sku && b.qty > 0 && allW.includes(b.wh))
    .map((b) => {
      const days = S.diffDays(b.exp, S.TODAY);
      return { ...b, status: days < 0 ? "Expired" : days <= warn ? "Near expiry" : "Sellable" };
    });
  const moves = s.movements.filter((m) => m.sku === p.sku && sc.includes(m.wh)).slice(0, 12);

  return (
    <Sheet
      onClose={onClose}
      header={
        <>
          <div className="font-mono text-xs text-primary">{p.sku}</div>
          <D.Title className="mt-0.5 text-[17px] font-semibold tracking-tight">{p.name}</D.Title>
          <D.Description className="mt-0.5 text-[12.5px] text-muted-foreground">
            {p.brand} · {p.category} · {p.variant} · {p.size}
          </D.Description>
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => S.nav("catalogue", { id: p.sku })}>Product details</Button>
          {canAdjust && (
            <Button onClick={() => S.nav("stockcontrol", { action: "new", kind: "Request stock adjustment", sku: p.sku })}>Request adjustment</Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {facts.map((f) => <Fact key={f.k} k={f.k} v={f.v} />)}
      </div>

      <section>
        <div className="mb-1.5 text-[13px] font-semibold">Warehouse stock summary</div>
        <div className="overflow-hidden rounded-lg border">
          <Table className="text-xs">
            <THead>
              <tr>{whHead.map((h, i) => <TH key={h} align={i ? "right" : "left"}>{h}</TH>)}</tr>
            </THead>
            <TBody>
              {allW.map((w) => {
                const b = S.bal(w, p.sku);
                const cells = [S.wh(w).name, S.qty(p.sku, b.sellable), S.qty(p.sku, b.reserved), S.qty(p.sku, S.avail(w, p.sku)), S.qty(p.sku, b.damaged), S.qty(p.sku, b.quarantined), S.qty(p.sku, b.inTransit)].concat(
                  costV ? [S.cost(b.avg)] : [],
                );
                return (
                  <TR key={w}>
                    {cells.map((v, i) => <TD key={i} nowrap align={i ? "right" : "left"} className="py-2">{v}</TD>)}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </section>

      {batches.length > 0 && (
        <section>
          <div className="mb-1.5 text-[13px] font-semibold">Batches</div>
          {batches.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-1.5 text-xs last:border-0">
              <span><span className="font-mono">{b.batch}</span> · {S.wh(b.wh).name} · exp {S.fmtDate(b.exp)}</span>
              <span className="flex items-center gap-2 tabular">{S.qty(p.sku, b.qty)} <StatusBadge status={b.status} /></span>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-1.5 text-[13px] font-semibold">Movement history</div>
        {moves.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 border-b py-1.5 text-xs last:border-0 sm:grid-cols-[110px_1fr_auto]">
            <span className="text-muted-foreground">{S.fmtDate(m.ts)}</span>
            <span className="col-start-1 sm:col-start-auto">{m.type} · {S.wh(m.wh).name} · <span className="font-mono text-primary">{m.ref}</span></span>
            <span className={cn("row-span-2 row-start-1 self-center text-right font-medium tabular sm:row-span-1 sm:col-start-3", m.qty < 0 ? "text-danger" : "text-success")}>
              {(m.qty > 0 ? "+" : "") + S.qty(p.sku, m.qty)}
            </span>
          </div>
        ))}
        {!moves.length && <div className="text-xs text-muted-foreground">No movements in scope.</div>}
      </section>
    </Sheet>
  );
}
