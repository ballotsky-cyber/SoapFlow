"use client";

import { useSoap } from "@/lib/store";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { SupplierInvoice, SupplierPayment } from "./types";

/** Supplier invoices with 3-way match, plus supplier payments. */
export function SupplierTab() {
  const S = useSoap();
  const s = S.s;
  const sinv = s.supplierInvoices as SupplierInvoice[];
  const spay = s.supplierPayments as SupplierPayment[];

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader title="Supplier invoices — matched to PO and goods receipts" />
        <Table>
          <THead>
            <tr>
              <TH>Invoice</TH>
              <TH>Supplier</TH>
              <TH>PO / receipt</TH>
              <TH>Due</TH>
              <TH align="right">Total</TH>
              <TH align="right">Paid</TH>
              <TH align="right">Balance</TH>
              <TH>3-way match</TH>
            </tr>
          </THead>
          <TBody>
            {sinv.map((i) => {
              const m = S.sinvMatch(i);
              return (
                <TR key={i.id}>
                  <TD nowrap className="font-mono text-[11.5px]">{i.id}</TD>
                  <TD nowrap>{S.sup(i.supplier).name}</TD>
                  <TD nowrap className="font-mono text-[11.5px]">{i.po + (i.grn ? " / " + i.grn : " / no receipt")}</TD>
                  <TD nowrap className={i.due < S.TODAY && i.total > i.paid ? "text-danger" : "text-muted-foreground"}>{S.fmtDate(i.due)}</TD>
                  <TD nowrap align="right">{S.money(i.total)}</TD>
                  <TD nowrap align="right" className="text-success">{S.money(i.paid)}</TD>
                  <TD nowrap align="right">{S.money(i.total - i.paid)}</TD>
                  <TD className={cn("min-w-[200px] text-xs", m.length ? "text-danger" : "text-success")}>{m.length ? "Mismatch: " + m.join("; ") : "Matched"}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Supplier payments" />
        {spay.map((p) => (
          <div key={p.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b px-4 py-2.5 text-[12.5px] last:border-0">
            <span className="min-w-0">
              <span className="font-mono">{p.id}</span> · {S.sup(p.supplier).name} · {S.fmtDate(p.date)} · {p.method} <span className="font-mono text-muted-foreground">{p.ref}</span>
            </span>
            <span className="tabular">
              <b>{S.money(p.amount)}</b> → {p.alloc.map((a) => a.inv).join(", ")}
            </span>
          </div>
        ))}
        {!spay.length && <EmptyState title="No supplier payments yet." />}
      </Card>
    </>
  );
}
