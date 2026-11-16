"use client";

import * as React from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useSoap, type Product } from "@/lib/store";
import type { ProductInput } from "@/lib/store/commerce";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { toFixedInt } from "@/lib/format";

type FormState = Record<"sku" | "name" | "brand" | "category" | "variant" | "size" | "description" | "cartonPacks" | "packBars" | "cost" | "price" | "min" | "barcode" | "status" | "tax" | "baseUnit" | "image", string> & { batch: boolean; extra: { key: number; unit: string; factor: string }[] };

let rowKey = 0;
const fromProduct = (p: Product | null, defaultTax: string): FormState =>
  p
    ? {
        sku: p.sku, name: p.name, brand: p.brand, category: p.category, variant: p.variant, size: p.size, description: p.description || "", cartonPacks: String(p.cartonPacks), packBars: String(p.packBars),
        cost: (p.cost4 / 10000).toFixed(4), price: (p.price / 100).toFixed(2), min: String(p.min), barcode: p.barcode || "", batch: !!p.batch, status: p.status, tax: p.tax || defaultTax, baseUnit: p.baseUnit || "bar", image: p.image || "",
        extra: (p.extraUnits || []).map((u) => ({ key: ++rowKey, unit: u.unit, factor: String(u.factor) })),
      }
    : { sku: "", name: "", brand: "", category: "", variant: "", size: "", description: "", cartonPacks: "", packBars: "", cost: "", price: "", min: "0", barcode: "", batch: false, status: "Active", tax: defaultTax, baseUnit: "bar", image: "", extra: [] };

/** Read an image file, scale it to fit 320×320 and return a compact data URL (stored with the product). */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file (JPG, PNG or WebP)."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("The image could not be decoded."));
      img.onload = () => {
        const k = Math.min(1, 320 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * k));
        canvas.height = Math.max(1, Math.round(img.height * k));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Image processing is not available in this browser."));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const webp = canvas.toDataURL("image/webp", 0.82);
        resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Create / edit product. `product` null = new. */
export function ProductFormDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const isNew = !product;
  const [f, setF] = React.useState<FormState>(() => fromProduct(product, s.settings.defaultTax));
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = (k: keyof FormState) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const errKey = (k: keyof FormState) => (k === "cost" ? "cost4" : k);
  const inp = (k: keyof FormState) => ({ value: f[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k)(e.target.value), "aria-invalid": !!errs[errKey(k)] || undefined });
  const e = (k: string) => errs[k];

  const cp = parseInt(f.cartonPacks, 10) || 0;
  const pb = parseInt(f.packBars, 10) || 0;
  const pr = toFixedInt(f.price, 2);
  const c4 = toFixedInt(f.cost, 4);
  const base = S.unitDef(f.baseUnit);

  // Active entries, plus the product's current value even if it has since been deactivated.
  const brandOpts = s.brands.filter((b) => b.status !== "Inactive" || b.id === product?.brand).map((b) => b.id);
  const catOpts = s.categories.filter((c) => c.status !== "Inactive" || c.id === product?.category).map((c) => c.id);
  const taxOpts = s.taxes.filter((t) => t.status === "Active" || t.id === product?.tax).map((t) => ({ value: t.id, label: t.name }));
  const baseOpts = s.units.filter((u) => u.base && (u.status === "Active" || u.code === product?.baseUnit)).map((u) => ({ value: u.code, label: u.name }));
  const extraOpts = s.units.filter((u) => !u.base && !["pk", "ctn"].includes(u.code) && (u.status === "Active" || f.extra.some((x) => x.unit === u.code))).map((u) => ({ value: u.code, label: u.name }));

  const pickImage = async (file?: File) => {
    if (!file) return;
    try {
      const url = await resizeImage(file);
      setF((x) => ({ ...x, image: url }));
      setErrs((x) => ({ ...x, image: "" }));
    } catch (ex) {
      setErrs((x) => ({ ...x, image: (ex as Error).message }));
    }
  };
  const updExtra = (key: number, patch: Partial<{ unit: string; factor: string }>) => setF((x) => ({ ...x, extra: x.extra.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const save = () => {
    const data: ProductInput = {
      sku: f.sku.trim().toUpperCase(), name: f.name.trim(), brand: f.brand, category: f.category, variant: f.variant.trim(), size: f.size.trim(), description: f.description.trim(), image: f.image,
      cartonPacks: cp, packBars: pb, baseUnit: f.baseUnit, extraUnits: f.extra.filter((r) => r.unit || r.factor).map((r) => ({ unit: r.unit, factor: parseInt(r.factor, 10) || 0 })),
      cost4: c4, price: pr, min: parseInt(f.min, 10) || 0, tax: f.tax, barcode: f.barcode.trim(), batch: f.batch, status: f.status,
    };
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
      <DialogContent size="xl">
        <DialogHeader title={isNew ? "New product" : "Edit product"} description="POST/PUT /api/products · fields marked * are required" />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-secondary-foreground">Product image</span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square w-full max-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-muted/50 text-muted-foreground hover:bg-muted"
                aria-label={f.image ? "Replace image" : "Upload image"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing to optimise */}
                {f.image ? <img src={f.image} alt="" className="size-full object-contain" /> : <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="size-6" />Upload</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(ev) => { pickImage(ev.target.files?.[0]); ev.target.value = ""; }} />
              {f.image && <Button variant="ghost" size="xs" className="self-start" onClick={() => setF((x) => ({ ...x, image: "" }))}><X />Remove image</Button>}
              {e("image") ? <p className="text-[11.5px] text-danger">{e("image")}</p> : <p className="text-[11.5px] text-muted-foreground">Resized to 320 px automatically.</p>}
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="SKU / product code" required error={e("sku")} hint={!isNew ? "SKU is immutable once created." : undefined}>
                <Input {...inp("sku")} disabled={!isNew} placeholder="e.g. VEL-BTH-150" />
              </Field>
              <Field label="Product name" required error={e("name")} className="lg:col-span-2">
                <Input {...inp("name")} placeholder="Brand, type and size" />
              </Field>
              <Field label="Brand" required error={e("brand")}>
                <Select value={f.brand} onValueChange={set("brand")} placeholder="Select brand" invalid={!!e("brand")} options={brandOpts} />
              </Field>
              <Field label="Category" required error={e("category")}>
                <Select value={f.category} onValueChange={set("category")} placeholder="Select category" invalid={!!e("category")} options={catOpts} />
              </Field>
              <Field label="Variant / type" error={e("variant")}>
                <Input {...inp("variant")} placeholder="e.g. Lavender" />
              </Field>
              <Field label="Description" className="sm:col-span-2 lg:col-span-3">
                <Textarea value={f.description} onChange={(ev) => set("description")(ev.target.value)} placeholder="Shown on the catalogue page; documents use the product name" className="min-h-14" />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Base unit (stock is counted in)" required error={e("baseUnit")}>
              <Select value={f.baseUnit} onValueChange={set("baseUnit")} options={baseOpts} invalid={!!e("baseUnit")} />
            </Field>
            <Field label="Packaging size / net weight" error={e("size")}>
              <Input {...inp("size")} placeholder="e.g. 150 g" />
            </Field>
            <Field label="Packs per carton" required error={e("cartonPacks")}>
              <Input {...inp("cartonPacks")} inputMode="numeric" placeholder="20" />
            </Field>
            <Field label={`${base.name}s per pack`} required error={e("packBars")}>
              <Input {...inp("packBars")} inputMode="numeric" placeholder="12" />
            </Field>
            <Field label={`Default purchase cost / ${base.name.toLowerCase()} (GHS)`} required error={e("cost4")} hint="Up to 4 decimals. Actual cost comes from receipts.">
              <Input {...inp("cost")} inputMode="decimal" placeholder="2.1000" />
            </Field>
            <Field label={`Selling price / ${base.name.toLowerCase()} (GHS)`} required error={e("price")}>
              <Input {...inp("price")} inputMode="decimal" placeholder="2.95" />
            </Field>
            <Field label="Tax rate" required error={e("tax")}>
              <Select value={f.tax} onValueChange={set("tax")} options={taxOpts} placeholder="Select tax" invalid={!!e("tax")} />
            </Field>
            <Field label={`Reorder level per warehouse (${base.plural})`} error={e("min")} hint={f.min && cp && pb ? "≈ " + (Number(f.min) / (cp * pb || 1)).toFixed(1) + " cartons" : undefined}>
              <Input {...inp("min")} inputMode="numeric" />
            </Field>
            <Field label="Barcode (optional)" error={e("barcode")}>
              <Input {...inp("barcode")} inputMode="numeric" />
            </Field>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">Additional unit conversions</span>
              <span className="text-[11.5px] text-muted-foreground">Packs and cartons come from the packaging fields above.</span>
            </div>
            {f.extra.map((r) => (
              <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-1.5 sm:grid-cols-[180px_160px_auto_32px]">
                <Select size="sm" value={r.unit} onValueChange={(v) => updExtra(r.key, { unit: v })} placeholder="Unit" options={extraOpts} aria-label="Unit" />
                <Input value={r.factor} onChange={(ev) => updExtra(r.key, { factor: ev.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder={`${base.plural} per unit`} aria-label="Base units per unit" className="h-8 text-right tabular" />
                <span className="hidden text-[12px] text-muted-foreground sm:inline">
                  {r.unit && r.factor ? `1 ${S.unitDef(r.unit).name.toLowerCase()} = ${S.commas(parseInt(r.factor, 10) || 0)} ${base.plural}${cp * pb ? " (" + ((parseInt(r.factor, 10) || 0) / (cp * pb)).toFixed(1) + " ctn)" : ""}` : ""}
                </span>
                <Button variant="outline" size="icon-sm" aria-label="Remove conversion" onClick={() => setF((x) => ({ ...x, extra: x.extra.filter((y) => y.key !== r.key) }))}><Trash2 /></Button>
              </div>
            ))}
            {e("extraUnits") && <p className="text-[11.5px] text-danger">{e("extraUnits")}</p>}
            <Button variant="ghost" size="sm" className="self-start" disabled={!extraOpts.length} onClick={() => setF((x) => ({ ...x, extra: [...x.extra, { key: ++rowKey, unit: "", factor: "" }] }))}>
              <Plus />Add conversion (box, pallet…)
            </Button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-primary/20 bg-primary-soft/60 px-3.5 py-2.5 text-[12.5px] text-primary-soft-foreground">
            <span>Conversion preview: <b>1 carton = {cp || "—"} packs = {cp * pb || "—"} {base.plural}</b></span>
            <span>Carton price: <b>{pr && cp * pb ? S.money(pr * cp * pb) : "—"}</b></span>
            <span>Margin per {base.name.toLowerCase()}: <b>{pr && c4 ? S.cost(pr * 100 - c4) : "—"}</b></span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <CheckboxField label="Require batch number and expiry on receipt" checked={f.batch} onCheckedChange={(c) => setF((x) => ({ ...x, batch: c === true }))} />
            <CheckboxField label="Discontinued (no new estimates, orders or invoices)" checked={f.status === "Discontinued"} onCheckedChange={(c) => setF((x) => ({ ...x, status: c === true ? "Discontinued" : "Active" }))} />
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
