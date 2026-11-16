"use client";

import * as React from "react";
import { Plus, Search, Wallet } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Grid, Page, PageHeader, Ref, StatCard, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentDialog, type PayInit } from "@/features/finance/payment-dialog";
import { PaymentDetail } from "./payment-detail";

/** Sales → Payments: customer receipts, allocations, verification and reversals. */
export default function PaymentsPage() {
  const S = useSoap();
  const s = S.s;
  const route = s.route;
  const [pay, setPay] = React.useState<PayInit | null>(() => (route.action === "new" && S.can("fin.record") ? { customer: typeof route.customer === "string" ? route.customer : "", inv: typeof route.inv === "string" ? route.inv : undefined } : null));
  const dialog = pay && (
    <PaymentDialog
      init={pay}
      onClose={() => setPay(null)}
      onSaved={(id) => {
        setPay(null);
        S.nav("payments", { id });
      }}
    />
  );

  const p0 = route.id ? s.payments.find((p) => p.id === route.id) : undefined;
  if (p0)
    return (
      <Page>
        <PaymentDetail key={p0.id} p={p0} />
        {dialog}
      </Page>
    );
  return (
    <Page>
      <PaymentList onNew={() => setPay({ customer: "" })} />
      {dialog}
    </Page>
  );
}

function PaymentList({ onNew }: { onNew: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [page, setPage] = React.useState(1);

  const all = s.payments;
  const live = all.filter((p) => p.status !== "Reversed");
  const month = S.TODAY.slice(0, 7);
  const collected = live.filter((p) => p.date.startsWith(month)).reduce((a, p) => a + p.amount, 0);
  const unverified = all.filter((p) => p.status === "Recorded");
  const onAccount = live.reduce((a, p) => a + (p.unallocated || 0), 0);
  const reversed = all.filter((p) => p.status === "Reversed");

  const term = q.trim().toLowerCase();
  const rows = all.filter(
    (p) =>
      (!status || p.status === status) &&
      (!method || p.method === method) &&
      (!customer || p.customer === customer) &&
      (!term || (p.id + " " + p.rct + " " + p.extRef + " " + S.cust(p.customer).name + " " + p.alloc.map((a) => a.inv).join(" ")).toLowerCase().includes(term)),
  );
  const pg = S.paginate(rows, page, 12);
  const reset = () => setPage(1);

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Payments"
        description="Customer payments and receipts. Payments are recorded manually and verified against statements; corrections are made by reversal, never deletion."
        actions={S.can("fin.record") && <Button onClick={onNew}><Plus />Record payment</Button>}
      />
      <Grid min={200}>
        <StatCard label={"Collected in " + S.fmtDate(month + "-01").split(" ")[1]} value={S.money(collected)} sub={live.filter((p) => p.date.startsWith(month)).length + " payments, excl. reversed"} />
        <StatCard label="Awaiting verification" value={S.money(unverified.reduce((a, p) => a + p.amount, 0))} sub={unverified.length + " recorded, not yet matched"} tone={unverified.length ? "warning" : "default"} onClick={() => { setStatus("Recorded"); reset(); }} />
        <StatCard label="Held on account" value={S.money(onAccount)} sub="Unallocated customer credit" />
        <StatCard label="Reversed" value={String(reversed.length)} sub={S.money(reversed.reduce((a, p) => a + p.amount, 0)) + " — kept for audit"} onClick={() => { setStatus("Reversed"); reset(); }} />
      </Grid>
      <Toolbar>
        <Input icon={<Search />} value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Search payment, receipt, reference or customer" className="w-full sm:w-72" />
        <Select value={status} onValueChange={(v) => { setStatus(v); reset(); }} options={[{ value: "", label: "All statuses" }, "Recorded", "Verified", "Reversed"]} className="w-[calc(50%-4px)] sm:w-40" aria-label="Status" />
        <Select value={method} onValueChange={(v) => { setMethod(v); reset(); }} options={[{ value: "", label: "All methods" }, ...s.settings.paymentMethods]} className="w-[calc(50%-4px)] sm:w-40" aria-label="Method" />
        <Select value={customer} onValueChange={(v) => { setCustomer(v); reset(); }} options={[{ value: "", label: "All customers" }, ...s.customers.map((c) => ({ value: c.id, label: c.name }))]} className="w-full sm:w-56" aria-label="Customer" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Payment</TH>
              <TH>Receipt</TH>
              <TH>Customer</TH>
              <TH>Received</TH>
              <TH align="right">Amount</TH>
              <TH>Method / ref.</TH>
              <TH>Allocated to</TH>
              <TH>Received by</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((p) => (
              <TR key={p.id} onClick={() => S.nav("payments", { id: p.id })}>
                <TD nowrap><Ref>{p.id}</Ref></TD>
                <TD nowrap className="font-mono text-[11.5px]">{p.rct}</TD>
                <TD className="min-w-[150px]">{S.cust(p.customer).name}</TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(p.date)}</TD>
                <TD nowrap align="right" className="font-semibold">{S.money(p.amount)}</TD>
                <TD nowrap>
                  {p.method}
                  <div className="font-mono text-[11px] text-muted-foreground">{p.extRef || "—"}</div>
                </TD>
                <TD className="min-w-[140px] text-[12px]">
                  {p.alloc.map((a) => (
                    <div key={a.inv}><Ref onClick={() => S.nav("invoices", { id: a.inv })}>{a.inv}</Ref> <span className="tabular text-muted-foreground">{S.money(a.amount)}</span></div>
                  ))}
                  {(p.unallocated || 0) > 0 && <div className="text-muted-foreground">On account {S.money(p.unallocated)}</div>}
                </TD>
                <TD nowrap>{S.uname(p.receivedBy)}</TD>
                <TD nowrap><StatusBadge status={p.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!pg.rows.length && <EmptyState icon={<Search />} title="No payments match." />}
        <Pagination {...pg} onPage={setPage} />
      </Card>
    </>
  );
}
