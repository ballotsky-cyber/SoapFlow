"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { DetailHeader } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { Totals } from "./parts";

interface FormLine { sku: string; n: string; u: string; d: string }
interface FormState { customer: string; walkin: string; wh: string; method: string; terms: string; address: string; lines: FormLine[] }

const UNITS = ["ctn", "pk", "bar"];
const WALKIN = "CUS-006";
const blankLine = (): FormLine => ({ sku: "", n: "", u: "ctn", d: "" });
const LINE_GRID = "grid grid-cols-6 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_74px_70px_70px_100px_36px] sm:gap-1.5";

/** New sales order (POST /api/sales-orders) — full-page form like the prototype. */
export function OrderForm({ onClose }: { onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [f, setFState] = React.useState<FormState>(() => ({ customer: "", walkin: "", wh: S.scope()[0], method: "Collection", terms: "Cash", address: "", lines: [blankLine()] }));
  const [err, setErr] = React.useState("");
  const setF = (patch: Partial<FormState>) => {
    setFState((x) => ({ ...x, ...patch }));
    setErr("");
  };
  const updLine = (i: number, k: keyof FormLine, v: string) =>
    setF({ lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: k === "n" ? v.replace(/[^0-9]/g, "") : v } : l)) });

  const fin = S.canView("fin.view") || S.canView("so.approve");
  const cust = f.customer ? S.cust(f.customer) : null;
  const maxDisc = s.settings.maxDiscountPct;
  const vals = f.lines.map((l) => {
    const q = l.sku ? S.toBars(l.sku, l.n, l.u) : 0;
    const pr = l.sku ? S.prod(l.sku).price : 0;
    const d = parseFloat(l.d) || 0;
    const g = q * pr;
    return { q, g, net: g - Math.round((g * d) / 100), d };
  });
  const gross = vals.reduce((a, v) => a + v.g, 0);
  const net = vals.reduce((a, v) => a + v.net, 0);
  const noCredit = !cust || cust.limit === 0;
  const bal = cust ? S.custBalance(cust.id) : 0;
  const creditOk = !!cust && bal + net <= cust.limit;

  const custOpts = s.customers.map((c) => ({ value: c.id, label: c.name + " · " + c.type }));
  const whOpts = S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }));
  const prodOpts = s.products.filter((p) => p.status === "Active").map((p) => ({ value: p.sku, label: p.sku + " — " + p.name }));

  const go = (confirm: boolean) => {
    const lines = f.lines.map((l, i) => ({ sku: l.sku, qty: vals[i].q, discPct: vals[i].d })).filter((l) => l.sku);
    const r = S.soSave({ customer: f.customer, walkin: f.walkin.trim(), wh: f.wh, method: f.method, terms: f.terms, address: f.address.trim(), lines }, confirm);
    if (!r.ok) return setErr(r.error);
    onClose();
    S.result(r, confirm ? "Order created" : "Draft saved");
    S.nav("sales-orders", { id: r.id });
  };
  const onTerms = (v: string) => {
    if (v === "Credit" && noCredit) return S.toast("warn", "Credit not available", (cust ? cust.name : "This customer") + " has no credit facility.");
    setF({ terms: v });
  };

  return (
    <>
      <DetailHeader backLabel="Cancel" onBack={onClose} title="New sales order" meta="POST /api/sales-orders · availability is re-checked atomically on confirmation" />
      {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer" required>
                <Select
                  value={f.customer}
                  onValueChange={(v) => { const c = S.cust(v); setF({ customer: v, terms: c.limit ? "Credit" : "Cash", address: c.address || "" }); }}
                  placeholder="Select customer…"
                  options={custOpts}
                />
              </Field>
              {f.customer === WALKIN && (
                <Field label="Walk-in name & phone" required>
                  <Input value={f.walkin} onChange={(e) => setF({ walkin: e.target.value })} placeholder="Name · phone" />
                </Field>
              )}
              <Field label="Fulfilment warehouse" required>
                <Select value={f.wh} onValueChange={(v) => setF({ wh: v })} options={whOpts} />
              </Field>
              <Field label="Fulfilment">
                <SegmentedControl value={f.method} onValueChange={(v) => setF({ method: v })} items={[{ value: "Collection", label: "Warehouse collection" }, { value: "Delivery", label: "Delivery" }]} className="w-full [&>*]:flex-1 [&>*]:justify-center" />
              </Field>
              <Field label="Payment terms">
                <SegmentedControl value={f.terms} onValueChange={onTerms} items={[{ value: "Cash", label: "Cash" }, { value: "Credit", label: <span className={noCredit ? "text-subtle-foreground" : undefined}>Credit</span> }]} className="w-full [&>*]:flex-1 [&>*]:justify-center" />
              </Field>
              {f.method === "Delivery" && (
                <Field label="Delivery address" required className="sm:col-span-2 lg:col-span-3">
                  <Input value={f.address} onChange={(e) => setF({ address: e.target.value })} />
                </Field>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Order lines" />
            <CardContent className="flex flex-col gap-2.5">
              {f.lines.map((l, i) => {
                const av = l.sku ? S.avail(f.wh, l.sku) : 0;
                const over = vals[i].q > av;
                return (
                  <div key={i} className={`${LINE_GRID} rounded-lg border p-2 sm:rounded-none sm:border-0 sm:p-0`}>
                    <div className="col-span-6 flex min-w-0 flex-col gap-1 sm:col-span-1">
                      <Select size="sm" value={l.sku} onValueChange={(v) => updLine(i, "sku", v)} placeholder="Select product…" options={prodOpts} className="min-w-0" />
                      {l.sku && (
                        <span className={cn("text-[11px]", over ? "text-danger" : "text-subtle-foreground")}>
                          Available: {S.qty(l.sku, av)} · {S.money(S.prod(l.sku).price)}/bar{over ? " — exceeds available" : ""}
                        </span>
                      )}
                    </div>
                    <Input value={l.n} onChange={(e) => updLine(i, "n", e.target.value)} inputMode="numeric" placeholder="Qty" aria-label="Quantity" className="col-span-2 h-8 text-right sm:col-span-1" />
                    <Select size="sm" value={l.u} onValueChange={(v) => updLine(i, "u", v)} options={UNITS} className="col-span-2 sm:col-span-1" />
                    <Input value={l.d} onChange={(e) => updLine(i, "d", e.target.value)} inputMode="decimal" placeholder="Disc %" title="Discount %" aria-label="Discount %" className={cn("col-span-2 h-8 text-right sm:col-span-1", vals[i].d > maxDisc && "border-warning")} />
                    <span className="col-span-5 pt-1.5 text-[12.5px] tabular sm:col-span-1 sm:text-right">
                      <span className="text-muted-foreground sm:hidden">Line total: </span>
                      {vals[i].net ? S.money(vals[i].net) : "—"}
                    </span>
                    <Button variant="outline" size="icon-sm" aria-label="Remove" className="col-span-1 justify-self-end" onClick={() => setF({ lines: f.lines.filter((_, j) => j !== i) })}><Trash2 /></Button>
                  </div>
                );
              })}
              <Button variant="soft" size="sm" className="self-start" onClick={() => setF({ lines: [...f.lines, blankLine()] })}><Plus />Add product</Button>
              <div className="text-[11.5px] text-subtle-foreground">Discounts above {maxDisc}% require approval by an authorised manager.</div>
            </CardContent>
          </Card>
        </div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Review" />
          <CardContent className="flex flex-col gap-3">
            <Totals
              rows={[
                { k: "Lines", v: String(vals.filter((v) => v.q).length) },
                { k: "Gross", v: S.money(gross) },
                { k: "Discounts", v: S.money(net - gross) },
                { k: "Order total", v: S.money(net), strong: true },
                { k: "Payment", v: f.terms === "Cash" ? "Cash on " + (f.method === "Collection" ? "collection" : "delivery") : "Credit · Net " + (cust ? cust.terms : "—") },
              ]}
            />
            {f.terms === "Credit" && cust && fin && (
              <Alert tone={creditOk ? "success" : "warning"}>
                Credit check: outstanding {S.money(bal)} + this order {S.money(net)} vs limit {S.money(cust.limit)}. {creditOk ? "Within limit." : "Exceeds limit — order will go to Pending Approval."}
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={() => go(true)}>Confirm order &amp; reserve stock</Button>
              <Button variant="outline" onClick={() => go(false)}>Save as draft</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
