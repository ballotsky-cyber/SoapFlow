"use client";

import * as React from "react";
import { Plus, ReceiptText, Search } from "lucide-react";
import { useSoap, type Invoice } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Grid, Page, PageHeader, Ref, StatCard, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { FinanceCharts } from "@/features/finance/finance-charts";
import { DirectInvoiceForm, OrderInvoiceForm } from "./invoice-form";
import { InvoiceDetail, KindBadge } from "./invoice-detail";

/** Invoices: list, conversion from a sales order (action "new" + so), direct invoice (action "new"), edit draft (action "edit"), detail. */
export default function InvoicesPage() {
  const S = useSoap();
  const route = S.s.route;
  const so = typeof route.so === "string" ? route.so : "";
  const i = route.id ? S.s.invoices.find((x) => x.id === route.id) : undefined;
  const canCreate = S.can("sinv.create");
  if (!i && route.action === "new" && canCreate)
    return <Page>{so ? <OrderInvoiceForm soId={so} onClose={() => S.nav("sales-orders", { id: so })} /> : <DirectInvoiceForm onClose={() => S.nav("invoices")} />}</Page>;
  if (i && route.action === "edit" && canCreate && i.status === "Draft")
    return <Page>{i.so ? <OrderInvoiceForm soId={i.so} invoice={i} onClose={() => S.nav("invoices", { id: i.id })} /> : <DirectInvoiceForm invoice={i} onClose={() => S.nav("invoices", { id: i.id })} />}</Page>;
  if (i) return <Page><InvoiceDetail i={i} /></Page>;
  return <Page><InvoiceList /></Page>;
}

const TABS = ["", "Draft", "Issued", "Partially Paid", "Overdue", "Paid", "Credited", "closed"];
const tabLabel = (t: string) => (t === "" ? "All" : t === "closed" ? "Cancelled / void" : t);
const SOURCES = [{ value: "", label: "All sources" }, { value: "SO", label: "From sales orders" }, { value: "Direct", label: "Direct invoices" }, { value: "Legacy", label: "Opening balances" }];

function InvoiceList() {
  const S = useSoap();
  const s = S.s;
  const [tab, setTab] = React.useState("");
  const [src, setSrc] = React.useState("");
  const [cust, setCust] = React.useState("");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);

  const sc = S.scope();
  const inv = s.invoices.filter((i) => sc.includes(i.wh));
  const st = (i: Invoice) => S.invStatus(i);
  const match = (i: Invoice, t: string) => !t || (t === "closed" ? ["Cancelled", "Void"].includes(i.status) : st(i) === t);
  const qq = q.trim().toLowerCase();
  const rows = inv
    .filter((i) => match(i, tab) && (!src || i.kind === src) && (!cust || i.customer === cust) && (!qq || (i.id + " " + i.party.name + " " + i.so + " " + i.ref).toLowerCase().includes(qq)))
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
  const pg = S.paginate(rows, page, 12);

  const issued = inv.filter((i) => i.status === "Issued");
  const ar = issued.reduce((a, i) => a + S.invBal(i), 0);
  const od = issued.filter((i) => st(i) === "Overdue");
  const drafts = inv.filter((i) => i.status === "Draft");
  const month = S.TODAY.slice(0, 7);
  const ids = new Set(inv.map((i) => i.id));
  const collected = s.payments.filter((p) => p.status !== "Reversed" && p.date.startsWith(month)).reduce((a, p) => a + p.alloc.filter((x) => ids.has(x.inv)).reduce((b, x) => b + x.amount, 0), 0);
  const custOpts = [{ value: "", label: "All customers" }, ...s.customers.map((c) => ({ value: c.id, label: c.name, hint: c.id }))];
  const go = (t: string) => { setTab(t); setPage(1); };

  return (
    <>
      <PageHeader
        icon={ReceiptText}
        title="Invoices"
        description="Invoices raised from sales orders (in full or in parts) and direct invoices. Issued invoices are never edited — corrections go through credit notes."
        actions={S.can("sinv.create") && <Button onClick={() => S.nav("invoices", { action: "new" })}><Plus />Create invoice</Button>}
      />
      <Grid min={200}>
        <StatCard label="Outstanding receivables" value={S.money(ar)} sub={issued.filter((i) => S.invBal(i) > 0).length + " open invoices"} onClick={() => go("Issued")} />
        <StatCard label="Overdue" value={S.money(od.reduce((a, i) => a + S.invBal(i), 0))} sub={od.length + " invoices past due"} tone={od.length ? "danger" : "default"} onClick={() => go("Overdue")} />
        <StatCard label="Draft invoices" value={S.money(drafts.reduce((a, i) => a + i.total, 0))} sub={drafts.length + " awaiting issue"} tone={drafts.length ? "warning" : "default"} onClick={() => go("Draft")} />
        <StatCard label="Collected this month" value={S.money(collected)} sub="Allocated payments, excl. reversed" />
      </Grid>
      <FinanceCharts inv={issued} />
      <Toolbar className="justify-between">
        <Tabs
          value={tab}
          onValueChange={go}
          items={TABS.map((t) => ({ value: t, label: <>{tabLabel(t)} <span className="text-[11px] text-subtle-foreground tabular">{inv.filter((i) => match(i, t)).length}</span></> }))}
          className="w-full min-w-0 xl:w-auto xl:border-b-0"
        />
        <div className="flex w-full flex-wrap gap-2 xl:w-auto">
          <Select value={src} onValueChange={(v) => { setSrc(v); setPage(1); }} options={SOURCES} className="w-[calc(50%-4px)] sm:w-44" aria-label="Source" />
          <Combobox value={cust} onValueChange={(v) => { setCust(v); setPage(1); }} options={custOpts} placeholder="All customers" className="w-[calc(50%-4px)] sm:w-52" aria-label="Customer filter" />
          <Input icon={<Search />} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search invoice, customer, order" className="w-full sm:w-56" />
        </div>
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Invoice</TH>
              <TH>Customer</TH>
              <TH>Sales order</TH>
              <TH>Date</TH>
              <TH>Due</TH>
              <TH align="right">Subtotal</TH>
              <TH align="right">Discount</TH>
              <TH align="right">Tax</TH>
              <TH align="right">Total</TH>
              <TH align="right">Paid</TH>
              <TH align="right">Balance</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((i) => {
              const status = st(i);
              return (
                <TR key={i.id} onClick={() => S.nav("invoices", { id: i.id })}>
                  <TD nowrap><Ref>{i.id}</Ref><div className="mt-0.5"><KindBadge i={i} /></div></TD>
                  <TD className="min-w-[160px]">{i.party.name}</TD>
                  <TD nowrap>{i.so ? <Ref onClick={() => S.nav("sales-orders", { id: i.so })}>{i.so}</Ref> : <span className="text-subtle-foreground">—</span>}</TD>
                  <TD nowrap className="text-muted-foreground">{S.fmtDate(i.date)}</TD>
                  <TD nowrap className={status === "Overdue" ? "text-danger" : "text-muted-foreground"}>{S.fmtDate(i.due)}</TD>
                  <TD nowrap align="right">{S.money(i.sub)}</TD>
                  <TD nowrap align="right" className="text-muted-foreground">{i.disc ? S.money(-i.disc) : "—"}</TD>
                  <TD nowrap align="right" className="text-muted-foreground">{S.money(i.tax)}</TD>
                  <TD nowrap align="right" className="font-medium">{S.money(i.total)}</TD>
                  <TD nowrap align="right" className="text-success">{i.paid ? S.money(i.paid) : "—"}</TD>
                  <TD nowrap align="right" className="font-semibold">{i.status === "Issued" ? S.money(S.invBal(i)) : "—"}</TD>
                  <TD nowrap><StatusBadge status={status} /></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {!pg.rows.length && <EmptyState icon={<Search />} title="No invoices match." />}
        <Pagination {...pg} onPage={setPage} />
      </Card>
    </>
  );
}
