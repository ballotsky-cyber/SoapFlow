"use client";

import * as React from "react";
import { Plus, Settings, X } from "lucide-react";
import { useSoap, type Settings as SettingsT, type TaxRate } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { RadioGroup, Switch, CheckboxField } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Grid, PageHeader } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { toFixedInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ImplementationNotes } from "./implementation-notes";

type STab = "config" | "notes";
const CORE_METHODS = ["Cash", "Bank transfer", "Mobile money"];
const TEXT_KEYS = ["company", "companyAddress", "companyPhone", "companyEmail", "companyTin", "bankDetails", "termsEstimate", "termsOrder", "termsInvoice"] as const;
type TextKey = (typeof TEXT_KEYS)[number];

function SettingRow({ label, children, muted }: { label: React.ReactNode; children: React.ReactNode; muted?: boolean }) {
  return (
    <label className={cn("flex items-center justify-between gap-3 text-[13px]", muted && "text-subtle-foreground")}>
      <span className="min-w-0">{label}</span>
      {children}
    </label>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 text-xs">{children}</span>
);

const fromSettings = (st: SettingsT) => ({
  expiryWarnDays: String(st.expiryWarnDays), blindCountDefault: st.blindCountDefault, maxDiscountPct: String(st.maxDiscountPct), creditCheck: st.creditCheck, paymentMethods: st.paymentMethods.slice(),
  invoiceBasis: st.invoiceBasis, autoInvoiceOnDispatch: st.autoInvoiceOnDispatch, allowBackorders: st.allowBackorders, estimateValidityDays: String(st.estimateValidityDays), defaultTax: st.defaultTax,
  ...(Object.fromEntries(TEXT_KEYS.map((k) => [k, st[k] || ""])) as Record<TextKey, string>),
});

export function SettingsView() {
  const S = useSoap();
  const s = S.s;
  const [sTab, setSTab] = React.useState<STab>(() => (s.route.tab === "notes" ? "notes" : "config"));
  const [cfg, setCfg] = React.useState(() => fromSettings(s.settings));
  const [newMethod, setNewMethod] = React.useState("");
  const [taxEdit, setTaxEdit] = React.useState<TaxRate | null | undefined>(undefined);
  const canSet = S.can("set.manage");
  const ro = !canSet;
  const patch = (p: Partial<typeof cfg>) => setCfg((c) => ({ ...c, ...p }));
  const txt = (k: TextKey) => ({ value: cfg[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => patch({ [k]: e.target.value } as Partial<typeof cfg>), disabled: ro });

  const addMethod = () => {
    const m = newMethod.trim();
    if (!m || cfg.paymentMethods.includes(m)) return;
    patch({ paymentMethods: [...cfg.paymentMethods, m] });
    setNewMethod("");
  };

  const save = () => {
    const d = parseInt(cfg.expiryWarnDays, 10);
    const md = parseFloat(cfg.maxDiscountPct);
    const ev = parseInt(cfg.estimateValidityDays, 10);
    if (!(d >= 1 && d <= 365)) return S.toast("error", "Invalid value", "Expiry warning must be 1–365 days.");
    if (!(md >= 0 && md <= 50)) return S.toast("error", "Invalid value", "Max discount must be between 0 and 50%.");
    if (!(ev >= 1 && ev <= 365)) return S.toast("error", "Invalid value", "Estimate validity must be 1–365 days.");
    if (!cfg.company.trim()) return S.toast("error", "Invalid value", "Company name is required — it is printed on every document.");
    if (cfg.companyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.companyEmail.trim())) return S.toast("error", "Invalid value", "Enter a valid company email address.");
    if (!s.taxes.some((t) => t.id === cfg.defaultTax && t.status === "Active")) return S.toast("error", "Invalid value", "Choose an active default tax rate.");
    if (!cfg.paymentMethods.length) return S.toast("error", "Invalid value", "Keep at least one payment method.");
    const texts = Object.fromEntries(TEXT_KEYS.map((k) => [k, cfg[k].trim()])) as Record<TextKey, string>;
    S.result(
      S.settingsSave({
        expiryWarnDays: d, maxDiscountPct: md, blindCountDefault: cfg.blindCountDefault, creditCheck: cfg.creditCheck, paymentMethods: cfg.paymentMethods,
        invoiceBasis: cfg.invoiceBasis, autoInvoiceOnDispatch: cfg.autoInvoiceOnDispatch, allowBackorders: cfg.allowBackorders, estimateValidityDays: ev, defaultTax: cfg.defaultTax, ...texts,
      }),
      "Settings saved",
    );
  };
  const toggleTax = (t: TaxRate) => {
    const r = S.masterSave("taxes", { id: t.id, name: t.name, rate: t.rate, status: t.status === "Inactive" ? "Active" : "Inactive" }, false);
    if (!r.ok && r.errs?.status) S.toast("error", "Action blocked", r.errs.status);
    else S.result(r, "Tax rate " + (t.status === "Inactive" ? "activated" : "deactivated"));
  };

  return (
    <>
      <PageHeader
        icon={Settings}
        title="Settings"
        description={canSet ? "Changes are audited and apply to all users." : "Read-only — only System Administrators can change settings."}
        actions={canSet && sTab === "config" && <Button onClick={save}>Save settings</Button>}
      />
      <Tabs value={sTab} onValueChange={setSTab} items={[{ value: "config", label: "Configuration" }, { value: "notes", label: "Implementation notes" }]} />

      {sTab === "notes" ? (
        <ImplementationNotes />
      ) : (
        <Grid min={420}>
          <Card>
            <CardHeader title="Inventory rules" />
            <CardContent className="flex flex-col gap-3">
              <SettingRow label="Expiry warning period (days)">
                <Input value={cfg.expiryWarnDays} onChange={(e) => patch({ expiryWarnDays: e.target.value.replace(/[^0-9]/g, "") })} disabled={ro} inputMode="numeric" className="h-8 w-[90px] text-right tabular" />
              </SettingRow>
              <SettingRow label="Blind counting by default">
                <Switch checked={cfg.blindCountDefault} onCheckedChange={(c) => patch({ blindCountDefault: c })} disabled={ro} />
              </SettingRow>
              <div className="flex flex-col gap-1">
                <SettingRow label="Allow negative sellable stock" muted>
                  <Switch checked={false} disabled />
                </SettingRow>
                <div className="text-[11.5px] text-muted-foreground">Prohibited by policy — the backend rejects any posting that would go negative.</div>
              </div>
              <div className="rounded-lg bg-muted/70 px-2.5 py-2 text-xs text-secondary-foreground">
                Costing method: <b>Moving weighted average</b> per product per warehouse · locked after go-live.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Sales controls" />
            <CardContent className="flex flex-col gap-3">
              <SettingRow label="Max discount without approval (%)">
                <Input value={cfg.maxDiscountPct} onChange={(e) => patch({ maxDiscountPct: e.target.value.replace(/[^0-9.]/g, "") })} disabled={ro} inputMode="decimal" className="h-8 w-[90px] text-right tabular" />
              </SettingRow>
              <SettingRow label="Require approval when credit limit is exceeded">
                <Switch checked={cfg.creditCheck} onCheckedChange={(c) => patch({ creditCheck: c })} disabled={ro} />
              </SettingRow>
              <div className="mt-1 text-[13px] font-semibold">Payment methods</div>
              <div className="flex flex-wrap gap-1.5">
                {cfg.paymentMethods.map((m) => (
                  <Chip key={m}>
                    <span className={cn(!(canSet && !CORE_METHODS.includes(m)) && "pr-1.5")}>{m}</span>
                    {canSet && !CORE_METHODS.includes(m) && (
                      <button type="button" aria-label="Remove" onClick={() => patch({ paymentMethods: cfg.paymentMethods.filter((x) => x !== m) })} className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
                        <X className="size-3.5" />
                      </button>
                    )}
                  </Chip>
                ))}
              </div>
              {canSet && (
                <div className="flex gap-1.5">
                  <Input value={newMethod} onChange={(e) => setNewMethod(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMethod()} placeholder="Add method, e.g. POS card" className="h-8 flex-1" />
                  <Button variant="outline" size="sm" onClick={addMethod}><Plus />Add</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Invoicing & orders" />
            <CardContent className="flex flex-col gap-3">
              <div className="text-[13px] font-semibold">Invoicing basis for sales orders</div>
              <RadioGroup
                value={cfg.invoiceBasis}
                onValueChange={(v) => patch({ invoiceBasis: v as SettingsT["invoiceBasis"] })}
                disabled={ro}
                options={[
                  { value: "ordered", label: "Ordered quantity", description: "Confirmed orders can be invoiced before delivery (pro-forma or advance billing)." },
                  { value: "delivered", label: "Delivered quantity", description: "Only quantities already dispatched can be invoiced." },
                ]}
                className="grid grid-cols-1 sm:grid-cols-2"
              />
              <SettingRow label="Raise an invoice automatically when goods are dispatched">
                <Switch checked={cfg.autoInvoiceOnDispatch} onCheckedChange={(c) => patch({ autoInvoiceOnDispatch: c })} disabled={ro} />
              </SettingRow>
              <div className="-mt-2 text-[11.5px] text-muted-foreground">Only uninvoiced quantities are billed, so this never double-invoices. Cash collections are always invoiced at handover.</div>
              <SettingRow label="Allow backorders when confirming orders">
                <Switch checked={cfg.allowBackorders} onCheckedChange={(c) => patch({ allowBackorders: c })} disabled={ro} />
              </SettingRow>
              <div className="-mt-2 text-[11.5px] text-muted-foreground">Off: orders cannot be confirmed beyond available stock. On: available stock is reserved and the rest is backordered.</div>
              <SettingRow label="Estimate validity (days)">
                <Input value={cfg.estimateValidityDays} onChange={(e) => patch({ estimateValidityDays: e.target.value.replace(/[^0-9]/g, "") })} disabled={ro} inputMode="numeric" className="h-8 w-[90px] text-right tabular" />
              </SettingRow>
              <SettingRow label="Default tax rate for new products">
                <Select value={cfg.defaultTax} onValueChange={(v) => patch({ defaultTax: v })} disabled={ro} options={s.taxes.filter((t) => t.status === "Active").map((t) => ({ value: t.id, label: t.name }))} className="w-44" />
              </SettingRow>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Tax rates" description="Documents keep the rate in force when they were created" actions={canSet && <Button size="sm" variant="outline" onClick={() => setTaxEdit(null)}><Plus />Add rate</Button>} />
            {s.taxes.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-[12.5px] last:border-0">
                <span className="min-w-0">
                  <span className="font-mono text-[11.5px] text-primary">{t.id}</span> · <b className="font-semibold">{t.name}</b> · <span className="tabular">{t.rate / 100}%</span>
                  {s.settings.defaultTax === t.id && <span className="ml-1.5 text-[11px] text-muted-foreground">(default)</span>}
                  <span className="ml-1.5 text-[11px] text-muted-foreground">· {s.products.filter((p) => p.tax === t.id).length} products</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <StatusBadge status={t.status} />
                  {canSet && <Button size="xs" variant="outline" onClick={() => setTaxEdit(t)}>Edit</Button>}
                  {canSet && <Button size="xs" variant="outline" onClick={() => toggleTax(t)}>{t.status === "Inactive" ? "Activate" : "Deactivate"}</Button>}
                </span>
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader title="Company profile for documents" description="Printed on estimates, orders, invoices, receipts and credit notes" />
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Company name" required className="sm:col-span-2"><Input {...txt("company")} /></Field>
              <Field label="Address" className="sm:col-span-2"><Input {...txt("companyAddress")} /></Field>
              <Field label="Telephone"><Input {...txt("companyPhone")} /></Field>
              <Field label="Email"><Input {...txt("companyEmail")} inputMode="email" /></Field>
              <Field label="Tax identification number"><Input {...txt("companyTin")} /></Field>
              <Field label="Bank / payment details" hint="Shown on invoices" className="sm:col-span-2"><Input {...txt("bankDetails")} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Document terms & conditions" />
            <CardContent className="flex flex-col gap-3">
              <Field label="Estimates"><Textarea {...txt("termsEstimate")} className="min-h-16" /></Field>
              <Field label="Sales orders"><Textarea {...txt("termsOrder")} className="min-h-16" /></Field>
              <Field label="Invoices"><Textarea {...txt("termsInvoice")} className="min-h-16" /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Warehouses & storage locations" />
            <CardContent className="flex flex-col py-2">
              {s.warehouses.map((w) => (
                <div key={w.id} className="flex flex-col gap-0.5 border-b py-2 text-[12.5px] last:border-0">
                  <span>
                    <b className="font-semibold">{w.name}</b> <span className="text-muted-foreground">· {w.id} · manager {S.uname(w.manager)}</span>
                  </span>
                  <span className="text-muted-foreground">{w.locations.join(" · ")}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Expense categories" />
            <CardContent className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {s.settings.expenseCategories.map((c) => <Chip key={c}><span className="pr-1.5">{c}</span></Chip>)}
              </div>
              <div className="text-xs text-muted-foreground">Currency: GHS (minor unit: pesewa)</div>
            </CardContent>
          </Card>
        </Grid>
      )}
      {taxEdit !== undefined && <TaxDialog tax={taxEdit} onClose={() => setTaxEdit(undefined)} />}
    </>
  );
}

/** Add / edit a tax rate (rate entered as a percentage, stored in basis points). */
function TaxDialog({ tax, onClose }: { tax: TaxRate | null; onClose: () => void }) {
  const S = useSoap();
  const isNew = !tax;
  const [f, setF] = React.useState(() => ({ id: tax?.id ?? "", name: tax?.name ?? "", rate: tax ? String(tax.rate / 100) : "", active: tax ? tax.status !== "Inactive" : true }));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const save = () => {
    const valid = /^\d+(\.\d{1,2})?$/.test(f.rate.trim());
    const r = S.masterSave("taxes", { id: f.id.trim().toUpperCase(), name: f.name, rate: valid ? toFixedInt(f.rate.trim(), 2) : NaN, status: f.active ? "Active" : "Inactive" }, isNew);
    if (!r.ok) {
      setErrs(r.errs || {});
      setErr(r.error);
      return;
    }
    onClose();
    S.result(r, isNew ? "Tax rate created" : "Tax rate updated");
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader title={isNew ? "New tax rate" : "Edit tax rate"} description="Changing a rate only affects documents created afterwards" />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <Field label="Code" required error={errs.id} hint={!isNew ? "Codes cannot change." : "e.g. VAT15"}>
            <Input value={f.id} onChange={(e) => setF((x) => ({ ...x, id: e.target.value.toUpperCase() }))} disabled={!isNew} aria-invalid={!!errs.id || undefined} />
          </Field>
          <Field label="Name" required error={errs.name}>
            <Input value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder="e.g. VAT 15%" aria-invalid={!!errs.name || undefined} />
          </Field>
          <Field label="Rate (%)" required error={errs.rate}>
            <Input value={f.rate} onChange={(e) => setF((x) => ({ ...x, rate: e.target.value.replace(/[^0-9.]/g, "") }))} inputMode="decimal" className="text-right tabular" aria-invalid={!!errs.rate || undefined} />
          </Field>
          {!isNew && <CheckboxField label="Active" checked={f.active} onCheckedChange={(c) => setF((x) => ({ ...x, active: c === true }))} />}
          {errs.status && <Alert tone="danger">{errs.status}</Alert>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save tax rate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
