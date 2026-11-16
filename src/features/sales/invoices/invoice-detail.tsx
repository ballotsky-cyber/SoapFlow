"use client";

import * as React from "react";
import { FileMinus, Pencil, Printer, Send, Truck, Wallet } from "lucide-react";
import { useSoap, type Invoice } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { DetailHeader, Fact, Grid, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { Totals } from "@/features/procurement/parts";
import { PaymentDialog } from "@/features/finance/payment-dialog";
import { CreditNoteDialog } from "@/features/sales/credit-notes/credit-note-dialog";
import { TotalsBlock } from "@/features/sales/shared/line-editor";
import { ActivityCard, DocLinesTable, PartyCard, RelatedCard } from "@/features/sales/shared/doc-view";
import { mailDocument, PrintDocDialog } from "@/features/sales/shared/doc-print";
import { invoiceSpec } from "./print-specs";

/** Invoice origin badge: from a sales order, direct, or a migrated opening balance. */
export function KindBadge({ i }: { i: Invoice }) {
  if (i.kind === "Direct") return <Badge tone="violet">Direct</Badge>;
  if (i.kind === "Legacy") return <Badge tone="gray">Opening balance</Badge>;
  return <Badge tone="blue">From order</Badge>;
}

export function InvoiceDetail({ i }: { i: Invoice }) {
  const S = useSoap();
  const s = S.s;
  const [print, setPrint] = React.useState(false);
  const [pay, setPay] = React.useState(false);
  const [cn, setCn] = React.useState(false);
  const [fulfil, setFulfil] = React.useState(false);
  const status = S.invStatus(i);
  const bal = S.invBal(i);
  const issued = i.status === "Issued";
  const email = i.party.email || S.cust(i.customer).email;
  const company = s.settings.company;
  const mail = {
    to: email,
    subject: `Invoice ${i.id} from ${company}`,
    body: `Dear ${i.party.contact && i.party.contact !== "—" ? i.party.contact : i.party.name},\n\nPlease find invoice ${i.id} dated ${S.fmtDate(i.date)} for ${S.money(i.total)}${i.so ? " (sales order " + i.so + ")" : ""}.\nAmount due: ${S.money(bal)} by ${S.fmtDate(i.due)}.\n\nPayment details: ${s.settings.bankDetails}. Please quote ${i.id} as the reference.\n\nKind regards,\n${S.user().name}\n${company}`,
  };
  const canSend = issued && (S.can("sinv.create") || S.can("sinv.issue") || S.can("fin.record"));

  const send = () => {
    const r = S.invoiceAct(i.id, "send", email);
    S.result(r, "Invoice sent");
    if (!r.ok) return;
    if (email) mailDocument(mail.to, mail.subject, mail.body);
    else S.toast("warn", "No email on file", `${i.party.name} has no email address. Marked as sent — share the PDF another way.`);
  };
  const reasonAct = (action: string, title: string, body: string, label: string) =>
    S.confirm({ title, body, confirmLabel: label, danger: true, reasonLabel: "Reason", onConfirm: (rs) => S.result(S.invoiceAct(i.id, action, rs), label) });

  const actions: React.ReactNode[] = [];
  if (i.status === "Draft") {
    if (S.can("sinv.create") || S.can("doc.cancel")) actions.push(<Button key="cancel" variant="destructive-outline" onClick={() => reasonAct("cancel", "Cancel draft " + i.id + "?", "The number stays on record as Cancelled and its quantities are released back to the order.", "Cancel draft")}>Cancel draft</Button>);
    if (S.can("sinv.create")) actions.push(<Button key="edit" variant="outline" onClick={() => S.nav("invoices", { id: i.id, action: "edit" })}><Pencil />Edit</Button>);
  }
  if (issued && S.can("doc.cancel") && !i.paid && !i.credited)
    actions.push(<Button key="void" variant="destructive-outline" onClick={() => reasonAct("void", "Void " + i.id + "?", "Voiding keeps the invoice number on record, reverses its revenue and releases order quantities. Only possible with no payments or credit notes.", "Void invoice")}>Void</Button>);
  actions.push(<Button key="print" variant="outline" onClick={() => setPrint(true)}><Printer />Print / PDF</Button>);
  if (canSend) actions.push(<Button key="send" variant="outline" onClick={send}><Send />Send to customer</Button>);
  if (issued && i.kind === "Direct" && !i.so && i.lines.length && S.can("so.create")) actions.push(<Button key="ful" variant="outline" onClick={() => setFulfil(true)}><Truck />Create fulfilment order</Button>);
  if (issued && S.can("cn.create") && i.total - i.credited > 0) actions.push(<Button key="cn" variant="outline" onClick={() => setCn(true)}><FileMinus />Credit note</Button>);
  if (i.status === "Draft" && S.can("sinv.issue"))
    actions.push(<Button key="issue" onClick={() => S.confirm({ title: "Issue " + i.id + "?", body: "Issued invoices cannot be edited; corrections are made with credit notes.", confirmLabel: "Issue invoice", onConfirm: () => S.result(S.invoiceAct(i.id, "issue"), "Invoice issued") })}>Issue invoice</Button>);
  if (issued && bal > 0 && S.can("fin.record")) actions.push(<Button key="pay" onClick={() => setPay(true)}><Wallet />Record payment</Button>);

  const payments = s.payments.filter((p) => p.alloc.some((a) => a.inv === i.id));
  const cns = s.creditNotes.filter((n) => n.inv === i.id);
  const note: [string, "info" | "warning" | "danger"] | null =
    i.status === "Draft" ? ["Draft — not yet sent or payable. Its quantities are held against " + (i.so || "the order") + " until it is issued or cancelled.", "info"]
    : i.status === "Void" ? ["Voided" + (i.voidedAt ? " on " + S.fmtDate(i.voidedAt) : "") + " by " + S.uname(i.voidedBy) + ": " + (i.reason || "") + ".", "warning"]
    : i.status === "Cancelled" ? ["Cancelled draft: " + (i.reason || "") + ".", "warning"]
    : status === "Overdue" ? ["Overdue by " + S.diffDays(S.TODAY, i.due) + " days — balance " + S.money(bal) + ".", "danger"]
    : i.kind === "Direct" && !i.so && i.lines.length ? ["Direct invoice: no stock has left a warehouse for it. Create a fulfilment order if the goods still need to be collected or delivered.", "info"]
    : null;

  return (
    <>
      <DetailHeader
        backLabel="Invoices"
        onBack={() => S.nav("invoices")}
        reference={<span className="inline-flex items-center gap-2">{i.id}<StatusBadge status={status} /><KindBadge i={i} /></span>}
        title={i.party.name}
        meta={
          <span>
            {i.kind === "SO" ? "From sales order " : i.so ? "Direct invoice · fulfilled by " : i.kind === "Direct" ? "Direct invoice" : "Opening balance"}
            {i.so && <Ref onClick={() => S.nav("sales-orders", { id: i.so })}>{i.so}</Ref>}
            {i.auto ? " · raised at dispatch " + (i.dsp || "") : ""} · {S.wh(i.wh).name} · created by {S.uname(i.by)}
            {i.issuedBy ? " · issued by " + S.uname(i.issuedBy) + (i.issuedAt ? " on " + S.fmtDate(i.issuedAt) : "") : ""}
          </span>
        }
        actions={actions}
      />
      {note && <Alert tone={note[1]}>{note[0]}</Alert>}
      <Grid min={160}>
        <Fact k="Invoice date" v={S.fmtDate(i.date)} />
        <Fact k="Due date" v={<span className={status === "Overdue" ? "text-danger" : undefined}>{S.fmtDate(i.due)}</span>} />
        <Fact k="Payment terms" v={i.termsDays ? "Net " + i.termsDays + " days" : "Due on receipt"} />
        <Fact k="Total" v={S.money(i.total)} />
        <Fact k="Balance due" v={<span className={bal > 0 ? "font-semibold" : "text-success"}>{issued ? S.money(bal) : "—"}</span>} />
        <Fact k="Sent" v={i.sentAt ? S.fmtDate(i.sentAt) + (i.sentTo ? " · " + i.sentTo : "") : "Not sent"} />
      </Grid>
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="overflow-hidden">
            <CardHeader title="Invoice lines" description={i.ref ? "Customer ref " + i.ref : undefined} />
            <DocLinesTable lines={i.lines} empty="Opening-balance invoice — migrated without line detail." />
            {i.charges.length > 0 && (
              <div className="flex flex-col border-t px-4 py-2.5 text-[12.5px]">
                {i.charges.map((c, k) => (
                  <div key={k} className="flex justify-between gap-3 py-0.5">
                    <span className="text-muted-foreground">{c.label}{c.soCharge != null ? " · order charge" : ""}</span>
                    <span className="tabular">{S.money(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-x-10 gap-y-3 border-t px-4 py-3">
              <TotalsBlock t={i} totalLabel="Invoice total" />
              {issued && <Totals rows={[{ k: "Paid", v: S.money(i.paid) }, { k: "Credited", v: S.money(i.credited) }, { k: "Balance due", v: S.money(bal), strong: true }]} />}
            </div>
            {i.notes && <div className="border-t px-4 py-2.5 text-[12.5px] whitespace-pre-line text-muted-foreground">{i.notes}</div>}
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Payment history" />
            <Table>
              <THead>
                <tr>
                  <TH>Payment</TH>
                  <TH>Receipt</TH>
                  <TH>Date</TH>
                  <TH>Method · reference</TH>
                  <TH align="right">Allocated</TH>
                  <TH align="right">Balance after</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {payments.map((p) => {
                  const a = p.alloc.find((x) => x.inv === i.id);
                  return (
                    <TR key={p.id} onClick={() => S.nav("payments", { id: p.id })}>
                      <TD nowrap><Ref>{p.id}</Ref></TD>
                      <TD nowrap className="font-mono text-[11.5px]">{p.rct}</TD>
                      <TD nowrap className="text-muted-foreground">{S.fmtDate(p.date)}</TD>
                      <TD nowrap>{p.method}<div className="font-mono text-[11px] text-muted-foreground">{p.extRef || "—"}</div></TD>
                      <TD nowrap align="right" className={p.status === "Reversed" ? "text-muted-foreground line-through" : "text-success"}>{S.money(a ? a.amount : 0)}</TD>
                      <TD nowrap align="right">{a && a.balAfter != null ? S.money(a.balAfter) : "—"}</TD>
                      <TD nowrap><StatusBadge status={p.status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            {!payments.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">No payments allocated yet.</div>}
          </Card>
          {cns.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Credit notes" />
              <Table>
                <THead>
                  <tr>
                    <TH>Credit note</TH>
                    <TH>Type</TH>
                    <TH>Date</TH>
                    <TH>Reason</TH>
                    <TH align="right">Amount</TH>
                    <TH>Return</TH>
                  </tr>
                </THead>
                <TBody>
                  {cns.map((n) => (
                    <TR key={n.id} onClick={() => S.nav("credit-notes", { id: n.id })}>
                      <TD nowrap><Ref>{n.id}</Ref></TD>
                      <TD nowrap><Badge tone={n.type === "Return" ? "amber" : "gray"}>{n.type}</Badge></TD>
                      <TD nowrap className="text-muted-foreground">{S.fmtDate(n.date)}</TD>
                      <TD className="min-w-[160px]">{n.reason}</TD>
                      <TD nowrap align="right">{S.money(n.amount)}</TD>
                      <TD nowrap>{n.rtn ? <span className="font-mono text-[11.5px]">{n.rtn}</span> : "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <PartyCard title="Bill to" party={i.party} id={i.customer} />
          <RelatedCard id={i.id} />
          <ActivityCard id={i.id} />
        </div>
      </div>
      {print && <PrintDocDialog spec={invoiceSpec(S, i)} onClose={() => setPrint(false)} email={canSend && email ? { ...mail, onSent: () => S.result(S.invoiceAct(i.id, "send", email), "Invoice sent") } : undefined} />}
      {pay && <PaymentDialog init={{ customer: i.customer, inv: i.id }} onClose={() => setPay(false)} onSaved={() => setPay(false)} />}
      {cn && <CreditNoteDialog invId={i.id} onClose={() => setCn(false)} onSaved={() => setCn(false)} />}
      {fulfil && <FulfilDialog i={i} onClose={() => setFulfil(false)} />}
    </>
  );
}

/** Direct invoice → sales order for the goods, so stock leaves through dispatch. */
function FulfilDialog({ i, onClose }: { i: Invoice; onClose: () => void }) {
  const S = useSoap();
  const allowed = S.allowedWh();
  const [f, setF] = React.useState(() => ({ wh: allowed.includes(i.wh) ? i.wh : allowed[0], method: "Collection", address: i.party.delivAddr || i.party.address, expected: "" }));
  const [err, setErr] = React.useState("");
  const short = i.lines.filter((l) => l.qty > S.avail(f.wh, l.sku));
  const go = () => {
    const r = S.invoiceAct(i.id, "fulfil", f);
    if (!r.ok) return setErr(r.error);
    S.result(r, "Fulfilment order created");
    onClose();
    S.nav("sales-orders", { id: r.ref });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title={"Create fulfilment order for " + i.id} description="A confirmed sales order is created for the invoiced goods and stock is reserved. It is already fully invoiced, so it cannot be billed twice." />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Fulfilment warehouse" required>
              <Select value={f.wh} onValueChange={(wh) => { setF((x) => ({ ...x, wh })); setErr(""); }} options={allowed.map((w) => ({ value: w, label: S.wh(w).name }))} />
            </Field>
            <Field label="Fulfilment">
              <SegmentedControl value={f.method} onValueChange={(method) => setF((x) => ({ ...x, method }))} items={[{ value: "Collection", label: "Collection" }, { value: "Delivery", label: "Delivery" }]} className="w-full [&>*]:flex-1 [&>*]:justify-center" />
            </Field>
            {f.method === "Delivery" && (
              <Field label="Delivery address" required className="sm:col-span-2">
                <Input value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} />
              </Field>
            )}
            <Field label="Expected delivery">
              <DatePicker value={f.expected} min={S.TODAY} clearable placeholder="Not set" onChange={(expected) => setF((x) => ({ ...x, expected }))} />
            </Field>
          </div>
          {short.length > 0 && <Alert tone="warning">{short.map((l) => l.name).join(", ")}: not enough available stock at {S.wh(f.wh).name}.{S.s.settings.allowBackorders ? " The shortfall will be backordered." : " Reservation will be blocked."}</Alert>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={go}>Create &amp; reserve stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
