"use client";

import * as React from "react";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Alert, Progress } from "@/components/ui/misc";
import { DetailHeader, Grid, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListRow, Totals } from "./parts";

export function PoDetail({ po: p }: { po: Doc }) {
  const S = useSoap();
  const s = S.s;
  const costV = S.canView("cost.view") || S.canView("po.create");
  const T = S.poTotals(p);
  const d = S.poDelivery(p);
  const invs = s.supplierInvoices.filter((i) => i.po === p.id);
  const flags: string[] = [];
  invs.forEach((i) => S.sinvMatch(i).forEach((x) => flags.push(i.id + " — " + x)));
  const receipts = s.receipts.filter((r) => r.po === p.id);

  const actions: React.ReactNode[] = [];
  if (p.status === "Draft" && S.can("po.create"))
    actions.push(<Button key="sub" onClick={() => S.result(S.poAct(p.id, "submit"), "PO submitted")}>Submit for approval</Button>);
  if (p.status === "Pending Approval" && S.can("po.approve")) {
    actions.push(
      <Button key="rej" variant="destructive-outline" onClick={() => S.confirm({ title: "Reject " + p.id + "?", body: "The supplier will not be sent this order.", confirmLabel: "Reject", danger: true, reasonLabel: "Reason", onConfirm: (rs) => S.result(S.poAct(p.id, "reject", rs), "PO rejected") })}>Reject</Button>,
    );
    actions.push(
      <Button key="app" onClick={() => S.confirm({ title: "Approve " + p.id + "?", body: "Commits " + S.money(T.total) + " with " + S.sup(p.supplier).name + ". Stock is not affected until goods are received and posted.", confirmLabel: "Approve", onConfirm: () => S.result(S.poAct(p.id, "approve"), "PO approved") })}>Approve PO</Button>,
    );
  }
  if (p.status === "Approved" && d !== "Fully received" && S.can("rcv.create"))
    actions.push(<Button key="rcv" onClick={() => S.nav("receiving", { action: "new" })}>Record delivery</Button>);

  const approvedTxt = p.approvedBy ? " · " + (p.status === "Rejected" ? "rejected" : "approved") + " by " + S.uname(p.approvedBy) : "";

  return (
    <>
      <DetailHeader
        backLabel="Purchase orders"
        onBack={() => S.nav("purchase-orders")}
        reference={<span className="inline-flex flex-wrap items-center gap-2">{p.id}<StatusBadge status={p.status} /><StatusBadge status={d} /></span>}
        title={S.sup(p.supplier).name}
        meta={`Deliver to ${S.wh(p.wh).name} · ordered ${S.fmtDate(p.date)} · expected ${S.fmtDate(p.expected)} · created by ${S.uname(p.by)}${approvedTxt}`}
        actions={actions.length ? actions : undefined}
      />
      {flags.map((f) => <Alert key={f} tone="danger">Three-way match: {f}</Alert>)}
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH align="right">Ordered</TH>
              <TH align="right">Received (posted)</TH>
              <TH align="right">Outstanding</TH>
              <TH align="right">Invoiced</TH>
              {costV && <TH align="right">Unit cost / ctn</TH>}
              {costV && <TH align="right">Line total</TH>}
            </tr>
          </THead>
          <TBody>
            {p.lines.map((l) => {
              const r = S.poReceived(p.id, l.sku);
              const iv = S.poInvoiced(p.id, l.sku);
              const out = Math.max(0, l.qty - r);
              return (
                <tr key={l.sku}>
                  <TD nowrap>{l.sku} · {S.prod(l.sku).name}</TD>
                  <TD nowrap align="right">{S.qty(l.sku, l.qty)}</TD>
                  <TD nowrap align="right" className={r >= l.qty ? "text-success" : undefined}>
                    {r ? S.qty(l.sku, r) : "—"}
                    <Progress value={l.qty ? (r / l.qty) * 100 : 0} tone="success" className="mt-1 ml-auto w-20" />
                  </TD>
                  <TD nowrap align="right" className={out ? "text-warning" : "text-subtle-foreground"}>{out ? S.qty(l.sku, out) : "—"}</TD>
                  <TD nowrap align="right" className={iv > r ? "text-danger" : undefined}>
                    {iv ? S.qty(l.sku, iv) : "—"}
                    <Progress value={l.qty ? (iv / l.qty) * 100 : 0} tone={iv > r ? "danger" : "primary"} className="mt-1 ml-auto w-20" />
                  </TD>
                  {costV && <TD nowrap align="right">{S.money(Math.round((l.cost4 * S.bpc(l.sku)) / 100))}</TD>}
                  {costV && <TD nowrap align="right">{S.money(S.valueOf(l.qty, l.cost4))}</TD>}
                </tr>
              );
            })}
          </TBody>
        </Table>
        {costV && (
          <div className="flex justify-end border-t px-4 py-3">
            <Totals
              rows={[
                { k: "Subtotal", v: S.money(T.sub) },
                { k: "Discount (" + p.discPct + "%)", v: "−" + S.money(T.disc) },
                { k: "Tax (" + p.taxPct + "%)", v: S.money(T.tax) },
                { k: "Expected total", v: S.money(T.total), strong: true },
              ]}
            />
          </div>
        )}
      </Card>
      <Grid min={380}>
        <Card className="overflow-hidden">
          <CardHeader title="Receipts against this PO" />
          {receipts.map((r) => (
            <ListRow key={r.id} onClick={() => S.nav("receiving", { id: r.id })} right={<StatusBadge status={r.status} />}>
              <Ref>{r.id}</Ref> · {S.fmtDate(r.arrival)} · {r.truck}
            </ListRow>
          ))}
          {!receipts.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">No deliveries yet.</div>}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Supplier invoices" />
          {invs.map((i) => (
            <ListRow key={i.id} right={`${S.money(i.total)} · bal ${S.money(i.total - i.paid)}`}>
              <span className="font-mono text-[11.5px]">{i.id}</span> · due {S.fmtDate(i.due)}
            </ListRow>
          ))}
          {!invs.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">No supplier invoices linked.</div>}
        </Card>
      </Grid>
    </>
  );
}
