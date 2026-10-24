"use client";

import { Printer } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";

/** Printable goods-received note for a posted receipt. */
export function GrnPrintDialog({ g, onClose }: { g: Doc; onClose: () => void }) {
  const S = useSoap();
  const th = "border-b border-foreground px-1.5 py-1.5 text-[11px] font-semibold";
  const td = "border-b px-1.5 py-1.5";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" hideClose aria-describedby={undefined}>
        <D.Title className="sr-only">{"Goods-received note " + g.id}</D.Title>
        <div className="flex flex-col gap-3.5 px-5 py-6 text-[12.5px] sm:px-8 sm:py-7">
          <div className="flex flex-wrap justify-between gap-3 border-b-2 border-foreground pb-2.5">
            <div>
              <div className="text-lg font-bold">Goods-Received Note</div>
              <div className="text-muted-foreground">{S.s.settings.company} · {S.wh(g.wh).name}</div>
            </div>
            <div className="sm:text-right">
              <div className="font-mono text-sm font-semibold">{g.id}</div>
              <div className="text-muted-foreground">Posted {S.fmtDate(g.postedAt)}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
            <span>Supplier: <b>{S.sup(g.supplier).name}</b></span>
            <span>Purchase order: <b>{g.po || "None"}</b></span>
            <span>Truck: <b>{g.truck}</b></span>
            <span>Delivery note: <b>{g.dn}</b></span>
            <span>Received by: <b>{S.uname(g.by)}</b></span>
            <span>Approved by: <b>{S.uname(g.postedBy)}</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${th} text-left`}>Product</th>
                  <th className={`${th} text-right`}>Expected</th>
                  <th className={`${th} text-right`}>Accepted</th>
                  <th className={`${th} text-right`}>Damaged</th>
                  <th className={`${th} text-right`}>Rejected</th>
                  <th className={`${th} text-left`}>Batch</th>
                </tr>
              </thead>
              <tbody>
                {g.lines.map((l) => (
                  <tr key={l.sku}>
                    <td className={`${td} min-w-[160px]`}>{l.sku + " " + S.prod(l.sku).name}</td>
                    <td className={`${td} text-right whitespace-nowrap tabular`}>{S.qty(l.sku, l.expected)}</td>
                    <td className={`${td} text-right whitespace-nowrap tabular`}>{S.qty(l.sku, l.accepted)}</td>
                    <td className={`${td} text-right whitespace-nowrap tabular`}>{S.qty(l.sku, l.damaged)}</td>
                    <td className={`${td} text-right whitespace-nowrap tabular`}>{S.qty(l.sku, l.rejected)}</td>
                    <td className={td}>{l.batch || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-secondary-foreground">Notes: {g.notes || "No discrepancy notes."}</div>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-5">
            <div className="border-t border-foreground pt-1">Storekeeper</div>
            <div className="border-t border-foreground pt-1">Warehouse manager</div>
            <div className="border-t border-foreground pt-1">Supplier driver</div>
          </div>
          <div className="text-[10.5px] text-subtle-foreground">Demonstration document — generated from illustrative data.</div>
        </div>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
