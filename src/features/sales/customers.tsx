"use client";

import * as React from "react";
import { Download, Plus, Search, Store } from "lucide-react";
import { useSoap, type Customer } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { DetailHeader, Fact, Grid, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { CUSTOMER_TYPES, CustomerFormDialog } from "./shared/customer-dialog";
import { ListRow } from "./parts";

const overdueOf = (S: ReturnType<typeof useSoap>, id: string) => S.s.invoices.filter((i) => i.customer === id && S.invStatus(i) === "Overdue").reduce((a, i) => a + S.invBal(i), 0);

export function CustomerList() {
  const S = useSoap();
  const s = S.s;
  const fin = S.canView("fin.view") || S.canView("so.approve");
  const canEdit = S.can("cus.edit");
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("Active");
  const [page, setPage] = React.useState(1);
  const [creating, setCreating] = React.useState(() => s.route.action === "new" && canEdit);

  const term = q.trim().toLowerCase();
  const list = s.customers.filter(
    (c) => (!type || c.type === type) && (!status || (c.status || "Active") === status) && (!term || [c.id, c.name, c.contact, c.phone, c.email, c.city, c.tin].join(" ").toLowerCase().includes(term)),
  );
  const pg = S.paginate(list, page, 12);
  const filt = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  return (
    <>
      <PageHeader
        icon={Store}
        title="Customers"
        description="Walk-in, repeat buyers, distributors and business clients — shared by estimates, orders and invoices"
        actions={canEdit && <Button onClick={() => setCreating(true)}><Plus />New customer</Button>}
      />
      <Toolbar>
        <Input icon={<Search />} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, code, phone, email or TIN" className="w-full sm:w-72" />
        <Select value={type} onValueChange={filt(setType)} options={[{ value: "", label: "All types" }, ...CUSTOMER_TYPES]} className="w-[calc(50%-4px)] sm:w-40" />
        <Select value={status} onValueChange={filt(setStatus)} options={[{ value: "", label: "Any status" }, "Active", "Inactive"]} className="w-[calc(50%-4px)] sm:w-36" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Customer</TH>
              <TH>Type</TH>
              <TH>Contact</TH>
              <TH>City</TH>
              <TH>Terms</TH>
              {fin && <TH align="right">Credit limit</TH>}
              {fin && <TH align="right">Outstanding</TH>}
              {fin && <TH align="right">Overdue</TH>}
              <TH align="right">Orders</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((c) => {
              const ov = overdueOf(S, c.id);
              return (
                <TR key={c.id} onClick={() => S.nav("customers", { id: c.id })}>
                  <TD className="min-w-[180px]">
                    <div className="font-medium">{c.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{c.id}</div>
                  </TD>
                  <TD nowrap>{c.type}</TD>
                  <TD className="min-w-[140px]">
                    {c.contact}
                    <div className="text-[11px] text-muted-foreground">{c.phone || c.email || ""}</div>
                  </TD>
                  <TD nowrap>{c.city || "—"}</TD>
                  <TD nowrap>{c.terms ? "Credit · Net " + c.terms : "Cash"}</TD>
                  {fin && <TD nowrap align="right">{c.limit ? S.money(c.limit) : "—"}</TD>}
                  {fin && <TD nowrap align="right">{S.money(S.custBalance(c.id))}</TD>}
                  {fin && <TD nowrap align="right" className={ov ? "text-danger" : "text-subtle-foreground"}>{ov ? S.money(ov) : "—"}</TD>}
                  <TD nowrap align="right">{s.salesOrders.filter((o) => o.customer === c.id).length}</TD>
                  <TD nowrap><StatusBadge status={c.status || "Active"} /></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {!pg.rows.length && <EmptyState icon={<Search />} title="No customers match">Adjust the search or filters{canEdit ? ", or create a new customer" : ""}.</EmptyState>}
        <Pagination {...pg} onPage={setPage} />
      </Card>
      {creating && <CustomerFormDialog customer={null} onClose={() => setCreating(false)} onSaved={(id) => S.nav("customers", { id })} />}
    </>
  );
}

export function CustomerDetail({ c }: { c: Customer }) {
  const S = useSoap();
  const s = S.s;
  const fin = S.canView("fin.view") || S.canView("so.approve");
  const [editing, setEditing] = React.useState(false);
  const invs = s.invoices.filter((i) => i.customer === c.id);
  const issued = invs.filter((i) => i.status === "Issued");
  const ov = overdueOf(S, c.id);
  const b = S.custBalance(c.id);
  const pays = s.payments.filter((p) => p.customer === c.id);
  const onAccount = pays.filter((p) => p.status !== "Reversed").reduce((a, p) => a + (p.unallocated || 0), 0);
  const cns = s.creditNotes.filter((n) => n.customer === c.id);

  // Statement: issued invoices (debits), payments that were not reversed and credit notes (credits). Drafts, cancelled and void invoices are excluded.
  const ev: { date: string; ref: string; desc: string; dr: number; cr: number }[] = [];
  issued.forEach((i) => ev.push({ date: i.date, ref: i.id, desc: "Invoice" + (i.so ? " · " + i.so : ""), dr: i.total, cr: 0 }));
  pays
    .filter((p) => p.status !== "Reversed")
    .forEach((p) => ev.push({ date: p.date, ref: p.id, desc: "Payment · " + p.method + (p.status === "Recorded" ? " (unverified)" : "") + (p.unallocated ? " · on account " + S.money(p.unallocated) : ""), dr: 0, cr: p.amount }));
  cns.forEach((n) => ev.push({ date: n.date, ref: n.id, desc: "Credit note · " + n.type, dr: 0, cr: n.amount }));
  ev.sort((a, b2) => (a.date < b2.date ? -1 : a.date > b2.date ? 1 : 0));
  let run = 0;
  const stmt = ev.map((e) => {
    run += e.dr - e.cr;
    return { ...e, run, raw: [e.date, e.ref, e.desc, (e.dr / 100).toFixed(2), (e.cr / 100).toFixed(2), (run / 100).toFixed(2)] };
  });

  const facts: { k: string; v: string; danger?: boolean }[] = [
    { k: "Contact", v: c.contact },
    { k: "Phone", v: c.phone || "—" },
    { k: "Email", v: c.email || "—" },
    { k: "TIN", v: c.tin || "—" },
    { k: "Payment terms", v: c.terms ? "Net " + c.terms + " days" : "Cash only" },
    ...(fin
      ? [
          { k: "Credit limit", v: c.limit ? S.money(c.limit) : "None" },
          { k: "Outstanding balance", v: S.money(b) },
          { k: "Overdue", v: S.money(ov), danger: !!ov },
          { k: "Available credit", v: c.limit ? S.money(Math.max(0, c.limit - b)) : "—", danger: !!c.limit && b > c.limit },
          ...(onAccount ? [{ k: "Unallocated payments (on account)", v: S.money(onAccount) }] : []),
        ]
      : []),
  ];
  const ests = s.estimates.filter((e) => e.customer === c.id);
  const orders = s.salesOrders.filter((o) => o.customer === c.id);
  const none = (t: string) => <div className="px-4 py-4 text-[12.5px] text-muted-foreground">{t}</div>;

  return (
    <>
      <DetailHeader
        backLabel="Customers"
        onBack={() => S.nav("customers")}
        reference={<span className="inline-flex items-center gap-2">{c.id}<StatusBadge status={c.status || "Active"} /></span>}
        title={c.name}
        meta={`${c.type} · customer since ${S.fmtDate(c.since)}${c.city ? " · " + c.city : ""}`}
        actions={S.can("cus.edit") && <Button onClick={() => setEditing(true)}>Edit customer</Button>}
      />
      <Grid min={170}>
        {facts.map((f) => <Fact key={f.k} k={f.k} v={<span className={f.danger ? "text-danger" : undefined}>{f.v}</span>} />)}
      </Grid>
      <Grid min={300}>
        <Fact k="Billing address" v={<span className="whitespace-normal">{c.address || "—"}</span>} />
        <Fact k="Delivery address" v={<span className="whitespace-normal">{c.delivAddr && c.delivAddr !== c.address ? c.delivAddr : c.address ? "Same as billing" : "—"}</span>} />
      </Grid>
      <Grid min={380}>
        {S.canView("est.view") && (
          <Card className="overflow-hidden">
            <CardHeader title="Estimates" />
            {ests.map((e) => (
              <ListRow key={e.id} onClick={() => S.nav("estimates", { id: e.id })} right={<span className="inline-flex items-center gap-2">{S.money(e.total)}<StatusBadge status={S.estStatus(e)} /></span>}>
                <Ref>{e.id}</Ref> · {S.fmtDate(e.date)} · valid to {S.fmtDate(e.expiry)}
              </ListRow>
            ))}
            {!ests.length && none("No estimates.")}
          </Card>
        )}
        <Card className="overflow-hidden">
          <CardHeader title="Sales orders" />
          {orders.map((o) => (
            <ListRow key={o.id} onClick={() => S.nav("sales-orders", { id: o.id })} right={<span className="inline-flex items-center gap-2">{S.money(S.soTotal(o))}<StatusBadge status={o.status} /></span>}>
              <Ref>{o.id}</Ref> · {S.fmtDate(o.date)}
            </ListRow>
          ))}
          {!orders.length && none("No sales orders.")}
        </Card>
        {S.canView("fin.view") && (
          <>
            <Card className="overflow-hidden">
              <CardHeader title="Invoices" />
              {invs.map((i) => (
                <ListRow key={i.id} onClick={() => S.nav("invoices", { id: i.id })} right={<span className="inline-flex items-center gap-2">{S.money(i.total)}{i.status === "Issued" && S.invBal(i) > 0 && <span className="text-muted-foreground">bal {S.money(S.invBal(i))}</span>}<StatusBadge status={S.invStatus(i)} /></span>}>
                  <Ref>{i.id}</Ref> · {S.fmtDate(i.date)}{i.so ? " · " + i.so : i.kind === "Direct" ? " · direct" : ""}
                </ListRow>
              ))}
              {!invs.length && none("No invoices.")}
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Payments" />
              {pays.map((p) => (
                <ListRow key={p.id} onClick={() => S.nav("payments", { id: p.id })} right={<span className="inline-flex items-center gap-2">{S.money(p.amount)}<StatusBadge status={p.status} /></span>}>
                  <Ref>{p.id}</Ref> · {S.fmtDate(p.date)} · {p.method} · <span className="font-mono text-[11px] text-muted-foreground">{p.rct}</span>
                </ListRow>
              ))}
              {!pays.length && none("No payments.")}
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Credit notes" />
              {cns.map((n) => (
                <ListRow key={n.id} onClick={() => S.nav("credit-notes", { id: n.id })} right={<span className="inline-flex items-center gap-2">{S.money(n.amount)}<StatusBadge status={n.status} /></span>}>
                  <Ref>{n.id}</Ref> · {S.fmtDate(n.date)} · {n.type} · {n.inv}
                </ListRow>
              ))}
              {!cns.length && none("No credit notes.")}
            </Card>
          </>
        )}
        {fin && (
          <Card className="overflow-hidden">
            <CardHeader
              title="Customer statement"
              description={"Closing balance " + S.money(run)}
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
                    <TD className="py-1.5"><span className="font-mono">{r.ref}</span> {r.desc}</TD>
                    <TD nowrap align="right" className="py-1.5">{r.dr ? S.money(r.dr) : ""}</TD>
                    <TD nowrap align="right" className="py-1.5 text-success">{r.cr ? S.money(r.cr) : ""}</TD>
                    <TD nowrap align="right" className="py-1.5 font-semibold">{S.money(r.run)}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
            {!stmt.length && none("No issued invoices, payments or credit notes yet.")}
          </Card>
        )}
      </Grid>
      {editing && <CustomerFormDialog customer={c} onClose={() => setEditing(false)} />}
    </>
  );
}
