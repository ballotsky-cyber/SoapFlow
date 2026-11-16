"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useSoap, type Customer } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { toMinor } from "@/features/finance/money";

export const CUSTOMER_TYPES = ["Distributor", "Business", "Repeat buyer", "Walk-in"];

type Form = Record<"name" | "type" | "contact" | "phone" | "email" | "address" | "delivAddr" | "city" | "tin" | "terms" | "limit", string> & { active: boolean; sameAddr: boolean };

const fromCustomer = (c: Customer | null): Form =>
  c
    ? { name: c.name, type: c.type, contact: c.contact === "—" ? "" : c.contact, phone: c.phone, email: c.email || "", address: c.address, delivAddr: c.delivAddr || "", city: c.city, tin: c.tin || "", terms: String(c.terms), limit: (c.limit / 100).toFixed(2), active: c.status !== "Inactive", sameAddr: !c.delivAddr || c.delivAddr === c.address }
    : { name: "", type: "Business", contact: "", phone: "", email: "", address: "", delivAddr: "", city: "", tin: "", terms: "0", limit: "0", active: true, sameAddr: true };

/** Create or edit a customer (POST/PUT /api/customers). Calls onSaved with the customer id. */
export function CustomerFormDialog({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const S = useSoap();
  const [f, setF] = React.useState<Form>(() => fromCustomer(customer));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const set = (k: keyof Form) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const inp = (k: keyof Form) => ({ value: f[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k)(e.target.value), "aria-invalid": !!errs[k] || undefined });

  const save = () => {
    const limit = toMinor(f.limit);
    if (isNaN(limit)) return setErrs({ limit: "Enter an amount, e.g. 25000.00" });
    const r = S.customerSave({
      id: customer?.id, name: f.name, type: f.type, contact: f.contact, phone: f.phone, email: f.email.trim(), address: f.address, delivAddr: f.sameAddr ? f.address : f.delivAddr,
      city: f.city, tin: f.tin, terms: parseInt(f.terms, 10) || 0, limit, status: f.active ? "Active" : "Inactive",
    });
    if (!r.ok) {
      setErrs(r.errs || {});
      setErr(r.error);
      return;
    }
    S.result(r, customer ? "Customer updated" : "Customer created");
    onSaved?.(r.ref as string);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader title={customer ? "Edit customer · " + customer.id : "New customer"} description="Customers are shared by estimates, orders and invoices · fields marked * are required" />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer name" required error={errs.name} className="sm:col-span-2">
              <Input {...inp("name")} placeholder="Trading name" autoFocus />
            </Field>
            <Field label="Type" required error={errs.type}>
              <Select value={f.type} onValueChange={set("type")} options={CUSTOMER_TYPES} />
            </Field>
            <Field label="Contact person">
              <Input {...inp("contact")} />
            </Field>
            <Field label="Telephone">
              <Input {...inp("phone")} inputMode="tel" placeholder="+233 …" />
            </Field>
            <Field label="Email" error={errs.email} hint="Used when sending documents">
              <Input {...inp("email")} inputMode="email" />
            </Field>
            <Field label="Billing address" className="sm:col-span-2">
              <Textarea {...inp("address")} className="min-h-14" />
            </Field>
            <Field label="City / town">
              <Input {...inp("city")} />
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <CheckboxField label="Deliver to the billing address" checked={f.sameAddr} onCheckedChange={(c) => setF((x) => ({ ...x, sameAddr: c === true }))} />
              {!f.sameAddr && (
                <Field label="Delivery address">
                  <Textarea {...inp("delivAddr")} className="min-h-14" />
                </Field>
              )}
            </div>
            <Field label="Tax identification number (TIN)" error={errs.tin}>
              <Input {...inp("tin")} className="uppercase" />
            </Field>
            <Field label="Payment terms (days)" error={errs.terms} hint="0 = cash customer">
              <Input {...inp("terms")} inputMode="numeric" onChange={(e) => set("terms")(e.target.value.replace(/[^0-9]/g, ""))} className="text-right tabular" />
            </Field>
            <Field label="Credit limit (GHS)" error={errs.limit}>
              <Input {...inp("limit")} inputMode="decimal" className="text-right tabular" />
            </Field>
          </div>
          {customer && <CheckboxField label="Active (inactive customers cannot receive new documents)" checked={f.active} onCheckedChange={(c) => setF((x) => ({ ...x, active: c === true }))} />}
          {errs.status && <Alert tone="danger">{errs.status}</Alert>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{customer ? "Save customer" : "Create customer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Searchable customer selector with an inline "New customer" action (for users who may create customers). */
export function CustomerPicker({ value, onChange, disabled, invalid, includeInactive }: { value: string; onChange: (id: string) => void; disabled?: boolean; invalid?: boolean; includeInactive?: boolean }) {
  const S = useSoap();
  const [creating, setCreating] = React.useState(false);
  const opts = S.s.customers
    .filter((c) => includeInactive || c.status !== "Inactive" || c.id === value)
    .map((c) => ({ value: c.id, label: c.name, hint: c.id + " · " + c.type + (c.city ? " · " + c.city : "") + (c.terms ? " · Net " + c.terms : " · cash") }));
  return (
    <>
      <Combobox
        value={value}
        onValueChange={onChange}
        options={opts}
        placeholder="Select customer…"
        searchPlaceholder="Search name, code or city"
        disabled={disabled}
        invalid={invalid}
        aria-label="Customer"
        footer={
          S.can("cus.edit")
            ? (close) => (
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { close(); setCreating(true); }}>
                  <Plus />New customer
                </Button>
              )
            : undefined
        }
      />
      {creating && <CustomerFormDialog customer={null} onClose={() => setCreating(false)} onSaved={onChange} />}
    </>
  );
}
