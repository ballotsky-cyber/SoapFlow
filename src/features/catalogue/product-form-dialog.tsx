"use client";

import * as React from "react";
import { useSoap, type Product } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { toFixedInt } from "@/lib/format";

type FormState = Record<"sku" | "name" | "brand" | "category" | "variant" | "size" | "cartonPacks" | "packBars" | "cost" | "price" | "min" | "barcode" | "status", string> & { batch: boolean };

const fromProduct = (p: Product | null): FormState =>
  p
    ? { sku: p.sku, name: p.name, brand: p.brand, category: p.category, variant: p.variant, size: p.size, cartonPacks: String(p.cartonPacks), packBars: String(p.packBars), cost: (p.cost4 / 10000).toFixed(4), price: (p.price / 100).toFixed(2), min: String(p.min), barcode: p.barcode || "", batch: !!p.batch, status: p.status }
    : { sku: "", name: "", brand: "", category: "", variant: "", size: "", cartonPacks: "", packBars: "", cost: "", price: "", min: "0", barcode: "", batch: false, status: "Active" };

/** Create / edit product. `product` null = new. */
export function ProductFormDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const S = useSoap();
  const isNew = !product;
  const [f, setF] = React.useState<FormState>(() => fromProduct(product));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const set = (k: keyof FormState) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const inp = (k: keyof FormState) => ({ value: f[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k)(e.target.value), "aria-invalid": !!errs[k === "cost" ? "cost4" : k] || undefined });
  const e = (k: string) => errs[k];

  const cp = parseInt(f.cartonPacks, 10) || 0;
  const pb = parseInt(f.packBars, 10) || 0;
  const pr = toFixedInt(f.price, 2);
  const c4 = toFixedInt(f.cost, 4);

  const save = () => {
    const data = { sku: f.sku.trim().toUpperCase(), name: f.name.trim(), brand: f.brand, category: f.category, variant: f.variant.trim(), size: f.size.trim(), cartonPacks: cp, packBars: pb, cost4: c4, price: pr, min: parseInt(f.min, 10) || 0, barcode: f.barcode.trim(), batch: f.batch, status: f.status };
    const r = S.productSave(data, isNew);
    if (!r.ok) {
      setErrs(r.errs || {});
      setErr(r.error);
      return;
    }
    onClose();
    S.result(r, isNew ? "Product created" : "Product updated");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader title={isNew ? "New product" : "Edit product"} description="POST/PUT /api/products · fields marked * are required" />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="SKU" required error={e("sku")} hint={!isNew ? "SKU is immutable once created." : undefined}>
              <Input {...inp("sku")} disabled={!isNew} placeholder="e.g. VEL-BTH-150" />
            </Field>
            <Field label="Product name" required error={e("name")}>
              <Input {...inp("name")} placeholder="Brand, type and size" />
            </Field>
            <Field label="Brand" required error={e("brand")}>
              <Select value={f.brand} onValueChange={set("brand")} placeholder="Select brand" invalid={!!e("brand")} options={S.s.brands.map((b) => b.id)} />
            </Field>
            <Field label="Category" required error={e("category")}>
              <Select value={f.category} onValueChange={set("category")} placeholder="Select category" invalid={!!e("category")} options={["Bathing", "Laundry", "Multipurpose", "Antibacterial", "Herbal"]} />
            </Field>
            <Field label="Variant / type" error={e("variant")}>
              <Input {...inp("variant")} placeholder="e.g. Lavender" />
            </Field>
            <Field label="Size / net weight" error={e("size")}>
              <Input {...inp("size")} placeholder="e.g. 150 g" />
            </Field>
            <Field label="Packs per carton" required error={e("cartonPacks")}>
              <Input {...inp("cartonPacks")} inputMode="numeric" placeholder="20" />
            </Field>
            <Field label="Bars per pack" required error={e("packBars")}>
              <Input {...inp("packBars")} inputMode="numeric" placeholder="12" />
            </Field>
            <Field label="Default purchase cost / bar (GHS)" required error={e("cost4")} hint="Up to 4 decimals. Actual cost comes from receipts.">
              <Input {...inp("cost")} inputMode="decimal" placeholder="2.1000" />
            </Field>
            <Field label="Selling price / bar (GHS)" required error={e("price")}>
              <Input {...inp("price")} inputMode="decimal" placeholder="2.95" />
            </Field>
            <Field label="Minimum stock per warehouse (bars)" error={e("min")} hint={f.min && cp && pb ? "≈ " + (Number(f.min) / (cp * pb || 1)).toFixed(1) + " cartons" : undefined}>
              <Input {...inp("min")} inputMode="numeric" />
            </Field>
            <Field label="Barcode (optional)" error={e("barcode")}>
              <Input {...inp("barcode")} inputMode="numeric" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-primary/20 bg-primary-soft/60 px-3.5 py-2.5 text-[12.5px] text-primary-soft-foreground">
            <span>Conversion preview: <b>1 carton = {cp || "—"} packs = {cp * pb || "—"} bars</b></span>
            <span>Carton price: <b>{pr && cp * pb ? S.money(pr * cp * pb) : "—"}</b></span>
            <span>Margin per bar: <b>{pr && c4 ? S.cost(pr * 100 - c4) : "—"}</b></span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <CheckboxField label="Require batch number and expiry on receipt" checked={f.batch} onCheckedChange={(c) => setF((x) => ({ ...x, batch: c === true }))} />
            <CheckboxField label="Discontinued (no new orders)" checked={f.status === "Discontinued"} onCheckedChange={(c) => setF((x) => ({ ...x, status: c === true ? "Discontinued" : "Active" }))} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
