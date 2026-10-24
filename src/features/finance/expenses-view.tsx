"use client";

import * as React from "react";
import { Search, Wallet } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, Progress } from "@/components/ui/misc";
import { Page, PageHeader, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { ExpenseDialog } from "./expense-dialog";
import type { Expense } from "./types";

export function ExpensesView() {
  const S = useSoap();
  const s = S.s;
  const [es, setEs] = React.useState("");
  const [ec, setEc] = React.useState("");
  const [form, setForm] = React.useState(() => s.route.action === "new" && S.can("exp.create"));

  const sc = S.scope();
  const exps = (s.expenses as Expense[]).filter((e) => sc.includes(e.wh));
  const approved = exps.filter((e) => e.status === "Approved" && e.date.startsWith("2026-10"));
  const cats = s.settings.expenseCategories.map((c) => ({ name: c, v: approved.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0) })).filter((c) => c.v > 0);
  const mx = Math.max(1, ...cats.map((c) => c.v));
  const canApprove = S.can("exp.approve");
  const rows = exps.filter((e) => (!es || e.status === es) && (!ec || e.category === ec));

  const reject = (e: Expense) =>
    S.confirm({
      title: "Reject " + e.id + "?",
      body: "The expense will not be posted.",
      confirmLabel: "Reject",
      danger: true,
      reasonLabel: "Reason",
      onConfirm: (rs) => S.result(S.expenseAct(e.id, "reject", rs), "Expense rejected"),
    });

  return (
    <Page>
      <PageHeader
        icon={Wallet}
        title="Operating expenses"
        description="Expenses reduce operating profit — they are not part of cost of goods sold or inventory value."
        actions={S.can("exp.create") && <Button onClick={() => setForm(true)}>Record expense</Button>}
      />
      <Card>
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex flex-wrap justify-between gap-2 text-[13px]">
            <span className="font-semibold">Approved expenses by category · October 2026</span>
            <span className="font-semibold tabular">{S.money(approved.reduce((a, e) => a + e.amount, 0))}</span>
          </div>
          {cats.map((c) => (
            <div key={c.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[12.5px] sm:grid-cols-[170px_minmax(0,1fr)_110px]">
              <span className="truncate">{c.name}</span>
              <Progress value={(c.v / mx) * 100} className="order-last col-span-2 h-2 sm:order-none sm:col-span-1" />
              <span className="text-right tabular">{S.money(c.v)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Toolbar>
        <Select value={es} onValueChange={setEs} options={[{ value: "", label: "All statuses" }, "Pending Approval", "Approved", "Rejected"]} className="w-[calc(50%-4px)] sm:w-44" />
        <Select value={ec} onValueChange={setEc} options={[{ value: "", label: "All categories" }, ...s.settings.expenseCategories]} className="w-[calc(50%-4px)] sm:w-48" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Expense</TH>
              <TH>Date</TH>
              <TH>Category</TH>
              <TH>Description</TH>
              <TH align="right">Amount</TH>
              <TH>Evidence</TH>
              <TH>Status</TH>
              <TH align="right"><span className="sr-only">Actions</span></TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((e) => (
              <TR key={e.id} className={cn(s.route.id === e.id && "bg-primary-soft/50")}>
                <TD nowrap className="font-mono text-[11.5px]">{e.id}</TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(e.date)}</TD>
                <TD nowrap>{e.category}</TD>
                <TD className="min-w-[180px]">
                  {e.description}
                  <div className="text-[11px] text-muted-foreground">
                    {S.wh(e.wh).name} · {e.method} · <span className="font-mono">{e.ref || "—"}</span>
                  </div>
                </TD>
                <TD nowrap align="right" className="font-semibold">{S.money(e.amount)}</TD>
                <TD nowrap className="text-xs">{e.evidence ? "File: " + e.evidence : "None"}</TD>
                <TD nowrap>
                  <StatusBadge status={e.status} />
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {"by " + S.uname(e.by) + (e.approvedBy ? " · " + (e.status === "Rejected" ? "rejected" : "approved") + " by " + S.uname(e.approvedBy) : "")}
                  </div>
                </TD>
                <TD nowrap align="right">
                  {canApprove && e.status === "Pending Approval" && (
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" variant="destructive-outline" onClick={() => reject(e)}>Reject</Button>
                      <Button size="xs" variant="success" onClick={() => S.result(S.expenseAct(e.id, "approve"), "Expense approved")}>Approve</Button>
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!rows.length && <EmptyState icon={<Search />} title="No expenses match." />}
      </Card>
      {form && <ExpenseDialog onClose={() => setForm(false)} />}
    </Page>
  );
}
