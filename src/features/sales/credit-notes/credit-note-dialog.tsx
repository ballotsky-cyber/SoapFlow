"use client";

import * as React from "react";
import { useSoap, type CreditNoteType } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { RadioGroup } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Totals } from "@/features/procurement/parts";
import { toMinor } from "@/features/finance/money";
import { unitQty } from "@/features/sales/shared/doc-view";
import { cn } from "@/lib/utils";

const TYPES: { value: CreditNoteType; label: string; description: string }[] = [
  { value: "Return", label: "Product return", description: "Goods come back. Credit is priced from the invoice; stock is restored only after inspection." },
  { value: "Price correction", label: "Price correction", description: "The invoiced price was wrong. Credit an amount — no goods move." },
  { value: "Discount", label: "Approved discount", description: "A discount agreed after invoicing, e.g. prompt-payment or volume rebate." },
  { value: "Adjustment", label: "Other adjustment", description: "Any other agreed reduction of the invoice balance." },
];

/** Raise a credit note against an issued invoice (POST /api/credit-notes). */
export function CreditNoteDialog({ invId, onClose, onSaved }: { invId?: string; onClose: () => void; onSaved?: (cnId: string) => void }) {
  const S = useSoap();
  const s = S.s;
  const [inv, setInv] = React.useState(invId || "");
  const [type, setType] = React.useState<CreditNoteType>("Return");
  const [reason, setReason] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [qtys, setQtys] = React.useState<Record<string, string>>({});
  const [wh, setWh] = React.useState("");
  const [err, setErr] = React.useState("");

  const i = s.invoices.find((x) => x.id === inv);
  const so = i?.so ? s.salesOrders.find((o) => o.id === i.so) : undefined;
  const canReturn = !!so && !!i?.lines.length;
  const lim = i ? S.cnReturnable(i.id) : [];
  const invOpts = s.invoices.filter((x) => x.status === "Issued" && x.total - x.credited > 0).map((x) => ({ value: x.id, label: x.id + " · " + S.cust(x.customer).name, hint: S.fmtDate(x.date) + " · " + S.money(x.total) + " · balance " + S.money(S.invBal(x)) + " · " + S.invStatus(x) }));
  const whOpts = S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }));
  const retWh = wh || so?.wh || "";
  const effType: CreditNoteType = type === "Return" && i && !canReturn ? "Price correction" : type;

  const base = (sku: string) => {
    const l = i?.lines.find((x) => x.sku === sku);
    const v = parseFloat(qtys[sku] || "");
    return l && v > 0 ? Math.round(v * l.factor) : 0;
  };
  let net = 0, tax = 0;
  if (i && effType === "Return") i.lines.forEach((l) => { const q = base(l.sku); if (q) { const c = S.lineCalc(l, q); net += c.net; tax += c.tax; } });
  else if (i) { const a = toMinor(amount) || 0; tax = i.total ? Math.round((a * i.tax) / i.total) : 0; net = a - tax; }
  const total = net + tax;
  const creditable = i ? i.total - i.credited : 0;

  const save = () => {
    if (!i) return setErr("Select an issued invoice.");
    if (effType !== "Return" && isNaN(toMinor(amount))) return setErr("Enter a valid amount, e.g. 150.00");
    const r = S.creditNoteSave({
      inv: i.id, type: effType, reason, wh: retWh || undefined,
      lines: effType === "Return" ? i.lines.map((l) => ({ sku: l.sku, qty: base(l.sku) })).filter((l) => l.qty) : undefined,
      amount: effType === "Return" ? undefined : toMinor(amount),
    });
    if (!r.ok) return setErr(r.error);
    S.result(r, "Credit note issued");
    onSaved?.(r.ref as string);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader title="New credit note" description="Credit notes reduce an issued invoice's balance and keep the original invoice unchanged for audit." />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <Field label="Invoice" required>
            {invId ? (
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-[13px]">{i ? i.id + " · " + S.cust(i.customer).name : invId}</div>
            ) : (
              <Combobox value={inv} onValueChange={(v) => { setInv(v); setQtys({}); setErr(""); }} options={invOpts} placeholder="Select issued invoice…" searchPlaceholder="Search invoice or customer" aria-label="Invoice" />
            )}
          </Field>
          {i && (
            <div className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
              <span><span className="text-muted-foreground">Total </span><b className="tabular">{S.money(i.total)}</b></span>
              <span><span className="text-muted-foreground">Paid </span><b className="tabular">{S.money(i.paid)}</b></span>
              <span><span className="text-muted-foreground">Credited </span><b className="tabular">{S.money(i.credited)}</b></span>
              <span><span className="text-muted-foreground">Creditable </span><b className="tabular">{S.money(creditable)}</b></span>
            </div>
          )}
          <Field label="Type" required>
            <RadioGroup
              value={effType}
              onValueChange={(v) => { setType(v as CreditNoteType); setErr(""); }}
              options={TYPES.map((t) => ({ ...t, disabled: t.value === "Return" && !!i && !canReturn }))}
              className="grid grid-cols-1 sm:grid-cols-2"
            />
          </Field>
          {i && !canReturn && <div className="text-[11.5px] text-muted-foreground">{i.id} was not fulfilled through a sales order, so goods cannot be returned against it — use an amount-based credit.</div>}

          {i && effType === "Return" && (
            <>
              <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3 border-b bg-muted/60 px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <span>Invoice line</span><span className="text-right">Returned qty</span>
                </div>
                {i.lines.map((l) => {
                  const m = lim.find((x) => x.sku === l.sku);
                  const q = base(l.sku);
                  const over = !!m && q > m.max;
                  return (
                    <div key={l.sku} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b px-3 py-2 text-[12.5px] last:border-0">
                      <span className="min-w-0">
                        <span className="font-medium">{l.name}</span>
                        <span className="block text-[11.5px] text-muted-foreground">
                          Invoiced {unitQty(S, l.unit, l.qty / l.factor)} · credited {m ? S.qty(l.sku, m.credited) : "—"} · returnable up to <b className={cn(over && "text-danger")}>{m ? unitQty(S, l.unit, m.max / l.factor) : "—"}</b>
                        </span>
                      </span>
                      <div className="flex items-center gap-1">
                        <Input value={qtys[l.sku] || ""} onChange={(e) => { setQtys((x) => ({ ...x, [l.sku]: e.target.value.replace(/[^0-9.]/g, "") })); setErr(""); }} inputMode="decimal" placeholder="0" aria-label={"Returned " + l.name} disabled={!m || !m.max} className={cn("h-8 text-right tabular", over && "border-danger")} />
                        <span className="w-8 shrink-0 text-[11px] text-muted-foreground">{l.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Return goods to" hint="Goods are received into quarantine there, then inspected.">
                  <Select value={retWh} onValueChange={setWh} options={whOpts} />
                </Field>
                <Alert tone="info" className="self-end">Stock is not restored now. A return record is opened; the warehouse receives the goods and inspects them before anything goes back to sellable stock.</Alert>
              </div>
            </>
          )}
          {i && effType !== "Return" && (
            <Field label="Credit amount (GHS, incl. tax)" required hint={"Up to " + S.money(creditable) + ". The tax portion is split in the same proportion as the invoice."}>
              <Input value={amount} onChange={(e) => { setAmount(e.target.value); setErr(""); }} inputMode="decimal" placeholder="0.00" className="text-right tabular sm:w-48" />
            </Field>
          )}
          <Field label="Reason" required>
            <Textarea value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} placeholder="e.g. 2 cartons crushed in transit — confirmed by driver" className="min-h-16" />
          </Field>
          {i && (
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
              <span className="text-[12.5px] text-muted-foreground">Balance after credit: <b className="text-foreground tabular">{S.money(S.invBal(i) - total)}</b>{S.invBal(i) - total < 0 ? " (customer credit)" : ""}</span>
              <Totals rows={[{ k: "Net", v: S.money(net) }, { k: "Tax", v: S.money(tax) }, { k: "Credit total", v: S.money(total), strong: true }]} />
            </div>
          )}
          {i && total > creditable && <Alert tone="danger">The credit exceeds what remains creditable on {i.id} ({S.money(creditable)}).</Alert>}
          {i && effType === "Return" && <div className="text-[11.5px] text-muted-foreground">Quantities are entered in each line&apos;s invoiced unit; decimals are converted to whole base units.</div>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!i}>Issue credit note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
