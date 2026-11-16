"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSoap, type Charge, type DocLine, type DocTotals, type LineInput, type SoapStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Totals } from "@/features/procurement/parts";
import { toMinor } from "@/features/finance/money";
import { cn } from "@/lib/utils";

/* Editable product lines shared by estimates, sales orders and direct invoices.
   Rows keep raw strings while typing; the engine re-validates everything on save. Prices are GHS per selected unit. */

export interface LineRow { key: number; sku: string; unit: string; uqty: string; price: string; disc: string; tax: string; desc: string }
export interface ChargeRow { key: number; label: string; amount: string }

let seq = 0;
export const blankRow = (): LineRow => ({ key: ++seq, sku: "", unit: "", uqty: "", price: "", disc: "", tax: "", desc: "" });
export const blankCharge = (): ChargeRow => ({ key: ++seq, label: "", amount: "" });
/** Trim a quantity for display/editing: 2.5, 12, 0.125. */
export const fmtNum = (n: number) => String(Math.round(n * 1000) / 1000);
export const rowFromLine = (l: DocLine): LineRow => ({ key: ++seq, sku: l.sku, unit: l.unit, uqty: fmtNum(l.uqty), price: (l.uprice / 100).toFixed(2), disc: l.discPct ? String(l.discPct) : "", tax: l.taxCode, desc: l.desc || "" });
export const chargeRow = (c: Charge): ChargeRow => ({ key: ++seq, label: c.label, amount: (c.amount / 100).toFixed(2) });

export const rowsToInput = (rows: LineRow[]): LineInput[] =>
  rows.filter((r) => r.sku).map((r) => ({ sku: r.sku, unit: r.unit, uqty: Number(r.uqty), uprice: toMinor(r.price), discPct: parseFloat(r.disc) || 0, tax: r.tax, desc: r.desc }));
export const chargesToInput = (rows: ChargeRow[]): Charge[] => rows.filter((c) => c.label.trim() || c.amount.trim()).map((c) => ({ label: c.label, amount: toMinor(c.amount) }));

/** Build a DocLine from a row for live totals (invalid input counts as zero). */
export function previewLine(S: SoapStore, r: LineRow): DocLine | null {
  if (!r.sku) return null;
  const factor = S.unitFactor(r.sku, r.unit) || 1;
  const uqty = Number(r.uqty) || 0;
  const uprice = toMinor(r.price);
  return { sku: r.sku, name: S.prod(r.sku).name, desc: r.desc, unit: r.unit, factor, uqty, qty: Math.round(uqty * factor), uprice: isNaN(uprice) ? 0 : uprice, discPct: parseFloat(r.disc) || 0, taxCode: r.tax, taxRate: S.taxOf(r.tax)?.rate ?? 0 };
}
export function rowsTotals(S: SoapStore, rows: LineRow[], charges: ChargeRow[]): DocTotals {
  const lines = rows.map((r) => previewLine(S, r)).filter((l): l is DocLine => !!l);
  return S.docTotals({ lines, charges: charges.map((c) => ({ label: c.label, amount: toMinor(c.amount) || 0 })) });
}

/** Subtotal → discounts → tax → charges → total block. */
export function TotalsBlock({ t, totalLabel = "Total" }: { t: DocTotals; totalLabel?: string }) {
  const S = useSoap();
  return (
    <Totals
      rows={[
        { k: "Subtotal", v: S.money(t.sub) },
        ...(t.disc ? [{ k: "Discounts", v: S.money(-t.disc) }] : []),
        { k: "Tax", v: S.money(t.tax) },
        ...(t.chargesTotal ? [{ k: "Additional charges", v: S.money(t.chargesTotal) }] : []),
        { k: totalLabel, v: S.money(t.total), strong: true },
      ]}
    />
  );
}

const GRID = "grid grid-cols-6 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_72px_92px_100px_62px_104px_104px_32px] sm:gap-1.5";

/** Product line editor. `wh` shows availability at that warehouse; `locked` makes the lines read-only. */
export function LineEditor({ rows, onChange, wh, locked }: { rows: LineRow[]; onChange: (rows: LineRow[]) => void; wh?: string; locked?: boolean }) {
  const S = useSoap();
  const s = S.s;
  const prodOpts = s.products
    .filter((p) => p.status === "Active" || rows.some((r) => r.sku === p.sku))
    .map((p) => ({ value: p.sku, label: p.name, hint: p.sku + " · " + p.brand + " · " + S.money(p.price) + "/" + S.unitDef(p.baseUnit).name.toLowerCase(), disabled: p.status !== "Active" }));
  const taxOpts = s.taxes.filter((t) => t.status === "Active" || rows.some((r) => r.tax === t.id)).map((t) => ({ value: t.id, label: t.name }));
  const upd = (key: number, patch: Partial<LineRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const pickProduct = (r: LineRow, sku: string) => {
    if (rows.some((x) => x.sku === sku && x.key !== r.key)) return S.toast("warn", "Already on this document", "Change the quantity on the existing line instead.");
    const p = S.prod(sku);
    const units = S.unitsFor(sku);
    const unit = units.find((u) => u.unit === "ctn")?.unit ?? units[0].unit;
    upd(r.key, { sku, unit, price: ((p.price * S.unitFactor(sku, unit)) / 100).toFixed(2), tax: p.tax || s.settings.defaultTax, uqty: r.uqty || "1" });
  };
  const pickUnit = (r: LineRow, unit: string) => {
    const from = S.unitFactor(r.sku, r.unit) || 1;
    const to = S.unitFactor(r.sku, unit) || 1;
    const cur = toMinor(r.price);
    upd(r.key, { unit, price: isNaN(cur) ? r.price : (Math.round((cur / from) * to) / 100).toFixed(2) });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className={cn(GRID, "hidden px-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid")}>
        <span>Product</span>
        <span className="text-right">Qty</span>
        <span>Unit</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Disc %</span>
        <span>Tax</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      {rows.map((r) => {
        const l = previewLine(S, r);
        const amt = l ? S.lineCalc(l) : null;
        const p = r.sku ? S.prod(r.sku) : null;
        const av = r.sku && wh ? S.avail(wh, r.sku) : null;
        const over = av != null && l != null && l.qty > av;
        const list = p ? l!.qty * p.price : 0;
        const below = !!(p && l && l.qty && amt && list && amt.gross < list);
        return (
          <div key={r.key} className={cn(GRID, "rounded-lg border p-2 sm:rounded-none sm:border-0 sm:p-0")}>
            <div className="col-span-6 flex min-w-0 flex-col gap-1 sm:col-span-1">
              <Combobox size="sm" value={r.sku} onValueChange={(v) => pickProduct(r, v)} options={prodOpts} placeholder="Select product…" searchPlaceholder="Search name, SKU or brand" disabled={locked} aria-label="Product" />
              {r.sku && (
                <Input value={r.desc} onChange={(e) => upd(r.key, { desc: e.target.value })} disabled={locked} placeholder="Line note (optional)" aria-label="Line note" className="h-7 text-xs" />
              )}
              {r.sku && (
                <span className={cn("text-[11px]", over ? "text-warning" : "text-subtle-foreground")}>
                  {av != null && <>Available at {S.wh(wh as string).name}: {S.qty(r.sku, av)}{over ? " — short" : ""} · </>}
                  {l && l.qty ? S.qty(r.sku, l.qty) : ""}
                  {below ? " · below list price" : ""}
                </span>
              )}
            </div>
            <Input value={r.uqty} onChange={(e) => upd(r.key, { uqty: e.target.value.replace(/[^0-9.]/g, "") })} disabled={locked} inputMode="decimal" placeholder="Qty" aria-label="Quantity" className="col-span-2 h-8 text-right tabular sm:col-span-1" />
            <Select size="sm" value={r.unit} onValueChange={(v) => pickUnit(r, v)} disabled={locked || !r.sku} placeholder="Unit" options={r.sku ? S.unitsFor(r.sku).map((u) => ({ value: u.unit, label: u.factor > 1 ? `${u.label} (${u.factor})` : u.label })) : []} className="col-span-2 sm:col-span-1" aria-label="Unit" />
            <Input value={r.price} onChange={(e) => upd(r.key, { price: e.target.value.replace(/[^0-9.]/g, "") })} disabled={locked} inputMode="decimal" placeholder="0.00" aria-label="Unit price (GHS)" className={cn("col-span-2 h-8 text-right tabular sm:col-span-1", isNaN(toMinor(r.price)) && "border-danger")} />
            <Input value={r.disc} onChange={(e) => upd(r.key, { disc: e.target.value.replace(/[^0-9.]/g, "") })} disabled={locked} inputMode="decimal" placeholder="0" aria-label="Discount %" className={cn("col-span-2 h-8 text-right tabular sm:col-span-1", (parseFloat(r.disc) || 0) > s.settings.maxDiscountPct && "border-warning")} />
            <Select size="sm" value={r.tax} onValueChange={(v) => upd(r.key, { tax: v })} disabled={locked || !r.sku} placeholder="Tax" options={taxOpts} className="col-span-2 sm:col-span-1" aria-label="Tax" />
            <span className="col-span-5 pt-1.5 text-[12.5px] tabular sm:col-span-1 sm:text-right">
              <span className="text-muted-foreground sm:hidden">Amount: </span>
              {amt && amt.total ? S.money(amt.total) : "—"}
              {amt && amt.tax ? <span className="block text-[11px] text-subtle-foreground">incl. tax {S.money(amt.tax)}</span> : null}
            </span>
            {!locked ? (
              <Button variant="outline" size="icon-sm" aria-label="Remove line" className="col-span-1 justify-self-end" onClick={() => onChange(rows.length > 1 ? rows.filter((x) => x.key !== r.key) : [blankRow()])}>
                <Trash2 />
              </Button>
            ) : <span />}
          </div>
        );
      })}
      {!locked && (
        <Button variant="soft" size="sm" className="self-start" onClick={() => onChange([...rows, blankRow()])}>
          <Plus />Add product
        </Button>
      )}
    </div>
  );
}

/** Additional charges (delivery, loading…), entered in GHS. */
export function ChargesEditor({ rows, onChange, locked }: { rows: ChargeRow[]; onChange: (rows: ChargeRow[]) => void; locked?: boolean }) {
  const upd = (key: number, patch: Partial<ChargeRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((c) => (
        <div key={c.key} className="grid grid-cols-[minmax(0,1fr)_120px_32px] gap-1.5">
          <Input value={c.label} onChange={(e) => upd(c.key, { label: e.target.value })} disabled={locked} placeholder="e.g. Delivery to Tamale" aria-label="Charge description" className="h-8" />
          <Input value={c.amount} onChange={(e) => upd(c.key, { amount: e.target.value.replace(/[^0-9.]/g, "") })} disabled={locked} inputMode="decimal" placeholder="0.00" aria-label="Charge amount (GHS)" className="h-8 text-right tabular" />
          {!locked ? <Button variant="outline" size="icon-sm" aria-label="Remove charge" onClick={() => onChange(rows.filter((x) => x.key !== c.key))}><Trash2 /></Button> : <span />}
        </div>
      ))}
      {!locked && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange([...rows, blankCharge()])}>
          <Plus />Add charge
        </Button>
      )}
      {!rows.length && locked && <span className="text-[12.5px] text-muted-foreground">No additional charges.</span>}
    </div>
  );
}
