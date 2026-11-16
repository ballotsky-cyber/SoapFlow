"use client";

import * as React from "react";
import { Pencil, Printer, ReceiptText } from "lucide-react";
import { useSoap, type DocLine, type SalesOrder } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { DetailHeader, Fact, Grid, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListRow } from "./parts";
import { TotalsBlock } from "./shared/line-editor";
import { ActivityCard, DocLinesTable, PartyCard, RelatedCard, unitQty } from "./shared/doc-view";
import { PrintDocDialog } from "./shared/doc-print";
import { orderSpec } from "./invoices/print-specs";

const OPEN = ["Confirmed", "Ready for Collection", "Ready for Dispatch", "Partially Fulfilled"];

export function OrderDetail({ o: x }: { o: SalesOrder }) {
  const S = useSoap();
  const s = S.s;
  const [print, setPrint] = React.useState(false);
  const p = S.soProgress(x);
  const openish = OPEN.includes(x.status);
  const basis = s.settings.invoiceBasis;

  /** Quantity in the line's own unit, with base units on hover. */
  const q = (l: DocLine, n: number, cls?: string) => (n ? <span className={cls} title={S.qty(l.sku, n)}>{unitQty(S, l.unit, n / l.factor)}</span> : <span className="text-subtle-foreground">—</span>);
  const row = (i: number) => p.rows[i];

  const cancel = (
    <Button key="cancel" variant="destructive-outline" onClick={() => S.confirm({ title: "Cancel " + x.id + "?", body: "Any reserved stock is released back to available. Dispatched quantities are not affected.", confirmLabel: "Cancel order", danger: true, reasonLabel: "Cancellation reason", onConfirm: (rs) => S.result(S.soAct(x.id, "cancel", rs), "Order cancelled") })}>
      Cancel order
    </Button>
  );
  const actions: React.ReactNode[] = [];
  if (S.soEditable(x) && S.can("so.create")) actions.push(<Button key="edit" variant="outline" onClick={() => S.nav("sales-orders", { id: x.id, action: "edit" })}><Pencil />Edit</Button>);
  actions.push(<Button key="print" variant="outline" onClick={() => setPrint(true)}><Printer />Print / PDF</Button>);
  if (x.status === "Draft" && (S.can("so.create") || S.can("doc.cancel"))) actions.push(cancel);
  if (x.status === "Draft" && S.can("so.create")) actions.push(<Button key="confirm" variant="outline" onClick={() => S.result(S.soAct(x.id, "confirm"), "Order confirmed")}>Confirm &amp; reserve</Button>);
  if (x.status === "Pending Approval" && S.can("so.approve")) {
    actions.push(<Button key="rej" variant="destructive-outline" onClick={() => S.confirm({ title: "Reject " + x.id + "?", body: "The order will be cancelled.", confirmLabel: "Reject", danger: true, reasonLabel: "Reason", onConfirm: (rs) => S.result(S.soAct(x.id, "reject", rs), "Order rejected") })}>Reject</Button>);
    actions.push(<Button key="app" variant="success" onClick={() => S.confirm({ title: "Approve " + x.id + "?", body: (x.approvalReason ? "Flagged: " + x.approvalReason + ". " : "") + "Approval will reserve available stock at " + S.wh(x.wh).name + ".", confirmLabel: "Approve", onConfirm: () => S.result(S.soAct(x.id, "approve"), "Order approved") })}>Approve &amp; reserve</Button>);
  }
  if (openish && (S.can("doc.cancel") || S.can("so.approve"))) actions.push(cancel);
  if (openish && S.canView("dsp.view"))
    actions.push(
      <Button key="dsp" variant="outline" onClick={() => { const d = s.dispatches.find((dd) => dd.so === x.id && !dd.deducted && dd.status !== "Cancelled"); S.nav("dispatch", d ? { id: d.id } : { so: x.id }); }}>Open in dispatch</Button>,
    );
  const canInvoice = p.invoiceable && S.can("sinv.create");
  if (canInvoice) actions.push(<Button key="inv" size="lg" onClick={() => S.nav("invoices", { action: "new", so: x.id })}><ReceiptText />Convert to invoice</Button>);

  const notes: [string, "warning" | "info"][] = [];
  if (x.status === "Pending Approval") notes.push(["Needs approval: " + (x.approvalReason || "") + ". No stock is reserved until approved.", "warning"]);
  if (x.status === "Cancelled") notes.push(["Cancelled" + (x.cancelReason ? ": " + x.cancelReason : "") + ". Reservations released.", "info"]);
  if (p.rows.some((r) => r.returned)) notes.push(["Some goods were returned. Returned stock is held in quarantine and restored only after inspection.", "warning"]);
  if (p.rows.some((r) => r.backorder) && openish) notes.push(["Part of this order is on backorder — it is reserved automatically when picked if stock has arrived.", "warning"]);
  if (basis === "delivered" && openish && !p.invoiceable && p.invoice !== "Fully invoiced") notes.push(["Invoicing follows delivered quantities (Settings) — this order can be invoiced once goods are dispatched.", "info"]);

  const invoices = s.invoices.filter((i) => i.so === x.id);
  const dispatches = s.dispatches.filter((d) => d.so === x.id);
  const fin = S.canView("fin.view");

  return (
    <>
      <DetailHeader
        backLabel="Sales orders"
        onBack={() => S.nav("sales-orders")}
        reference={<span className="inline-flex items-center gap-2">{x.id}<StatusBadge status={x.status} /></span>}
        title={x.party.name + (x.walkin ? " — " + x.walkin : "")}
        meta={
          <>
            <StatusBadge status={p.fulfil} />
            <StatusBadge status={p.invoice} />
            {fin && <StatusBadge status={p.payment} />}
            <span>{S.wh(x.wh).name} · {x.method} · {x.terms === "Credit" ? "Credit · Net " + x.termsDays : "Cash"} · {S.fmtDate(x.date)} · by {S.uname(x.by)}</span>
          </>
        }
        actions={actions}
      />
      {notes.map(([t, tone]) => <Alert key={t} tone={tone}>{t}</Alert>)}
      {canInvoice && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary-soft/40 px-4 py-3">
          <div className="text-[12.5px]">
            <div className="font-semibold">Ready to invoice</div>
            <div className="text-muted-foreground">{S.money(p.uninvoiced)} of this order is not yet invoiced. You can invoice all of it or part of it — remaining quantities stay open for later invoices.</div>
          </div>
          <Button onClick={() => S.nav("invoices", { action: "new", so: x.id })}><ReceiptText />Convert to invoice</Button>
        </Card>
      )}
      <Grid min={160}>
        <Fact k="Order total" v={S.money(x.total)} />
        <Fact k="Not yet invoiced" v={S.money(p.uninvoiced)} />
        {fin && <Fact k="Billed (net of credits)" v={S.money(p.billed)} />}
        {fin && <Fact k="Paid" v={<span className="text-success">{S.money(p.paid)}</span>} />}
        <Fact k="Expected delivery" v={x.expected ? S.fmtDate(x.expected) : "Not set"} />
        <Fact k="Customer ref" v={x.ref || "—"} />
        {x.est && <Fact k="From estimate" v={<Ref onClick={() => S.nav("estimates", { id: x.est })}>{x.est}</Ref>} />}
        {x.inv && <Fact k="Fulfils invoice" v={<Ref onClick={() => S.nav("invoices", { id: x.inv })}>{x.inv}</Ref>} />}
      </Grid>
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="overflow-hidden">
            <CardHeader title="Order lines" description="Ordered, reserved, delivered and invoiced quantities are tracked separately." />
            <DocLinesTable
              lines={x.lines}
              extra={[
                {
                  head: "Reserved",
                  cell: (l, i) => (
                    <>
                      {q(l, row(i).reserved, "text-info")}
                      {row(i).backorder > 0 && <div className="text-[11px] text-warning">backorder {unitQty(S, l.unit, row(i).backorder / l.factor)}</div>}
                    </>
                  ),
                },
                {
                  head: "Delivered",
                  cell: (l, i) => (
                    <>
                      {q(l, row(i).fulfilled, row(i).fulfilled >= l.qty ? "text-success" : undefined)}
                      {row(i).returned > 0 && <div className="text-[11px] text-danger">returned {unitQty(S, l.unit, row(i).returned / l.factor)}</div>}
                    </>
                  ),
                },
                {
                  head: "Invoiced",
                  cell: (l, i) => (
                    <>
                      {q(l, row(i).invoiced, row(i).invoiced >= l.qty ? "text-success" : undefined)}
                      {row(i).draft > 0 && <div className="text-[11px] text-muted-foreground">{unitQty(S, l.unit, row(i).draft / l.factor)} in draft</div>}
                    </>
                  ),
                },
                { head: "Invoiceable", cell: (l, i) => q(l, row(i).invoiceable, "font-semibold text-primary") },
              ]}
            />
            {x.charges.length > 0 && (
              <div className="flex flex-col border-t px-4 py-2.5 text-[12.5px]">
                {x.charges.map((c, k) => (
                  <div key={k} className="flex justify-between gap-3 py-0.5">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="tabular">{S.money(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end border-t px-4 py-3"><TotalsBlock t={x} totalLabel="Order total" /></div>
          </Card>
          <Grid min={320}>
            <Card className="overflow-hidden">
              <CardHeader title="Invoices" description={invoices.length > 1 ? invoices.length + " invoices against this order" : undefined} />
              {invoices.map((i) => (
                <ListRow key={i.id} onClick={() => (fin ? S.nav("invoices", { id: i.id }) : S.toast("info", "Restricted", "Your role cannot open invoices."))} right={<span className="inline-flex items-center gap-2">{S.money(i.total)}<StatusBadge status={S.invStatus(i)} /></span>}>
                  <Ref>{i.id}</Ref> · {S.fmtDate(i.date)}{i.status === "Issued" && S.invBal(i) > 0 ? " · balance " + S.money(S.invBal(i)) : ""}{i.auto ? " · at dispatch" : ""}
                </ListRow>
              ))}
              {!invoices.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">Not invoiced yet{canInvoice ? " — use “Convert to invoice”." : "."}</div>}
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Deliveries" />
              {dispatches.map((d) => (
                <ListRow key={d.id} onClick={() => S.nav("dispatch", { id: d.id })} right={<StatusBadge status={d.status} />}>
                  <Ref>{d.id}</Ref> · {d.method} · {S.fmtDate(d.dispatchedAt || d.date)}
                </ListRow>
              ))}
              {!dispatches.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">Not yet picked. Stock is deducted only when goods leave through dispatch.</div>}
            </Card>
          </Grid>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <PartyCard party={x.party} id={x.customer}>
            {x.method === "Delivery" && x.address && <div className="mt-1">Deliver to: {x.address}</div>}
            {x.notes && <div className="mt-1 whitespace-pre-line text-muted-foreground">Notes: {x.notes}</div>}
          </PartyCard>
          <RelatedCard id={x.id} />
          <ActivityCard id={x.id} />
        </div>
      </div>
      {print && <PrintDocDialog spec={orderSpec(S, x)} onClose={() => setPrint(false)} />}
    </>
  );
}
