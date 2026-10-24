"use client";

import * as React from "react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, FileInput } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { toMinor } from "./money";

export interface PayInit { customer: string; inv?: string }

interface PayForm { customer: string; date: string; amount: string; method: string; extRef: string; notes: string; file: string; alloc: Record<string, string> }

/** Record customer payment, with allocation across the customer's open invoices. */
export function PaymentDialog({ init, onClose, onSaved }: { init: PayInit; onClose: () => void; onSaved: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [p, setPState] = React.useState<PayForm>(() => ({ customer: init.customer, date: S.TODAY, amount: "", method: "Bank transfer", extRef: "", notes: "", file: "", alloc: init.inv ? { [init.inv]: "" } : {} }));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const setP = (patch: Partial<PayForm>) => {
    setPState((x) => ({ ...x, ...patch }));
    setErr("");
    setErrs({});
  };

  const amount = toMinor(p.amount);
  const open = p.customer ? s.invoices.filter((x) => x.customer === p.customer && S.invBal(x) > 0).sort((a, b) => (a.date < b.date ? -1 : 1)) : [];
  const allocMinor = Object.keys(p.alloc).reduce((a, k) => a + (toMinor(p.alloc[k]) || 0), 0);
  const unalloc = (amount || 0) - allocMinor;

  const autoAlloc = () => {
    if (!(amount > 0)) return setErrs({ amount: "Enter the amount first." });
    let left = amount;
    const alloc: Record<string, string> = {};
    open.forEach((x) => {
      const t = Math.min(left, S.invBal(x));
      if (t > 0) {
        alloc[x.id] = (t / 100).toFixed(2);
        left -= t;
      }
    });
    setP({ alloc });
  };

  const save = () => {
    if (isNaN(amount)) {
      setErrs({ amount: "Enter a valid amount, e.g. 1250.00" });
      setErr("Please fix the highlighted fields.");
      return;
    }
    const alloc = Object.keys(p.alloc).map((k) => ({ inv: k, amount: toMinor(p.alloc[k]) || 0 })).filter((a) => a.amount > 0);
    const r = S.paymentRecord({ customer: p.customer, date: p.date, amount, method: p.method, extRef: p.extRef.trim(), notes: p.notes, evidence: p.file, alloc });
    if (!r.ok) {
      setErrs(r.errs || {});
      setErr(r.error);
      return;
    }
    onSaved();
    S.result(r, "Payment recorded");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader title="Record customer payment" description={`Recorded by ${S.user().name} · status will be “Recorded” until verified against a bank or mobile-money statement`} />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer" required error={errs.customer}>
              <Select value={p.customer} onValueChange={(v) => setP({ customer: v, alloc: {} })} placeholder="Select…" invalid={!!errs.customer} options={s.customers.map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Date received" required>
              <DatePicker value={p.date} onChange={(date) => setP({ date })} />
            </Field>
            <Field label="Amount (GHS)" required error={errs.amount}>
              <Input value={p.amount} onChange={(e) => setP({ amount: e.target.value })} inputMode="decimal" placeholder="0.00" className="text-right tabular" aria-invalid={!!errs.amount || undefined} />
            </Field>
            <Field label="Method" required error={errs.method}>
              <Select value={p.method} onValueChange={(method) => setP({ method })} options={s.settings.paymentMethods} />
            </Field>
            <Field label="External transaction reference" error={errs.extRef}>
              <Input value={p.extRef} onChange={(e) => setP({ extRef: e.target.value })} placeholder="Bank / MoMo reference" aria-invalid={!!errs.extRef || undefined} />
            </Field>
            <Field label="Evidence (optional)">
              <FileInput value={p.file} onChange={(file) => setP({ file })} />
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
              <Input value={p.notes} onChange={(e) => setP({ notes: e.target.value })} />
            </Field>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5">
              <span className="text-[13px] font-semibold">Allocate to invoices</span>
              <Button size="xs" variant="outline" onClick={autoAlloc}>Auto-allocate oldest first</Button>
            </div>
            {open.map((x) => {
              const status = S.invStatus(x);
              return (
                <div key={x.id} className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-[12.5px] sm:grid-cols-[minmax(0,1fr)_auto_7.5rem]">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="font-mono">{x.id}</span>
                    <span className="text-muted-foreground">· due {S.fmtDate(x.due)}</span>
                    <StatusBadge status={status} />
                    <span className="w-full text-muted-foreground tabular sm:hidden">bal {S.money(S.invBal(x))}</span>
                  </span>
                  <span className="hidden whitespace-nowrap text-muted-foreground tabular sm:inline">bal {S.money(S.invBal(x))}</span>
                  <Input
                    value={p.alloc[x.id] || ""}
                    onChange={(e) => setP({ alloc: { ...p.alloc, [x.id]: e.target.value } })}
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label={"Allocate to " + x.id}
                    className="h-8 text-right tabular"
                  />
                </div>
              );
            })}
            {!open.length && <div className="px-3 py-3.5 text-[12.5px] text-muted-foreground">Select a customer to see open invoices.</div>}
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 bg-muted/60 px-3 py-2 text-[12.5px]">
              <span className="tabular">Allocated {S.money(allocMinor)} of {isNaN(amount) ? "—" : S.money(amount || 0)}</span>
              <span className={cn("tabular", unalloc < 0 ? "text-danger" : "text-muted-foreground")}>
                {unalloc > 0 ? S.money(unalloc) + " will be held on account" : unalloc < 0 ? "Over-allocated by " + S.money(-unalloc) : "Fully allocated"}
              </span>
            </div>
            {errs.alloc && <div className="px-3 py-2 text-xs text-danger">{errs.alloc}</div>}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
