"use client";

import { Printer } from "lucide-react";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Dialog as D } from "radix-ui";

/** Printable collection / dispatch note. While open, printing shows only this document. */
export function DispatchPrintDialog({ d: x, customer, title, onClose }: { d: Doc; customer: string; title: string; onClose: () => void }) {
  const S = useSoap();
  const coll = x.method === "Collection";
  const rows = x.lines.map((l) => ({
    p: l.sku + " " + S.prod(l.sku).name,
    q: S.qty(l.sku, l.dispatched),
    b: ((l.batches || []) as { batch: string; qty: number }[]).map((b) => b.batch + " ×" + b.qty).join(", ") || "—",
  }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" hideClose className="dsp-print-doc">
        <style>{`@media print { body * { visibility: hidden !important; } .dsp-print-doc, .dsp-print-doc * { visibility: visible !important; } .dsp-print-doc { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; border: 0 !important; box-shadow: none !important; } }`}</style>
        <D.Title className="sr-only">{title}</D.Title>
        <D.Description className="sr-only">{x.id}</D.Description>
        <DialogBody className="gap-3 px-5 py-6 text-[12.5px] sm:px-8">
          <div className="flex flex-wrap justify-between gap-3 border-b-2 border-foreground pb-2.5">
            <div>
              <div className="text-lg font-bold">{title}</div>
              <div className="text-muted-foreground">{S.s.settings.company} · {S.wh(x.wh).name}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-semibold">{x.id}</div>
              <div className="text-muted-foreground">{x.so} · {x.invoice || ""}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
            <span>Customer: <b>{customer}</b></span>
            <span>Dispatched: <b>{S.fmtDate(x.dispatchedAt)}</b></span>
            <span>{coll ? "Collected by" : "Recipient"}: <b>{x.collector || x.recipient || "—"}</b></span>
            <span>Proof ref: <b>{x.pod || x.collectorId || "—"}</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-foreground px-1.5 py-1 text-left text-[11px]">Product</th>
                  <th className="border-b border-foreground px-1.5 py-1 text-right text-[11px]">Handed over</th>
                  <th className="border-b border-foreground px-1.5 py-1 text-left text-[11px]">Batches</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border-b px-1.5 py-1">{r.p}</td>
                    <td className="border-b px-1.5 py-1 text-right whitespace-nowrap tabular">{r.q}</td>
                    <td className="border-b px-1.5 py-1 font-mono text-[11px]">{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-8">
            <div className="border-t border-foreground pt-1">Issued by (warehouse)</div>
            <div className="border-t border-foreground pt-1">Received by (customer)</div>
          </div>
          <div className="text-[10.5px] text-subtle-foreground">Demonstration document — illustrative data.</div>
        </DialogBody>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}><Printer />Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
