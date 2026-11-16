"use client";

import * as React from "react";
import { ArrowRightLeft, Copy, Printer, Send } from "lucide-react";
import { useSoap, type Estimate } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { DetailHeader, Fact, Grid } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { TotalsBlock } from "@/features/sales/shared/line-editor";
import { ActivityCard, DocLinesTable, lineQty, PartyCard, RelatedCard } from "@/features/sales/shared/doc-view";
import { mailDocument, PrintDocDialog } from "@/features/sales/shared/doc-print";
import { estimateSpec } from "@/features/sales/invoices/print-specs";

const WALKIN = "CUS-006";

/** Charges table under the lines (shared by estimate and conversion views). */
function ChargesList({ e }: { e: Estimate }) {
  const S = useSoap();
  if (!e.charges.length) return null;
  return (
    <div className="flex flex-col border-t px-4 py-2.5 text-[12.5px]">
      {e.charges.map((c, i) => (
        <div key={i} className="flex justify-between gap-3 py-0.5">
          <span className="text-muted-foreground">{c.label}</span>
          <span className="tabular">{S.money(c.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export function EstimateDetail({ e }: { e: Estimate }) {
  const S = useSoap();
  const [print, setPrint] = React.useState(false);
  const st = S.estStatus(e);
  const canE = S.can("est.create");
  const open = ["Draft", "Sent"].includes(st);
  const email = e.party.email || S.cust(e.customer).email;
  const company = S.s.settings.company;
  const mail = {
    to: email,
    subject: `Quotation ${e.id} from ${company}`,
    body: `Dear ${e.party.contact && e.party.contact !== "—" ? e.party.contact : e.party.name},\n\nPlease find our quotation ${e.id} for ${S.money(e.total)}, valid until ${S.fmtDate(e.expiry)}.\n\n` + e.lines.map((l) => `- ${l.name}: ${lineQty(S, l)} @ ${S.money(l.uprice)} per ${S.unitDef(l.unit).name.toLowerCase()}`).join("\n") + `\n\nTotal: ${S.money(e.total)}\n\nKind regards,\n${S.user().name}\n${company}`,
  };

  const send = () => {
    const r = S.estimateAct(e.id, "send", email);
    S.result(r, "Estimate sent");
    if (!r.ok) return;
    if (email) mailDocument(mail.to, mail.subject, mail.body);
    else S.toast("warn", "No email on file", `${e.party.name} has no email address. The estimate is marked as sent — share the PDF another way.`);
  };
  const act = (action: string, title: string, msg: string, opts: { reason?: string; danger?: boolean; label: string }) =>
    S.confirm({ title, body: msg, confirmLabel: opts.label, danger: opts.danger, reasonLabel: opts.reason, onConfirm: (rs) => S.result(S.estimateAct(e.id, action, rs), opts.label) });
  const duplicate = () => {
    const r = S.estimateAct(e.id, "duplicate");
    S.result(r, "Estimate duplicated");
    if (r.ok) S.nav("estimates", { id: r.ref });
  };

  const actions: React.ReactNode[] = [];
  if (canE && open) actions.push(<Button key="edit" variant="outline" onClick={() => S.nav("estimates", { id: e.id, action: "edit" })}>Edit</Button>);
  if (canE && !["Converted", "Cancelled"].includes(st))
    actions.push(<Button key="cancel" variant="destructive-outline" onClick={() => act("cancel", "Cancel " + e.id + "?", "The estimate stays on record as Cancelled.", { reason: "Cancellation reason", danger: true, label: "Cancel estimate" })}>Cancel</Button>);
  if (canE && open)
    actions.push(<Button key="exp" variant="outline" onClick={() => act("expire", "Mark " + e.id + " as expired?", "The customer can no longer accept it; duplicate it to quote again.", { label: "Mark expired" })}>Mark expired</Button>);
  if (canE && ["Draft", "Sent", "Expired"].includes(st))
    actions.push(<Button key="rej" variant="outline" onClick={() => act("reject", "Customer rejected " + e.id + "?", "Record the reason the customer gave.", { reason: "Reason for rejection", label: "Mark rejected" })}>Mark rejected</Button>);
  if (canE) actions.push(<Button key="dup" variant="outline" onClick={duplicate}><Copy />Duplicate</Button>);
  actions.push(<Button key="print" variant="outline" onClick={() => setPrint(true)}><Printer />Print / PDF</Button>);
  if (canE && open) actions.push(<Button key="send" variant="outline" onClick={send}><Send />Send to customer</Button>);
  if (canE && open)
    actions.push(<Button key="acc" variant="success" onClick={() => act("accept", "Customer accepted " + e.id + "?", "Accepted estimates can be converted into a sales order with the quoted prices.", { label: "Mark accepted" })}>Mark accepted</Button>);
  if (st === "Accepted" && S.can("so.create"))
    actions.push(<Button key="conv" onClick={() => S.nav("estimates", { id: e.id, action: "convert" })}><ArrowRightLeft />Convert to sales order</Button>);

  const note: [string, "info" | "warning" | "success"] | null =
    st === "Accepted" ? ["Accepted by the customer" + (e.acceptedAt ? " on " + S.fmtDate(e.acceptedAt) : "") + ". Convert it into a sales order — customer, products, quantities, prices, discounts and taxes are carried over unchanged.", "success"]
    : st === "Expired" ? ["This estimate expired on " + S.fmtDate(e.expiry) + ". Duplicate it to quote again at current terms.", "warning"]
    : st === "Converted" ? ["Converted to sales order " + e.so + (e.convertedAt ? " on " + S.fmtDate(e.convertedAt) : "") + ".", "info"]
    : (st === "Rejected" || st === "Cancelled") && e.reason ? [st + ": " + e.reason, "warning"]
    : null;

  return (
    <>
      <DetailHeader
        backLabel="Estimates"
        onBack={() => S.nav("estimates")}
        reference={<span className="inline-flex items-center gap-2">{e.id}<StatusBadge status={st} /></span>}
        title={e.party.name}
        meta={"Dated " + S.fmtDate(e.date) + " · valid until " + S.fmtDate(e.expiry) + " · by " + S.uname(e.by) + (e.copyOf ? " · copy of " + e.copyOf : "")}
        actions={actions}
      />
      {note && <Alert tone={note[1]}>{note[0]}</Alert>}
      <Grid min={170}>
        <Fact k="Estimate total" v={S.money(e.total)} />
        <Fact k="Tax" v={S.money(e.tax)} />
        <Fact k="Warehouse" v={e.wh ? S.wh(e.wh).name : "Not specified"} />
        <Fact k="Customer ref" v={e.ref || "—"} />
        <Fact k="Sent" v={e.sentAt ? S.fmtDate(e.sentAt) + (e.sentTo ? " · " + e.sentTo : "") : "Not sent"} />
      </Grid>
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="overflow-hidden">
            <CardHeader title="Quoted products" />
            <DocLinesTable lines={e.lines} />
            <ChargesList e={e} />
            <div className="flex justify-end border-t px-4 py-3"><TotalsBlock t={e} totalLabel="Estimate total" /></div>
          </Card>
          {(e.notes || e.terms) && (
            <Card>
              <CardContent className="grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2">
                <div><div className="mb-1 font-semibold">Notes</div><div className="whitespace-pre-line text-muted-foreground">{e.notes || "—"}</div></div>
                <div><div className="mb-1 font-semibold">Terms &amp; conditions</div><div className="whitespace-pre-line text-muted-foreground">{e.terms || "—"}</div></div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <PartyCard party={e.party} id={e.customer} />
          <RelatedCard id={e.id} />
          <ActivityCard id={e.id} />
        </div>
      </div>
      {print && <PrintDocDialog spec={estimateSpec(S, e)} onClose={() => setPrint(false)} email={email && canE && open ? { ...mail, onSent: () => S.result(S.estimateAct(e.id, "send", email), "Estimate sent") } : undefined} />}
    </>
  );
}

interface ConvForm { wh: string; method: string; terms: string; address: string; expected: string; ref: string; notes: string; walkin: string }

/** Accepted estimate → sales order. Lines are locked: the engine copies them exactly as quoted. */
export function ConvertEstimate({ e }: { e: Estimate }) {
  const S = useSoap();
  const c = S.cust(e.customer);
  const allowed = S.allowedWh();
  const [f, setFState] = React.useState<ConvForm>(() => ({
    wh: e.wh && allowed.includes(e.wh) ? e.wh : S.scope()[0], method: "Delivery", terms: c.limit ? "Credit" : "Cash",
    address: e.party.delivAddr || e.party.address, expected: "", ref: e.ref, notes: e.notes, walkin: "",
  }));
  const [err, setErr] = React.useState("");
  const setF = (p: Partial<ConvForm>) => { setFState((x) => ({ ...x, ...p })); setErr(""); };
  const short = e.lines.filter((l) => l.qty > S.avail(f.wh, l.sku));

  const go = (confirm: boolean) => {
    const r = S.estimateConvert(e.id, { customer: e.customer, wh: f.wh, method: f.method, terms: f.terms, address: f.address, expected: f.expected, ref: f.ref, notes: f.notes, walkin: f.walkin }, confirm);
    if (!r.ok) return setErr(r.error);
    S.result(r, "Sales order created");
    S.nav("sales-orders", { id: r.ref });
  };

  return (
    <>
      <DetailHeader backLabel={e.id} onBack={() => S.nav("estimates", { id: e.id })} reference={e.id} title={"Convert to sales order · " + e.party.name} meta="Customer, products, quantities, prices, discounts, taxes and charges are carried over exactly as quoted." />
      {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Fulfilment warehouse" required>
                <Select value={f.wh} onValueChange={(wh) => setF({ wh })} options={allowed.map((w) => ({ value: w, label: S.wh(w).name }))} />
              </Field>
              <Field label="Fulfilment">
                <SegmentedControl value={f.method} onValueChange={(method) => setF({ method })} items={[{ value: "Collection", label: "Collection" }, { value: "Delivery", label: "Delivery" }]} className="w-full [&>*]:flex-1 [&>*]:justify-center" />
              </Field>
              <Field label="Payment terms">
                <SegmentedControl
                  value={f.terms}
                  onValueChange={(terms) => (terms === "Credit" && !c.limit ? S.toast("warn", "Credit not available", c.name + " has no credit facility.") : setF({ terms }))}
                  items={[{ value: "Cash", label: "Cash" }, { value: "Credit", label: <span className={c.limit ? undefined : "text-subtle-foreground"}>Credit{c.limit ? " · Net " + c.terms : ""}</span> }]}
                  className="w-full [&>*]:flex-1 [&>*]:justify-center"
                />
              </Field>
              {e.customer === WALKIN && (
                <Field label="Walk-in name & phone" required>
                  <Input value={f.walkin} onChange={(x) => setF({ walkin: x.target.value })} />
                </Field>
              )}
              <Field label="Expected delivery">
                <DatePicker value={f.expected} min={S.TODAY} clearable onChange={(expected) => setF({ expected })} placeholder="Not set" />
              </Field>
              <Field label="Customer reference / PO">
                <Input value={f.ref} onChange={(x) => setF({ ref: x.target.value })} />
              </Field>
              {f.method === "Delivery" && (
                <Field label="Delivery address" required className="sm:col-span-2 lg:col-span-3">
                  <Input value={f.address} onChange={(x) => setF({ address: x.target.value })} />
                </Field>
              )}
              <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
                <Textarea value={f.notes} onChange={(x) => setF({ notes: x.target.value })} className="min-h-14" />
              </Field>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Lines carried over (locked)" description="To change quantities or prices, revise the quote: duplicate the estimate and have it accepted again." />
            <DocLinesTable
              lines={e.lines}
              extra={[{ head: "Available", cell: (l) => <span className={l.qty > S.avail(f.wh, l.sku) ? "text-warning" : undefined}>{S.qty(l.sku, S.avail(f.wh, l.sku))}</span> }]}
            />
            <ChargesList e={e} />
          </Card>
        </div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Review" />
          <CardContent className="flex flex-col gap-3">
            <TotalsBlock t={e} totalLabel="Order total" />
            {short.length > 0 && (
              <Alert tone="warning">
                {short.length} line(s) exceed available stock at {S.wh(f.wh).name}. {S.s.settings.allowBackorders ? "The shortfall will be backordered on confirmation." : "Confirmation will be blocked — save a draft, or choose another warehouse."}
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={() => go(true)}>Confirm order &amp; reserve stock</Button>
              <Button variant="outline" onClick={() => go(false)}>Save as draft order</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
