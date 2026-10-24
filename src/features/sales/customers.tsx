"use client";

import { Download, Store } from "lucide-react";
import { useSoap, type Customer } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DetailHeader, Fact, Grid, PageHeader, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListRow } from "./parts";

export function CustomerList() {
  const S = useSoap();
  const s = S.s;
  const fin = S.canView("fin.view") || S.canView("so.approve");
  return (
    <>
      <PageHeader icon={Store} title="Customers" description="Walk-in, repeat buyers, distributors and business clients · illustrative profiles" />
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Customer</TH>
              <TH>Type</TH>
              <TH>City</TH>
              <TH>Terms</TH>
              {fin && <TH align="right">Credit limit</TH>}
              {fin && <TH align="right">Outstanding</TH>}
              {fin && <TH align="right">Overdue</TH>}
              <TH align="right">Orders</TH>
            </tr>
          </THead>
          <TBody>
            {s.customers.map((c) => {
              const ov = s.invoices.filter((i) => i.customer === c.id && S.invStatus(i) === "Overdue").reduce((a, i) => a + S.invBal(i), 0);
              return (
                <TR key={c.id} onClick={() => S.nav("customers", { id: c.id })}>
                  <TD nowrap className="font-medium">{c.name}</TD>
                  <TD nowrap>{c.type}</TD>
                  <TD nowrap>{c.city || "—"}</TD>
                  <TD nowrap>{c.terms ? "Credit · Net " + c.terms : "Cash"}</TD>
                  {fin && <TD nowrap align="right">{c.limit ? S.money(c.limit) : "—"}</TD>}
                  {fin && <TD nowrap align="right">{S.money(S.custBalance(c.id))}</TD>}
                  {fin && <TD nowrap align="right" className={ov ? "text-danger" : "text-subtle-foreground"}>{ov ? S.money(ov) : "—"}</TD>}
                  <TD nowrap align="right">{s.salesOrders.filter((o) => o.customer === c.id).length}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
    </>
  );
}

export function CustomerDetail({ c }: { c: Customer }) {
  const S = useSoap();
  const s = S.s;
  const fin = S.canView("fin.view") || S.canView("so.approve");
  const invs = s.invoices.filter((i) => i.customer === c.id);
  const ov = invs.filter((i) => S.invStatus(i) === "Overdue").reduce((a, i) => a + S.invBal(i), 0);
  const b = S.custBalance(c.id);

  const ev: { date: string; ref: string; desc: string; dr: number; cr: number }[] = [];
  invs.forEach((i) => ev.push({ date: i.date, ref: i.id, desc: "Invoice", dr: i.total, cr: 0 }));
  s.payments
    .filter((p) => p.customer === c.id && p.status !== "Reversed")
    .forEach((p) => ev.push({ date: p.date, ref: p.id, desc: "Payment · " + p.method + (p.status === "Recorded" ? " (unverified)" : ""), dr: 0, cr: p.alloc.reduce((a: number, x: { amount: number }) => a + x.amount, 0) }));
  s.creditNotes.filter((n) => n.customer === c.id).forEach((n) => ev.push({ date: n.date, ref: n.id, desc: "Credit note", dr: 0, cr: n.amount }));
  ev.sort((a, b2) => (a.date < b2.date ? -1 : a.date > b2.date ? 1 : 0));
  let run = 0;
  const stmt = ev.map((e) => {
    run += e.dr - e.cr;
    return { ...e, run, raw: [e.date, e.ref, e.desc, (e.dr / 100).toFixed(2), (e.cr / 100).toFixed(2), (run / 100).toFixed(2)] };
  });

  const facts: { k: string; v: string; danger?: boolean }[] = [
    { k: "Contact", v: c.contact },
    { k: "Phone", v: c.phone || "—" },
    { k: "Payment terms", v: c.terms ? "Net " + c.terms + " days" : "Cash only" },
    ...(fin
      ? [
          { k: "Credit limit", v: c.limit ? S.money(c.limit) : "None" },
          { k: "Outstanding balance", v: S.money(b) },
          { k: "Overdue", v: S.money(ov), danger: !!ov },
          { k: "Available credit", v: c.limit ? S.money(Math.max(0, c.limit - b)) : "—", danger: !!c.limit && b > c.limit },
        ]
      : []),
  ];
  const orders = s.salesOrders.filter((o) => o.customer === c.id);

  return (
    <>
      <DetailHeader backLabel="Customers" onBack={() => S.nav("customers")} title={c.name} meta={`${c.id} · ${c.type} · ${c.address || "—"} · customer since ${S.fmtDate(c.since)}`} />
      <Grid min={170}>
        {facts.map((f) => <Fact key={f.k} k={f.k} v={<span className={f.danger ? "text-danger" : undefined}>{f.v}</span>} />)}
      </Grid>
      <Grid min={460}>
        <Card className="overflow-hidden">
          <CardHeader title="Order history" />
          {orders.map((o) => (
            <ListRow key={o.id} onClick={() => S.nav("sales-orders", { id: o.id })} right={<StatusBadge status={o.status} />}>
              <Ref>{o.id}</Ref> · {S.fmtDate(o.date)} · {S.money(S.soTotal(o))}
            </ListRow>
          ))}
        </Card>
        {fin && (
          <Card className="overflow-hidden">
            <CardHeader
              title="Customer statement"
              actions={
                <Button variant="link" size="xs" onClick={() => S.csv("statement-" + c.id, ["Date", "Reference", "Description", "Debit", "Credit", "Balance"], stmt.map((r) => r.raw))}>
                  <Download />Export CSV
                </Button>
              }
            />
            <Table className="text-xs">
              <THead>
                <tr>
                  <TH>Date</TH>
                  <TH>Reference</TH>
                  <TH align="right">Debit</TH>
                  <TH align="right">Credit</TH>
                  <TH align="right">Balance</TH>
                </tr>
              </THead>
              <TBody>
                {stmt.map((r, i) => (
                  <tr key={r.ref + i}>
                    <TD nowrap className="py-1.5 text-muted-foreground">{S.fmtDate(r.date)}</TD>
                    <TD nowrap className="py-1.5"><span className="font-mono">{r.ref}</span> {r.desc}</TD>
                    <TD nowrap align="right" className="py-1.5">{r.dr ? S.money(r.dr) : ""}</TD>
                    <TD nowrap align="right" className="py-1.5 text-success">{r.cr ? S.money(r.cr) : ""}</TD>
                    <TD nowrap align="right" className="py-1.5 font-semibold">{S.money(r.run)}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </Card>
        )}
      </Grid>
    </>
  );
}
