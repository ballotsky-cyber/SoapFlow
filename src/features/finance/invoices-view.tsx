"use client";

import * as React from "react";
import { ReceiptText, Search } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Grid, Page, PageHeader, Ref, StatCard, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { FinanceCharts } from "./finance-charts";
import { PaymentsTab, SupplierTab } from "./payment-tables";
import { InvoiceSheet } from "./invoice-sheet";
import { PaymentDialog, type PayInit } from "./payment-dialog";
import { SupplierPaymentDialog } from "./supplier-payment-dialog";
import type { SupplierInvoice } from "./types";

type Tab = "invoices" | "payments" | "supplier";
const TABS: { value: Tab; label: string }[] = [
  { value: "invoices", label: "Customer invoices" },
  { value: "payments", label: "Customer payments" },
  { value: "supplier", label: "Supplier invoices & payments" },
];

export function InvoicesView() {
  const S = useSoap();
  const s = S.s;
  const route = s.route;
  const [tab, setTab] = React.useState<Tab>(() => (TABS.some((t) => t.value === route.tab) ? (route.tab as Tab) : "invoices"));
  const [is, setIs] = React.useState("");
  const [ic, setIc] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(() => (route.id && route.id.startsWith("INV") ? route.id : null));
  const [pay, setPay] = React.useState<PayInit | null>(() => (route.action === "new" && S.can("fin.record") ? { customer: "" } : null));
  const [sp, setSp] = React.useState(false);

  const sc = S.scope();
  const inv = s.invoices.filter((i) => sc.includes(i.wh));
  const sinv = s.supplierInvoices as SupplierInvoice[];
  const ar = inv.reduce((a, i) => a + S.invBal(i), 0);
  const od = inv.filter((i) => S.invStatus(i) === "Overdue");
  const ap = sinv.reduce((a, i) => a + i.total - i.paid, 0);
  const unv = (s.payments as { status: string; amount: number }[]).filter((p) => p.status === "Recorded");
  const canRecord = S.can("fin.record");

  const rows = inv
    .filter((i) => (!is || S.invStatus(i) === is) && (!ic || i.customer === ic))
    .sort((a, b) => (a.id < b.id ? 1 : -1));
  const custOpts = s.customers.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Page>
      <PageHeader
        icon={ReceiptText}
        title="Invoices & payments"
        description="Receivables and payables in GHS. Payments are recorded manually and verified against statements — never auto-confirmed."
        actions={
          canRecord && (
            <>
              <Button variant="outline" onClick={() => setSp(true)}>Pay supplier</Button>
              <Button onClick={() => setPay({ customer: "" })}>Record customer payment</Button>
            </>
          )
        }
      />
      <Grid min={200}>
        <StatCard label="Customer receivables" value={S.money(ar)} sub={inv.filter((i) => S.invBal(i) > 0).length + " open invoices"} />
        <StatCard label="Overdue receivables" value={S.money(od.reduce((a, i) => a + S.invBal(i), 0))} sub={od.length + " invoices past due"} tone={od.length ? "danger" : "default"} />
        <StatCard label="Payments awaiting verification" value={S.money(unv.reduce((a, p) => a + p.amount, 0))} sub={unv.length + " recorded, not yet verified"} tone={unv.length ? "warning" : "default"} />
        <StatCard label="Supplier payables" value={S.money(ap)} sub={sinv.filter((i) => i.total > i.paid).length + " open supplier invoices"} />
      </Grid>
      <FinanceCharts inv={inv} />
      <Tabs value={tab} onValueChange={setTab} items={TABS} />

      {tab === "invoices" && (
        <>
          <Toolbar>
            <Select value={is} onValueChange={setIs} options={[{ value: "", label: "All statuses" }, "Unpaid", "Partially Paid", "Overdue", "Paid", "Credited"]} className="w-[calc(50%-4px)] sm:w-44" />
            <Select value={ic} onValueChange={setIc} options={[{ value: "", label: "All customers" }, ...custOpts]} className="w-[calc(50%-4px)] sm:w-56" />
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
                  <TH align="right">Total</TH>
                  <TH align="right">Paid</TH>
                  <TH align="right">Credited</TH>
                  <TH align="right">Balance</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((i) => {
                  const status = S.invStatus(i);
                  return (
                    <TR key={i.id} onClick={() => setOpen(i.id)} className={cn(route.id === i.id && "bg-primary-soft/50")}>
                      <TD nowrap><Ref>{i.id}</Ref></TD>
                      <TD className="min-w-[160px]">{S.cust(i.customer).name}</TD>
                      <TD nowrap className="font-mono text-[11.5px]">{i.so || "—"}</TD>
                      <TD nowrap className="text-muted-foreground">{S.fmtDate(i.date)}</TD>
                      <TD nowrap className={status === "Overdue" ? "text-danger" : "text-muted-foreground"}>{S.fmtDate(i.due)}</TD>
                      <TD nowrap align="right">{S.money(i.total)}</TD>
                      <TD nowrap align="right" className="text-success">{i.paid ? S.money(i.paid) : "—"}</TD>
                      <TD nowrap align="right" className="text-muted-foreground">{i.credited ? S.money(i.credited) : "—"}</TD>
                      <TD nowrap align="right" className="font-semibold">{S.money(S.invBal(i))}</TD>
                      <TD nowrap><StatusBadge status={status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            {!rows.length && <EmptyState icon={<Search />} title="No invoices match." />}
          </Card>
        </>
      )}
      {tab === "payments" && <PaymentsTab />}
      {tab === "supplier" && <SupplierTab />}

      {open && (
        <InvoiceSheet
          id={open}
          onClose={() => setOpen(null)}
          onPay={(customer, invId) => {
            setOpen(null);
            setPay({ customer, inv: invId });
          }}
        />
      )}
      {pay && (
        <PaymentDialog
          init={pay}
          onClose={() => setPay(null)}
          onSaved={() => {
            setPay(null);
            setTab("payments");
          }}
        />
      )}
      {sp && (
        <SupplierPaymentDialog
          onClose={() => setSp(false)}
          onSaved={() => {
            setSp(false);
            setTab("supplier");
          }}
        />
      )}
    </Page>
  );
}
