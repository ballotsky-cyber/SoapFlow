"use client";

import * as React from "react";
import { FilePen, Plus, Search } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Grid, Page, PageHeader, Ref, StatCard, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { EstimateForm } from "./estimate-form";
import { ConvertEstimate, EstimateDetail } from "./estimate-detail";

const GROUPS = ["", "Draft", "Sent", "Accepted", "Expired", "Rejected", "Converted", "Cancelled"];

/** Estimates / quotations: list, form (route action "new" | "edit"), detail and conversion (action "convert"). */
export default function EstimatesPage() {
  const S = useSoap();
  const route = S.s.route;
  const e = route.id ? S.s.estimates.find((x) => x.id === route.id) : undefined;
  if (!e && route.action === "new" && S.can("est.create")) return <Page><EstimateForm onClose={() => S.nav("estimates")} /></Page>;
  if (e && route.action === "edit" && S.can("est.create") && ["Draft", "Sent"].includes(S.estStatus(e))) return <Page><EstimateForm estimate={e} onClose={() => S.nav("estimates", { id: e.id })} /></Page>;
  if (e && route.action === "convert" && S.can("so.create") && S.estStatus(e) === "Accepted") return <Page><ConvertEstimate e={e} /></Page>;
  if (e) return <Page><EstimateDetail e={e} /></Page>;
  return <Page><EstimateList /></Page>;
}

function EstimateList() {
  const S = useSoap();
  const s = S.s;
  const [filter, setFilter] = React.useState("");
  const [q, setQ] = React.useState("");
  const [cust, setCust] = React.useState("");
  const [page, setPage] = React.useState(1);

  const sc = S.scope();
  const vis = s.estimates.filter((e) => !e.wh || sc.includes(e.wh));
  const qq = q.trim().toLowerCase();
  const rows = vis
    .filter((e) => (!filter || S.estStatus(e) === filter) && (!cust || e.customer === cust) && (!qq || (e.id + " " + S.cust(e.customer).name + " " + e.ref).toLowerCase().includes(qq)))
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
  const pg = S.paginate(rows, page, 12);
  const open = vis.filter((e) => ["Draft", "Sent"].includes(S.estStatus(e)));
  const accepted = vis.filter((e) => S.estStatus(e) === "Accepted");
  const decided = vis.filter((e) => ["Accepted", "Converted", "Rejected"].includes(S.estStatus(e)));
  const won = decided.filter((e) => S.estStatus(e) !== "Rejected").length;
  const custOpts = [{ value: "", label: "All customers" }, ...s.customers.map((c) => ({ value: c.id, label: c.name, hint: c.id }))];

  return (
    <>
      <PageHeader
        icon={FilePen}
        title="Estimates"
        description="Quotations for customers. Accepted estimates convert into sales orders with the quoted prices, discounts and taxes."
        actions={S.can("est.create") && <Button onClick={() => S.nav("estimates", { action: "new" })}><Plus />New estimate</Button>}
      />
      <Grid min={200}>
        <StatCard label="Open estimates" value={S.money(open.reduce((a, e) => a + e.total, 0))} sub={open.length + " draft or sent"} />
        <StatCard label="Accepted, not yet ordered" value={S.money(accepted.reduce((a, e) => a + e.total, 0))} sub={accepted.length + " ready to convert"} tone={accepted.length ? "warning" : "default"} onClick={() => { setFilter("Accepted"); setPage(1); }} />
        <StatCard label="Win rate" value={decided.length ? Math.round((won * 100) / decided.length) + "%" : "—"} sub={won + " of " + decided.length + " decided estimates"} />
      </Grid>
      <Toolbar className="justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => { setFilter(v); setPage(1); }}
          items={GROUPS.map((g) => ({ value: g, label: <>{g || "All"} <span className="text-[11px] text-subtle-foreground tabular">{vis.filter((e) => !g || S.estStatus(e) === g).length}</span></> }))}
          className="w-full min-w-0 lg:w-auto lg:border-b-0"
        />
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Combobox value={cust} onValueChange={(v) => { setCust(v); setPage(1); }} options={custOpts} placeholder="All customers" className="w-full sm:w-52" aria-label="Customer filter" />
          <Input icon={<Search />} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search estimate, customer, ref" className="w-full sm:w-56" />
        </div>
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Estimate</TH>
              <TH>Customer</TH>
              <TH>Date</TH>
              <TH>Valid until</TH>
              <TH align="right">Lines</TH>
              <TH align="right">Total</TH>
              <TH>Status</TH>
              <TH>Sales order</TH>
              <TH>Prepared by</TH>
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((e) => {
              const st = S.estStatus(e);
              return (
                <TR key={e.id} onClick={() => S.nav("estimates", { id: e.id })}>
                  <TD nowrap><Ref>{e.id}</Ref>{e.ref && <div className="text-[11px] text-subtle-foreground">{e.ref}</div>}</TD>
                  <TD className="min-w-[170px]">{S.cust(e.customer).name}</TD>
                  <TD nowrap className="text-muted-foreground">{S.fmtDate(e.date)}</TD>
                  <TD nowrap className={st === "Expired" ? "text-danger" : "text-muted-foreground"}>{S.fmtDate(e.expiry)}</TD>
                  <TD nowrap align="right">{e.lines.length}</TD>
                  <TD nowrap align="right" className="font-medium">{S.money(e.total)}</TD>
                  <TD nowrap><StatusBadge status={st} /></TD>
                  <TD nowrap>{e.so ? <Ref onClick={() => S.nav("sales-orders", { id: e.so })}>{e.so}</Ref> : <span className="text-subtle-foreground">—</span>}</TD>
                  <TD nowrap>{S.uname(e.by)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {!pg.rows.length && <EmptyState icon={<Search />} title="No estimates match.">{S.can("est.create") ? "Create one with “New estimate”." : undefined}</EmptyState>}
        <Pagination {...pg} onPage={setPage} />
      </Card>
    </>
  );
}
