"use client";

import * as React from "react";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Alert } from "@/components/ui/misc";
import { DetailHeader, Grid, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { Totals, ListRow } from "./parts";

const OPEN = ["Confirmed", "Ready for Collection", "Ready for Dispatch", "Partially Fulfilled"];

export function OrderDetail({ o: x }: { o: Doc }) {
  const S = useSoap();
  const s = S.s;
  const c = S.cust(x.customer);
  const tot = S.soTotal(x);
  const gross = x.lines.reduce((a, l) => a + l.qty * l.price, 0);
  const openish = OPEN.includes(x.status);

  const cancel = (
    <Button key="cancel" variant="destructive-outline" onClick={() => S.confirm({ title: "Cancel " + x.id + "?", body: "Any reserved stock is released back to available. Dispatched quantities are not affected.", confirmLabel: "Cancel order", danger: true, reasonLabel: "Cancellation reason", onConfirm: (rs) => S.result(S.soAct(x.id, "cancel", rs), "Order cancelled") })}>
      Cancel order
    </Button>
  );
  const actions: React.ReactNode[] = [];
  if (x.status === "Draft" && S.can("so.create")) {
    actions.push(cancel);
    actions.push(<Button key="confirm" onClick={() => S.result(S.soAct(x.id, "confirm"), "Order confirmed")}>Confirm &amp; reserve</Button>);
  }
  if (x.status === "Pending Approval" && S.can("so.approve")) {
    actions.push(
      <Button key="rej" variant="destructive-outline" onClick={() => S.confirm({ title: "Reject " + x.id + "?", body: "The order will be cancelled.", confirmLabel: "Reject", danger: true, reasonLabel: "Reason", onConfirm: (rs) => S.result(S.soAct(x.id, "reject", rs), "Order rejected") })}>Reject</Button>,
    );
    actions.push(
      <Button key="app" variant="success" onClick={() => S.confirm({ title: "Approve " + x.id + "?", body: (x.approvalReason ? "Flagged: " + x.approvalReason + ". " : "") + "Approval will reserve available stock at " + S.wh(x.wh).name + ".", confirmLabel: "Approve", onConfirm: () => S.result(S.soAct(x.id, "approve"), "Order approved") })}>Approve &amp; reserve</Button>,
    );
  }
  if (openish && (S.can("so.create") || S.can("so.approve"))) actions.push(cancel);
  if (openish && S.canView("dsp.view"))
    actions.push(
      <Button key="dsp" onClick={() => { const d = s.dispatches.find((dd) => dd.so === x.id && !dd.deducted && dd.status !== "Cancelled"); S.nav("dispatch", d ? { id: d.id } : { so: x.id }); }}>Open in dispatch</Button>,
    );

  const note: [string, "warning" | "info"] | null =
    x.status === "Pending Approval" ? ["Needs approval: " + (x.approvalReason || "") + ". No stock is reserved until approved.", "warning"]
    : x.status === "Cancelled" ? ["Cancelled" + (x.cancelReason ? ": " + x.cancelReason : "") + ". Reservations released.", "info"]
    : x.lines.some((l) => l.returned) ? ["Some goods were returned on delivery and moved to quarantine; a credit note was raised.", "warning"]
    : null;

  const meta = S.wh(x.wh).name + " · " + x.method + " · " + x.terms + (x.terms === "Credit" ? " (Net " + c.terms + ")" : "") + " · " + S.fmtDate(x.date) + " · by " + S.uname(x.by) + (x.address ? " · " + x.address : "");
  const dispatches = s.dispatches.filter((d) => d.so === x.id);
  const invoices = s.invoices.filter((i) => i.so === x.id);

  return (
    <>
      <DetailHeader
        backLabel="Sales orders"
        onBack={() => S.nav("sales-orders")}
        reference={<span className="inline-flex items-center gap-2">{x.id}<StatusBadge status={x.status} /></span>}
        title={c.name + (x.walkin ? " — " + x.walkin : "")}
        meta={meta}
        actions={actions.length ? actions : undefined}
      />
      {note && <Alert tone={note[1]}>{note[0]}</Alert>}
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH align="right">Ordered</TH>
              <TH align="right">Reserved</TH>
              <TH align="right">Fulfilled</TH>
              <TH align="right">Returned</TH>
              <TH align="right">Available now</TH>
              <TH align="right">Price/bar</TH>
              <TH align="right">Disc.</TH>
              <TH align="right">Line total</TH>
            </tr>
          </THead>
          <TBody>
            {x.lines.map((l) => (
              <tr key={l.sku}>
                <TD nowrap>{l.sku} · {S.prod(l.sku).name}</TD>
                <TD nowrap align="right">{S.qty(l.sku, l.qty)}</TD>
                <TD nowrap align="right" className="text-info">{l.reserved ? S.qty(l.sku, l.reserved) : "—"}</TD>
                <TD nowrap align="right" className={l.fulfilled >= l.qty ? "text-success" : undefined}>{l.fulfilled ? S.qty(l.sku, l.fulfilled) : "—"}</TD>
                <TD nowrap align="right" className={l.returned ? "text-danger" : "text-subtle-foreground"}>{l.returned ? S.qty(l.sku, l.returned) : "—"}</TD>
                <TD nowrap align="right">{S.qty(l.sku, S.avail(x.wh, l.sku))}</TD>
                <TD nowrap align="right">{S.money(l.price)}</TD>
                <TD nowrap align="right">{l.discPct ? l.discPct + "%" : "—"}</TD>
                <TD nowrap align="right">{S.money(l.qty * l.price - Math.round((l.qty * l.price * l.discPct) / 100))}</TD>
              </tr>
            ))}
          </TBody>
        </Table>
        <div className="flex justify-end border-t px-4 py-3">
          <Totals rows={[{ k: "Gross", v: S.money(gross) }, { k: "Discounts", v: S.money(tot - gross) }, { k: "Order total", v: S.money(tot), strong: true }]} />
        </div>
      </Card>
      <Grid min={380}>
        <Card className="overflow-hidden">
          <CardHeader title="Dispatches" />
          {dispatches.map((d) => (
            <ListRow key={d.id} onClick={() => S.nav("dispatch", { id: d.id })} right={<StatusBadge status={d.status} />}>
              <Ref>{d.id}</Ref> · {d.method} · {S.fmtDate(d.date)}
            </ListRow>
          ))}
          {!dispatches.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">Not yet picked.</div>}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Invoices" />
          {invoices.map((i) => (
            <ListRow key={i.id} onClick={() => (S.canView("fin.view") ? S.nav("finance", { id: i.id }) : S.toast("info", "Restricted", "Your role cannot open invoices."))} right={<StatusBadge status={S.invStatus(i)} />}>
              <Ref>{i.id}</Ref> · {S.money(i.total)}
            </ListRow>
          ))}
          {!invoices.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">Invoices are raised when goods are dispatched.</div>}
        </Card>
      </Grid>
    </>
  );
}
