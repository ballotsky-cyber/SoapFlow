"use client";

import * as React from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { useSoap } from "@/lib/store";
import type { ModuleProps } from "@/components/app/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { SortableTH, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Page, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderDetail } from "./order-detail";
import { OrderForm } from "./order-form";
import { CustomerDetail, CustomerList } from "./customers";

export default function SalesPage({ view = "orders" }: ModuleProps) {
  const S = useSoap();
  const s = S.s;
  const id = s.route.id;
  const [formOpen, setFormOpen] = React.useState(() => s.route.action === "new" && view === "orders" && S.can("so.create"));

  if (view === "customers") {
    const c = id ? s.customers.find((x) => x.id === id) : undefined;
    return <Page>{c ? <CustomerDetail c={c} /> : <CustomerList />}</Page>;
  }
  if (formOpen) return <Page><OrderForm onClose={() => setFormOpen(false)} /></Page>;
  const o = id ? s.salesOrders.find((x) => x.id === id) : undefined;
  if (o) return <Page><OrderDetail o={o} /></Page>;
  return <Page><OrderList onNew={() => setFormOpen(true)} /></Page>;
}

const OPEN = ["Confirmed", "Ready for Collection", "Ready for Dispatch", "Partially Fulfilled"];
const GROUPS: [string, string][] = [["", "All"], ["Pending Approval", "Needs approval"], ["open", "Open"], ["Dispatched", "Dispatched"], ["done", "Completed"], ["Cancelled", "Cancelled"], ["Draft", "Draft"]];
const match = (status: string, k: string) => !k || (k === "open" ? OPEN.includes(status) : k === "done" ? ["Delivered", "Completed"].includes(status) : status === k);
type SortKey = "id" | "customer" | "date" | "total" | "status";

function OrderList({ onNew }: { onNew: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [filter, setFilter] = React.useState("");
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("id");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);

  const sc = S.scope();
  const vis = s.salesOrders.filter((x) => sc.includes(x.wh));
  const qq = q.trim().toLowerCase();
  const list = S.sort(
    vis
      .filter((x) => match(x.status, filter) && (!qq || (x.id + " " + S.cust(x.customer).name + " " + (x.walkin || "")).toLowerCase().includes(qq)))
      .map((x) => ({ id: x.id as string, customer: S.cust(x.customer).name, walkin: (x.walkin as string) || "", wh: S.wh(x.wh).name, date: x.date as string, method: x.method as string, terms: x.terms as string, total: S.soTotal(x), status: x.status, by: S.uname(x.by) })),
    sort,
    dir,
  );
  const pg = S.paginate(list, page, 10);
  const sortBy = (k: SortKey) => {
    setDir(sort === k && dir === "asc" ? "desc" : "asc");
    setSort(k);
  };
  const sth = (k: SortKey, label: string, align?: "right") => (
    <SortableTH active={sort === k} dir={dir} onSort={() => sortBy(k)} align={align}>{label}</SortableTH>
  );

  return (
    <>
      <PageHeader
        icon={ShoppingCart}
        title="Sales orders"
        description="Confirmed orders reserve available stock. Physical stock only reduces at dispatch."
        actions={S.can("so.create") && <Button onClick={onNew}><Plus />New sales order</Button>}
      />
      <Toolbar className="justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => { setFilter(v); setPage(1); }}
          items={GROUPS.map(([k, l]) => ({ value: k, label: <>{l} <span className="text-[11px] text-subtle-foreground tabular">{vis.filter((x) => match(x.status, k)).length}</span></> }))}
          className="w-full min-w-0 lg:w-auto lg:border-b-0"
        />
        <Input icon={<Search />} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search order or customer" className="w-full sm:w-60" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              {sth("id", "Order")}
              {sth("customer", "Customer")}
              <TH>Warehouse</TH>
              {sth("date", "Date")}
              <TH>Fulfilment</TH>
              <TH>Terms</TH>
              {sth("total", "Total", "right")}
              {sth("status", "Status")}
              <TH>Created by</TH>
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((r) => (
              <TR key={r.id} onClick={() => S.nav("sales-orders", { id: r.id })}>
                <TD nowrap><Ref>{r.id}</Ref></TD>
                <TD className="min-w-[170px]">
                  {r.customer}
                  {r.walkin && <div className="text-[11px] text-subtle-foreground">{r.walkin}</div>}
                </TD>
                <TD nowrap>{r.wh}</TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(r.date)}</TD>
                <TD nowrap>{r.method}</TD>
                <TD nowrap>{r.terms}</TD>
                <TD nowrap align="right">{S.money(r.total)}</TD>
                <TD nowrap><StatusBadge status={r.status} /></TD>
                <TD nowrap>{r.by}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!pg.rows.length && <EmptyState icon={<Search />} title="No orders match. Create one with “New sales order”." />}
        <Pagination {...pg} onPage={setPage} />
      </Card>
    </>
  );
}
