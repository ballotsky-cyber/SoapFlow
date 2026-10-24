"use client";

import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { Payment, SupplierInvoice, SupplierPayment } from "./types";

/** Customer payments: verify / reverse (fin.verify). */
export function PaymentsTab() {
  const S = useSoap();
  const s = S.s;
  const canVerify = S.can("fin.verify");
  const payments = s.payments as Payment[];

  const reverse = (p: Payment) =>
    S.confirm({
      title: "Reverse " + p.id + "?",
      body: "Allocations are removed and invoice balances restored. The original payment stays on record as Reversed.",
      confirmLabel: "Reverse payment",
      danger: true,
      reasonLabel: "Reason for reversal",
      onConfirm: (rs) => S.result(S.paymentAct(p.id, "reverse", rs), "Payment reversed"),
    });
  const verify = (p: Payment) =>
    S.confirm({
      title: "Verify " + p.id + "?",
      body: "Confirm you have matched " + S.money(p.amount) + (p.extRef ? " (ref " + p.extRef + ")" : "") + " to the " + p.method.toLowerCase() + " statement.",
      confirmLabel: "Mark verified",
      onConfirm: () => S.result(S.paymentAct(p.id, "verify"), "Payment verified"),
    });

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Payment</TH>
              <TH>Customer / allocation</TH>
              <TH>Received</TH>
              <TH align="right">Amount</TH>
              <TH>Method / ext. ref</TH>
              <TH>Received by</TH>
              <TH>Status</TH>
              <TH align="right"><span className="sr-only">Actions</span></TH>
            </tr>
          </THead>
          <TBody>
            {payments.map((p) => {
              const alloc = p.alloc.map((a) => a.inv + " " + S.money(a.amount)).join(", ") + (p.unallocated ? " · on account " + S.money(p.unallocated) : "");
              const note = p.status === "Verified" ? "by " + S.uname(p.verifiedBy) : p.status === "Recorded" ? "manual — not bank-confirmed" : p.reversal || "";
              return (
                <TR key={p.id} className={cn(s.route.id === p.id && "bg-primary-soft/50")}>
                  <TD nowrap className="font-mono text-[11.5px]">{p.id}</TD>
                  <TD className="min-w-[150px]">
                    {S.cust(p.customer).name}
                    <div className="text-[11px] text-muted-foreground">{alloc}</div>
                  </TD>
                  <TD nowrap className="text-muted-foreground">{S.fmtDate(p.date)}</TD>
                  <TD nowrap align="right" className="font-semibold">{S.money(p.amount)}</TD>
                  <TD nowrap>
                    {p.method}
                    <div className="font-mono text-[11px] text-muted-foreground">{p.extRef || "—"}</div>
                  </TD>
                  <TD nowrap>{S.uname(p.by)}</TD>
                  <TD nowrap>
                    <StatusBadge status={p.status} />
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{note}</div>
                  </TD>
                  <TD nowrap align="right">
                    {canVerify && p.status === "Recorded" && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="xs" variant="destructive-outline" onClick={() => reverse(p)}>Reverse</Button>
                        <Button size="xs" variant="success" onClick={() => verify(p)}>Verify</Button>
                      </div>
                    )}
                    {canVerify && p.status === "Verified" && (
                      <Button size="xs" variant="destructive-outline" onClick={() => reverse(p)}>Reverse</Button>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {!payments.length && <EmptyState title="No payments recorded." />}
      </Card>
      <div className="text-xs text-muted-foreground">Posted payments are never deleted. Corrections are made by an authorised reversal, which restores invoice balances and keeps the original record.</div>
    </>
  );
}

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
