"use client";

import * as React from "react";
import { Package, Plus, Search, Tags } from "lucide-react";
import { useSoap, type Product } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { DetailHeader, Fact, Grid, Page, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge, statusTextClass } from "@/components/shared/status-badge";
import { lineQty } from "@/features/sales/shared/doc-view";
import { cn } from "@/lib/utils";
import { ProductFormDialog } from "./product-form-dialog";

/** Product thumbnail (uploaded image) or a neutral placeholder icon. */
function Thumb({ p, className }: { p: Product; className?: string }) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/60 text-subtle-foreground", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing to optimise */}
      {p.image ? <img src={p.image} alt="" className="size-full object-contain" /> : <Package className="size-4" />}
    </span>
  );
}

export default function CataloguePage() {
  const S = useSoap();
  const s = S.s;
  const route = s.route;
  const [q, setQ] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  // Form state: undefined = closed, null = new product, Product = editing.
  const [editing, setEditing] = React.useState<Product | null | undefined>(() => (route.action === "new" && S.can("cat.edit") ? null : undefined));

  const costV = S.canView("cost.view");
  const canEdit = S.can("cat.edit");
  const detail = route.id ? s.products.find((p) => p.sku === route.id) : undefined;

  const form = editing !== undefined && <ProductFormDialog product={editing} onClose={() => setEditing(undefined)} />;

  if (detail) return (
    <Page>
      <ProductDetail p={detail} canEdit={canEdit} costV={costV} onEdit={() => setEditing(detail)} />
      {form}
    </Page>
  );

  const term = q.trim().toLowerCase();
  const list = s.products.filter(
    (p) =>
      (!term || (p.sku + " " + p.name + " " + (p.barcode || "") + " " + (p.description || "")).toLowerCase().includes(term)) &&
      (!brand || p.brand === brand) &&
      (!cat || p.category === cat) &&
      (!status || p.status === status),
  );
  const pg = S.paginate(list, page, 12);
  const tag = (b: string) => s.brands.find((x) => x.id === b)?.tag ?? "";
  const filt = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  return (
    <Page>
      <PageHeader
        icon={Tags}
        title="Product catalogue"
        description={`${s.products.length} products across ${s.brands.length} brands · active products are available on estimates, orders and invoices`}
        actions={
          canEdit && (
            <Button onClick={() => setEditing(null)}>
              <Plus />
              New product
            </Button>
          )
        }
      />
      <Toolbar>
        <Input icon={<Search />} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, SKU or barcode" className="w-full sm:w-60" />
        <Select value={brand} onValueChange={filt(setBrand)} options={[{ value: "", label: "All brands" }, ...s.brands.map((b) => b.id)]} className="w-[calc(50%-4px)] sm:w-40" />
        <Select value={cat} onValueChange={filt(setCat)} options={[{ value: "", label: "All categories" }, ...s.categories.map((c) => c.id)]} className="w-[calc(50%-4px)] sm:w-40" />
        <Select value={status} onValueChange={filt(setStatus)} options={[{ value: "", label: "Any status" }, "Active", "Discontinued"]} className="w-full sm:w-36" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH><span className="sr-only">Image</span></TH>
              <TH>SKU</TH>
              <TH>Product</TH>
              <TH>Brand</TH>
              <TH>Category</TH>
              <TH>Packaging</TH>
              {costV && <TH align="right">Purchase cost</TH>}
              <TH align="right">Selling price</TH>
              <TH>Tax</TH>
              <TH align="right">Reorder level</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((p) => (
              <TR key={p.sku} onClick={() => S.nav("catalogue", { id: p.sku })}>
                <TD className="w-12 py-1.5"><Thumb p={p} /></TD>
                <TD nowrap><Ref>{p.sku}</Ref></TD>
                <TD className="min-w-[200px] font-medium">
                  {p.name}
                  <div className="text-[11px] font-normal text-muted-foreground">{p.variant} · {p.size}</div>
                </TD>
                <TD nowrap>
                  {p.brand} <span className="text-[11px] text-subtle-foreground">{tag(p.brand)}</span>
                </TD>
                <TD nowrap>{p.category}</TD>
                <TD nowrap className="text-muted-foreground">
                  {`${p.cartonPacks} pk × ${p.packBars} = ${p.cartonPacks * p.packBars} ${S.unitDef(p.baseUnit).plural}/ctn`}
                  {(p.extraUnits || []).length > 0 && <div className="text-[11px]">+ {(p.extraUnits || []).map((u) => S.unitDef(u.unit).name.toLowerCase()).join(", ")}</div>}
                </TD>
                {costV && <TD nowrap align="right" className="font-mono text-[11.5px]">{S.cost(p.cost4)}</TD>}
                <TD nowrap align="right">{S.money(p.price)}<div className="text-[11px] text-subtle-foreground">per {S.unitDef(p.baseUnit).name.toLowerCase()}</div></TD>
                <TD nowrap>{S.taxOf(p.tax)?.name ?? "—"}</TD>
                <TD nowrap align="right">{S.qty(p.sku, p.min)}</TD>
                <TD nowrap><StatusBadge status={p.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!pg.rows.length && <EmptyState icon={<Search />} title="No products match">Adjust the search or filters.</EmptyState>}
        <Pagination {...pg} onPage={setPage} />
      </Card>
      {form}
    </Page>
  );
}

function ProductDetail({ p, canEdit, costV, onEdit }: { p: Product; canEdit: boolean; costV: boolean; onEdit: () => void }) {
  const S = useSoap();
  const s = S.s;
  const warn = s.settings.expiryWarnDays;
  const base = S.unitDef(p.baseUnit);
  const bpc = p.cartonPacks * p.packBars;
  const tax = S.taxOf(p.tax);
  const facts = [
    { k: "Base unit", v: base.name },
    { k: "Selling price", v: S.money(p.price) + " /" + base.name.toLowerCase() },
    ...(costV ? [{ k: "Default purchase cost", v: S.cost(p.cost4) + " /" + base.name.toLowerCase() }] : []),
    { k: "Tax rate", v: tax ? tax.name : "—" },
    { k: "Reorder level per warehouse", v: S.qty(p.sku, p.min) },
    { k: "Batch & expiry tracking", v: p.batch ? "Required · warn " + warn + " days" : "Not tracked" },
    { k: "Barcode", v: p.barcode || "—" },
  ];
  // Historical selling prices from issued invoices: what customers were actually charged.
  const txns = s.invoices
    .filter((i) => i.status === "Issued")
    .flatMap((i) => i.lines.filter((l) => l.sku === p.sku).map((l) => ({ inv: i, l })))
    .sort((a, b) => (a.inv.date < b.inv.date ? 1 : a.inv.date > b.inv.date ? -1 : a.inv.id < b.inv.id ? 1 : -1));

  const del = () =>
    S.confirm({
      title: "Delete " + p.sku + "?",
      body: "Only products that were never stocked or used on any document can be deleted. Products with history must be marked Discontinued instead.",
      confirmLabel: "Delete product",
      danger: true,
      onConfirm: () => {
        const r = S.result(S.productDelete(p.sku), "Product deleted");
        if (r.ok) S.nav("catalogue");
      },
    });

  return (
    <>
      <DetailHeader
        backLabel="Catalogue"
        onBack={() => S.nav("catalogue")}
        reference={p.sku}
        title={p.name}
        meta={
          <>
            {p.brand} · {p.category} · {p.variant} · {p.size} <StatusBadge status={p.status} />
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => S.nav("inventory")}>View stock &amp; ledger</Button>
            {canEdit && <Button variant="destructive-outline" onClick={del}>Delete</Button>}
            {canEdit && <Button onClick={onEdit}>Edit product</Button>}
          </>
        }
      />
      {(p.image || p.description) && (
        <Card className="flex flex-wrap items-start gap-4 p-4">
          {p.image && <Thumb p={p} className="size-28 rounded-lg" />}
          <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
            <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Description</div>
            {p.description || <span className="text-muted-foreground">No description.</span>}
          </div>
        </Card>
      )}
      <Grid min={340}>
        <Card>
          <CardHeader title="Packaging & units" />
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="rounded-lg border bg-muted/60 px-3 py-2"><b>1</b> carton</span>
              <span className="text-subtle-foreground">=</span>
              <span className="rounded-lg border bg-muted/60 px-3 py-2"><b>{p.cartonPacks}</b> packs</span>
              <span className="text-subtle-foreground">×</span>
              <span className="rounded-lg border bg-muted/60 px-3 py-2"><b>{p.packBars}</b> {base.plural}</span>
              <span className="text-subtle-foreground">=</span>
              <span className="rounded-lg border border-primary/30 bg-primary-soft px-3 py-2 text-primary-soft-foreground"><b>{bpc}</b> {base.plural} (base unit)</span>
            </div>
            <div className="overflow-hidden rounded-lg border">
              {S.unitsFor(p.sku).map((u) => (
                <div key={u.unit} className="flex justify-between gap-3 border-b px-3 py-1.5 text-[12.5px] last:border-0">
                  <span>1 {u.label.toLowerCase()} <span className="font-mono text-[11px] text-muted-foreground">({u.unit})</span></span>
                  <span className="tabular">
                    {S.commas(u.factor)} {u.factor === 1 ? base.name.toLowerCase() : base.plural} · {S.money(p.price * u.factor)}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {facts.map((f) => <Fact key={f.k} k={f.k} v={f.v} />)}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Warehouse stock summary" />
          {S.allowedWh().map((w) => {
            const b = S.bal(w, p.sku);
            const a = S.avail(w, p.sku);
            const st = a === 0 ? "Out of stock" : a <= p.min ? "Low" : "OK";
            return (
              <div key={w} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b px-4 py-2.5 last:border-0">
                <span className="font-medium">{S.wh(w).name}</span>
                <span className="font-semibold tabular">{S.qty(p.sku, a)} available</span>
                <span className="text-[11.5px] text-muted-foreground">sellable {S.qty(p.sku, b.sellable)} · reserved {S.qty(p.sku, b.reserved)}</span>
                <span className={`text-right text-[11px] font-medium ${statusTextClass(st)}`}>{st}</span>
              </div>
            );
          })}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Catalogue price history" />
          {(p.priceHistory || []).slice().reverse().map((h, i) => (
            <div key={i} className="flex flex-wrap justify-between gap-2 border-b px-4 py-2.5 text-[12.5px] last:border-0">
              <span>{S.fmtDate(h.date)} · <span className="text-muted-foreground">{h.by}</span></span>
              <span className="font-medium tabular">{S.money(h.price)} /{base.name.toLowerCase()} · {S.money(h.price * bpc)} /ctn</span>
            </div>
          ))}
        </Card>
      </Grid>
      {S.canView("fin.view") && (
        <Card className="overflow-hidden">
          <CardHeader title="Transaction price history" description="Prices charged on issued invoices — preserved even when the catalogue price changes" />
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Invoice</TH>
                <TH>Customer</TH>
                <TH align="right">Quantity</TH>
                <TH align="right">Unit price</TH>
                <TH align="right">Per {base.name.toLowerCase()}</TH>
                <TH align="right">Disc.</TH>
              </tr>
            </THead>
            <TBody>
              {txns.slice(0, 25).map(({ inv, l }) => (
                <TR key={inv.id + l.sku} onClick={() => S.nav("invoices", { id: inv.id })}>
                  <TD nowrap className="text-muted-foreground">{S.fmtDate(inv.date)}</TD>
                  <TD nowrap><Ref>{inv.id}</Ref></TD>
                  <TD className="min-w-[150px]">{inv.party?.name || S.cust(inv.customer).name}</TD>
                  <TD nowrap align="right">{lineQty(S, l)}</TD>
                  <TD nowrap align="right">{S.money(l.uprice)} /{S.unitDef(l.unit).name.toLowerCase()}</TD>
                  <TD nowrap align="right">{S.money(Math.round(l.uprice / (l.factor || 1)))}</TD>
                  <TD nowrap align="right">{l.discPct ? l.discPct + "%" : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {!txns.length && <EmptyState title="Not invoiced yet" className="py-6" />}
        </Card>
      )}
    </>
  );
}
