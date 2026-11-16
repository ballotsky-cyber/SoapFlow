"use client";

import * as React from "react";
import { Mail, Printer } from "lucide-react";
import { useSoap, type Payment } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { DetailHeader, Fact, Grid, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityCard, RelatedCard } from "@/features/sales/shared/doc-view";
import { mailDocument, PrintDocDialog } from "@/features/sales/shared/doc-print";
import { toMinor } from "@/features/finance/money";
import { receiptSpec } from "./receipt";

export function PaymentDetail({ p }: { p: Payment }) {
  const S = useSoap();
  const [print, setPrint] = React.useState(false);
  const [alloc, setAlloc] = React.useState(false);
  const c = S.cust(p.customer);
  const allocated = p.alloc.reduce((a, x) => a + x.amount, 0);
  const reversed = p.status === "Reversed";

  const reverse = () =>
    S.confirm({
      title: "Reverse " + p.id + "?",
      body: "Allocations are removed and invoice balances restored. The payment and receipt " + p.rct + " stay on record as Reversed.",
      confirmLabel: "Reverse payment",
      danger: true,
      reasonLabel: "Reason for reversal",
      onConfirm: (rs) => S.result(S.paymentAct(p.id, "reverse", rs), "Payment reversed"),
    });
  const verify = () =>
    S.confirm({
      title: "Verify " + p.id + "?",
      body: "Confirm you have matched " + S.money(p.amount) + (p.extRef ? " (ref " + p.extRef + ")" : "") + " to the " + p.method.toLowerCase() + " statement.",
      confirmLabel: "Mark verified",
      onConfirm: () => S.result(S.paymentAct(p.id, "verify"), "Payment verified"),
    });
  const email = {
    to: c.email || "",
    subject: `Payment receipt ${p.rct} — ${S.s.settings.company}`,
    body: `Dear ${c.contact && c.contact !== "—" ? c.contact : c.name},\n\nThank you for your payment of ${S.money(p.amount)} received on ${S.fmtDate(p.date)} by ${p.method}${p.extRef ? " (ref " + p.extRef + ")" : ""}.\n\nReceipt: ${p.rct}\nApplied to: ${p.alloc.map((a) => a.inv + " " + S.money(a.amount)).join(", ") || "held on account"}\n\nRegards,\n${S.s.settings.company}`,
    onSent: () => S.result(S.paymentAct(p.id, "send"), "Receipt sent"),
  };

  const actions: React.ReactNode[] = [
    <Button key="print" variant="outline" onClick={() => setPrint(true)}><Printer />Receipt / PDF</Button>,
  ];
  if (!reversed && (S.can("fin.record") || S.can("fin.verify")))
    actions.push(<Button key="mail" variant="outline" onClick={() => { if (!c.email) return S.toast("warn", "No email on file", "Add an email address to " + c.name + " first."); mailDocument(email.to, email.subject, email.body); email.onSent(); }}><Mail />Email receipt</Button>);
  if (!reversed && (p.unallocated || 0) > 0 && S.can("fin.record")) actions.push(<Button key="alloc" variant="outline" onClick={() => setAlloc(true)}>Allocate on-account</Button>);
  if (!reversed && S.can("fin.reverse")) actions.push(<Button key="rev" variant="destructive-outline" onClick={reverse}>Reverse</Button>);
  if (p.status === "Recorded" && S.can("fin.verify")) actions.push(<Button key="ver" variant="success" onClick={verify}>Verify</Button>);

  return (
    <>
      <DetailHeader
        backLabel="Payments"
        onBack={() => S.nav("payments")}
        reference={<span className="inline-flex items-center gap-2">{p.id}<StatusBadge status={p.status} /></span>}
        title={c.name}
        meta={`Receipt ${p.rct} · ${S.fmtDate(p.date)} · ${p.method}${p.extRef ? " · " + p.extRef : ""} · received by ${S.uname(p.receivedBy)} · recorded by ${S.uname(p.by)}`}
        actions={actions}
      />
      {reversed && <Alert tone="warning">Reversed{p.reversedBy ? " by " + S.uname(p.reversedBy) : ""}{p.reversedAt ? " on " + S.fmtDate(p.reversedAt) : ""}: {p.reversal}. Invoice balances were restored; this record is kept for audit.</Alert>}
      {p.status === "Recorded" && <Alert tone="info">Manually recorded — not yet matched to a bank or mobile-money statement.</Alert>}
      <Grid min={170}>
        <Fact k="Amount received" v={<span className="tabular">{S.money(p.amount)}</span>} />
        <Fact k="Applied to invoices" v={<span className="tabular">{S.money(allocated)}</span>} />
        <Fact k="Held on account" v={<span className="tabular">{S.money(p.unallocated || 0)}</span>} />
        <Fact k="Verified by" v={p.verifiedBy ? S.uname(p.verifiedBy) : "—"} />
      </Grid>
      <Card className="overflow-hidden">
        <CardHeader title="Invoice allocations" />
        <Table>
          <THead>
            <tr>
              <TH>Invoice</TH>
              <TH>Invoice status</TH>
              <TH align="right">Invoice total</TH>
              <TH align="right">Applied</TH>
              <TH align="right">Balance after payment</TH>
              <TH align="right">Balance now</TH>
            </tr>
          </THead>
          <TBody>
            {p.alloc.map((a) => {
              const i = S.s.invoices.find((x) => x.id === a.inv);
              return (
                <tr key={a.inv}>
                  <TD nowrap><Ref onClick={() => S.nav("invoices", { id: a.inv })}>{a.inv}</Ref></TD>
                  <TD nowrap>{i ? <StatusBadge status={S.invStatus(i)} /> : "—"}</TD>
                  <TD nowrap align="right">{i ? S.money(i.total) : "—"}</TD>
                  <TD nowrap align="right" className="font-medium">{S.money(a.amount)}</TD>
                  <TD nowrap align="right">{a.balAfter != null ? S.money(a.balAfter) : "—"}</TD>
                  <TD nowrap align="right">{i ? S.money(S.invBal(i)) : "—"}</TD>
                </tr>
              );
            })}
          </TBody>
        </Table>
        {!p.alloc.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">Not allocated to any invoice — the amount is held on the customer&apos;s account.</div>}
      </Card>
      {p.notes && <Card className="px-4 py-3 text-[12.5px]"><span className="text-muted-foreground">Notes: </span>{p.notes}</Card>}
      <Grid min={380}>
        <RelatedCard id={p.id} />
        <PaymentActivity p={p} />
      </Grid>
      {print && <PrintDocDialog spec={receiptSpec(S, p)} onClose={() => setPrint(false)} email={!reversed && c.email ? email : undefined} />}
      {alloc && <AllocateDialog p={p} onClose={() => setAlloc(false)} />}
    </>
  );
}

/** Payment history plus receipt-level events (sending a receipt is logged against the receipt number). */
function PaymentActivity({ p }: { p: Payment }) {
  const S = useSoap();
  const rows = [...S.history(p.id), ...S.history(p.rct)].filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i).sort((a, b) => (a.ts < b.ts ? 1 : -1));
  if (!rows.length) return <ActivityCard id={p.id} />;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Activity history" description="From the audit trail" />
      <div className="max-h-80 overflow-y-auto">
        {rows.map((a) => (
          <div key={a.id} className="flex flex-col gap-0.5 border-b px-4 py-2.5 text-[12.5px] last:border-0">
            <span><b className="font-semibold">{a.action}</b>{a.ref !== p.id && <span className="font-mono text-[11px] text-muted-foreground"> · {a.ref}</span>}</span>
            <span className="text-[11.5px] text-muted-foreground">{S.fmtDate(a.ts)} · {S.uname(a.user)}{a.detail ? " · " + a.detail : ""}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Apply an on-account (unallocated) amount to the customer's open invoices. */
function AllocateDialog({ p, onClose }: { p: Payment; onClose: () => void }) {
  const S = useSoap();
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const open = S.s.invoices.filter((i) => i.customer === p.customer && i.status === "Issued" && S.invBal(i) > 0).sort((a, b) => (a.due < b.due ? -1 : 1));
  const sum = Object.values(vals).reduce((a, v) => a + (toMinor(v) || 0), 0);
  const save = () => {
    const rows = Object.keys(vals).map((k) => ({ inv: k, amount: toMinor(vals[k]) })).filter((a) => a.amount);
    if (rows.some((a) => isNaN(a.amount))) return setErr("Enter valid amounts, e.g. 250.00");
    const r = S.paymentAllocate(p.id, rows);
    if (!r.ok) return setErr(r.error);
    S.result(r, "Payment allocated");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title={"Allocate " + p.id} description={S.money(p.unallocated || 0) + " is held on account for " + S.cust(p.customer).name} />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="overflow-hidden rounded-xl border">
            {open.map((i) => (
              <div key={i.id} className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 border-b px-3 py-2 text-[12.5px] last:border-0">
                <span className="min-w-0">
                  <span className="font-mono">{i.id}</span> <StatusBadge status={S.invStatus(i)} />
                  <span className="block text-muted-foreground tabular">due {S.fmtDate(i.due)} · balance {S.money(S.invBal(i))}</span>
                </span>
                <Input value={vals[i.id] || ""} onChange={(e) => { setVals((v) => ({ ...v, [i.id]: e.target.value })); setErr(""); }} inputMode="decimal" placeholder="0.00" aria-label={"Allocate to " + i.id} className="h-8 text-right tabular" />
              </div>
            ))}
            {!open.length && <div className="px-3 py-3.5 text-[12.5px] text-muted-foreground">This customer has no issued invoices with a balance.</div>}
          </div>
          <div className="text-[12.5px] text-muted-foreground tabular">Allocating {S.money(sum)} of {S.money(p.unallocated || 0)} available.</div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!open.length}>Allocate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
