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
import { toMinor } from "./money";

type ExpForm = Record<"date" | "category" | "wh" | "amount" | "method" | "ref" | "description" | "evidence", string>;

/** Record expense — submitted as Pending Approval for a different approver (maker-checker). */
export function ExpenseDialog({ onClose }: { onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [ex, setEx] = React.useState<ExpForm>(() => ({ date: S.TODAY, category: "", wh: S.scope()[0] ?? "", amount: "", method: "Cash", ref: "", description: "", evidence: "" }));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const set = (k: keyof ExpForm) => (v: string) => {
    setEx((x) => ({ ...x, [k]: v }));
    setErr("");
    setErrs({});
  };

  const save = () => {
    const amt = toMinor(ex.amount);
    const r = S.expenseSave({ date: ex.date, category: ex.category, wh: ex.wh, amount: isNaN(amt) ? 0 : amt, method: ex.method, ref: ex.ref.trim(), description: ex.description.trim(), evidence: ex.evidence });
    if (!r.ok) {
      setErrs(r.errs || {});
      setErr(r.error);
      return;
    }
    onClose();
    S.result(r, "Expense recorded");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title="Record expense" description="Submitted for approval by a different authorised user" />
        <DialogBody>
          {err && <Alert tone="danger">{err}</Alert>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date" required error={errs.date}>
              <DatePicker value={ex.date} onChange={set("date")} invalid={!!errs.date} />
            </Field>
            <Field label="Category" required error={errs.category}>
              <Select value={ex.category} onValueChange={set("category")} placeholder="Select…" invalid={!!errs.category} options={s.settings.expenseCategories} />
            </Field>
            <Field label="Warehouse" required error={errs.wh}>
              <Select value={ex.wh} onValueChange={set("wh")} invalid={!!errs.wh} options={S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }))} />
            </Field>
            <Field label="Amount (GHS)" required error={errs.amount}>
              <Input value={ex.amount} onChange={(e) => set("amount")(e.target.value)} inputMode="decimal" className="text-right tabular" aria-invalid={!!errs.amount || undefined} />
            </Field>
            <Field label="Payment method" error={errs.method}>
              <Select value={ex.method} onValueChange={set("method")} options={s.settings.paymentMethods} />
            </Field>
            <Field label="Reference" error={errs.ref}>
              <Input value={ex.ref} onChange={(e) => set("ref")(e.target.value)} />
            </Field>
            <Field label="Description" required error={errs.description} className="sm:col-span-2 lg:col-span-3">
              <Input value={ex.description} onChange={(e) => set("description")(e.target.value)} aria-invalid={!!errs.description || undefined} />
            </Field>
            <Field label="Supporting evidence" error={errs.evidence} className="sm:col-span-2 lg:col-span-3">
              <FileInput value={ex.evidence} onChange={set("evidence")} />
            </Field>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
