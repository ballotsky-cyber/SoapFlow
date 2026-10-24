"use client";

import * as React from "react";
import { Plus, Search, Tags } from "lucide-react";
import { useSoap, type Product } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { DetailHeader, Fact, Grid, Page, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge, statusTextClass } from "@/components/shared/status-badge";
import { ProductFormDialog } from "./product-form-dialog";

export default function CataloguePage() {
  const S = useSoap();
  const s = S.s;
  const route = s.route;
  const [q, setQ] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [status, setStatus] = React.useState("");
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
      (!term || (p.sku + " " + p.name + " " + (p.barcode || "")).toLowerCase().includes(term)) &&
      (!brand || p.brand === brand) &&
      (!cat || p.category === cat) &&
      (!status || p.status === status),
  );
  const tag = (b: string) => s.brands.find((x) => x.id === b)?.tag ?? "";
  const cats = [...new Set(s.products.map((p) => p.category))];

  return (
    <Page>
      <PageHeader
        icon={Tags}
        title="Product catalogue"
        description={`${s.products.length} products across ${s.brands.length} brands · packaging conversions are configured per variant`}
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
        <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or barcode" className="w-full sm:w-60" />
        <Select value={brand} onValueChange={setBrand} options={[{ value: "", label: "All brands" }, ...s.brands.map((b) => b.id)]} className="w-[calc(50%-4px)] sm:w-40" />
        <Select value={cat} onValueChange={setCat} options={[{ value: "", label: "All categories" }, ...cats]} className="w-[calc(50%-4px)] sm:w-40" />
        <Select value={status} onValueChange={setStatus} options={[{ value: "", label: "Any status" }, "Active", "Discontinued"]} className="w-full sm:w-36" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>SKU</TH>
              <TH>Product</TH>
              <TH>Brand</TH>
              <TH>Category</TH>
              <TH>Variant / size</TH>
              <TH>Packaging</TH>
              {costV && <TH align="right">Purchase cost/bar</TH>}
              <TH align="right">Price/bar</TH>
              <TH align="right">Min. stock</TH>
              <TH>Tracking</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {list.map((p) => (
              <TR key={p.sku} onClick={() => S.nav("catalogue", { id: p.sku })}>
                <TD nowrap><Ref>{p.sku}</Ref></TD>
                <TD className="min-w-[200px] font-medium">{p.name}</TD>
                <TD nowrap>
                  {p.brand} <span className="text-[11px] text-subtle-foreground">{tag(p.brand)}</span>
                </TD>
                <TD nowrap>{p.category}</TD>
                <TD nowrap>{p.variant} · {p.size}</TD>
                <TD nowrap className="text-muted-foreground">{`${p.cartonPacks} pk × ${p.packBars} = ${p.cartonPacks * p.packBars} bars/ctn`}</TD>
                {costV && <TD nowrap align="right" className="font-mono text-[11.5px]">{S.cost(p.cost4)}</TD>}
                <TD nowrap align="right">{S.money(p.price)}</TD>
                <TD nowrap align="right">{S.qty(p.sku, p.min)}</TD>
                <TD nowrap>{p.batch ? "Batch + expiry" : "—"}</TD>
                <TD nowrap><StatusBadge status={p.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!list.length && <EmptyState icon={<Search />} title="No products match">Adjust the search or filters.</EmptyState>}
      </Card>
      {form}
    </Page>
  );
}

function ProductDetail({ p, canEdit, costV, onEdit }: { p: Product; canEdit: boolean; costV: boolean; onEdit: () => void }) {
  const S = useSoap();
  const warn = S.s.settings.expiryWarnDays;
  const bpc = p.cartonPacks * p.packBars;
  const facts = [
    { k: "Base unit", v: "Bar" },
    { k: "Selling price", v: S.money(p.price) + " /bar" },
    ...(costV ? [{ k: "Default purchase cost", v: S.cost(p.cost4) + " /bar" }] : []),
    { k: "Min. stock per warehouse", v: S.qty(p.sku, p.min) },
    { k: "Batch & expiry tracking", v: p.batch ? "Required · warn " + warn + " days" : "Not tracked" },
    { k: "Barcode", v: p.barcode || "—" },
  ];

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
            {canEdit && <Button onClick={onEdit}>Edit product</Button>}
          </>
        }
      />
      <Grid min={340}>
        <Card>
          <CardHeader title="Packaging configuration" />
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="rounded-lg border bg-muted/60 px-3 py-2"><b>1</b> carton</span>
              <span className="text-subtle-foreground">=</span>
              <span className="rounded-lg border bg-muted/60 px-3 py-2"><b>{p.cartonPacks}</b> packs</span>
              <span className="text-subtle-foreground">×</span>
              <span className="rounded-lg border bg-muted/60 px-3 py-2"><b>{p.packBars}</b> bars</span>
              <span className="text-subtle-foreground">=</span>
              <span className="rounded-lg border border-primary/30 bg-primary-soft px-3 py-2 text-primary-soft-foreground"><b>{bpc}</b> bars (base unit)</span>
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
          <CardHeader title="Price history" />
          {(p.priceHistory || []).slice().reverse().map((h, i) => (
            <div key={i} className="flex flex-wrap justify-between gap-2 border-b px-4 py-2.5 text-[12.5px] last:border-0">
              <span>{S.fmtDate(h.date)} · <span className="text-muted-foreground">{h.by}</span></span>
              <span className="font-medium tabular">{S.money(h.price)} /bar · {S.money(h.price * bpc)} /ctn</span>
            </div>
          ))}
        </Card>
      </Grid>
    </>
  );
}
