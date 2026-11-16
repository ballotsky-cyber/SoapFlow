"use client";

import * as React from "react";
import { BadgeCheck, FolderTree, Plus, Ruler, Search } from "lucide-react";
import { useSoap } from "@/lib/store";
import type { MasterKind } from "@/lib/store/commerce";
import type { ModuleProps } from "@/components/app/modules";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Page, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";

type Kind = Exclude<MasterKind, "taxes">;
const KINDS: Kind[] = ["categories", "brands", "units"];

/** Unified row shape for the three lists. */
interface Row { key: string; name: string; status: string; sub: string; products: number; base?: boolean; conversions?: string[] }
type FormState = { key: string; name: string; plural: string; tag: string; supplier: string; description: string; active: boolean };

const META: Record<Kind, { title: string; one: string; icon: typeof FolderTree; desc: string }> = {
  categories: { title: "Categories", one: "category", icon: FolderTree, desc: "Group products for filtering and reporting. Categories in use cannot be deleted — deactivate them instead." },
  brands: { title: "Brands", one: "brand", icon: BadgeCheck, desc: "Brands carried in the catalogue, with their usual supplier." },
  units: { title: "Units of measurement", one: "unit", icon: Ruler, desc: "Stock is counted in base units (bar, piece). Packaging units convert per product — set the factor on each product." },
};

/** Product master lists: categories, brands and units of measurement. */
export default function MastersPage({ view }: ModuleProps) {
  const S = useSoap();
  const s = S.s;
  const kind: Kind = KINDS.includes(view as Kind) ? (view as Kind) : "categories";
  const m = META[kind];
  const canEdit = S.can("cat.edit");
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  // undefined = closed, null = new, string = editing that key
  const [editing, setEditing] = React.useState<string | null | undefined>(() => (s.route.action === "new" && canEdit ? null : undefined));

  const rows: Row[] =
    kind === "categories"
      ? s.categories.map((c) => ({ key: c.id, name: c.id, status: c.status, sub: c.description || "—", products: s.products.filter((p) => p.category === c.id).length }))
      : kind === "brands"
        ? s.brands.map((b) => ({ key: b.id, name: b.id, status: b.status || "Active", sub: [b.tag, b.supplier ? S.sup(b.supplier).name : ""].filter(Boolean).join(" · ") || "—", products: s.products.filter((p) => p.brand === b.id).length }))
        : s.units.map((u) => {
            const conv: string[] = [];
            s.products.forEach((p) => {
              if ((p.baseUnit || "bar") === u.code) return;
              const f = u.code === "pk" ? (p.packBars > 1 ? p.packBars : 0) : u.code === "ctn" ? p.cartonPacks * p.packBars : (p.extraUnits || []).find((x) => x.unit === u.code)?.factor || 0;
              if (f) conv.push(`${p.sku}: 1 ${u.name.toLowerCase()} = ${S.commas(f)} ${S.unitDef(p.baseUnit || "bar").plural}`);
            });
            return { key: u.code, name: u.name, status: u.status, sub: u.plural, base: u.base, products: s.products.filter((p) => (p.baseUnit || "bar") === u.code || conv.some((c) => c.startsWith(p.sku + ":"))).length, conversions: conv };
          });
  const term = q.trim().toLowerCase();
  const list = rows.filter((r) => (!status || r.status === status) && (!term || (r.key + " " + r.name + " " + r.sub).toLowerCase().includes(term)));

  const toggle = (r: Row) => {
    const next = r.status === "Inactive" ? "Active" : "Inactive";
    const res = S.masterSave(kind, { ...dataFor(r.key), status: next }, false);
    if (!res.ok && res.errs?.status) S.toast("error", "Action blocked", res.errs.status);
    else S.result(res, m.title.replace(/s$/, "") + (next === "Active" ? " activated" : " deactivated"));
  };
  const dataFor = (key: string) => {
    if (kind === "units") { const u = s.units.find((x) => x.code === key)!; return { code: u.code, name: u.name, plural: u.plural, status: u.status }; }
    if (kind === "brands") { const b = s.brands.find((x) => x.id === key)!; return { id: b.id, tag: b.tag, supplier: b.supplier, description: b.description, status: b.status }; }
    const c = s.categories.find((x) => x.id === key)!;
    return { id: c.id, description: c.description, status: c.status };
  };
  const remove = (r: Row) =>
    S.confirm({
      title: `Delete ${m.one} “${r.name}”?`,
      body: r.products ? `It is used by ${r.products} product(s), so the system will refuse — deactivate it instead.` : "This cannot be undone. The deletion is recorded in the audit trail.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => S.result(S.masterDelete(kind, r.key), m.title.replace(/s$/, "") + " deleted"),
    });

  return (
    <Page>
      <PageHeader icon={m.icon} title={m.title} description={m.desc} actions={canEdit && <Button onClick={() => setEditing(null)}><Plus />New {m.one}</Button>} />
      <Toolbar>
        <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${m.title.toLowerCase()}`} className="w-full sm:w-60" />
        <Select value={status} onValueChange={setStatus} options={[{ value: "", label: "Any status" }, "Active", "Inactive"]} className="w-full sm:w-36" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>{kind === "units" ? "Code" : "Name"}</TH>
              <TH>{kind === "units" ? "Name / plural" : kind === "brands" ? "Tag / supplier" : "Description"}</TH>
              {kind === "units" && <TH>Type</TH>}
              {kind === "units" && <TH>Product conversions</TH>}
              <TH align="right">Products</TH>
              <TH>Status</TH>
              {canEdit && <TH align="right"><span className="sr-only">Actions</span></TH>}
            </tr>
          </THead>
          <TBody>
            {list.map((r) => (
              <TR key={r.key}>
                <TD nowrap className="font-medium">{kind === "units" ? <Ref>{r.key}</Ref> : r.name}</TD>
                <TD className="min-w-[160px] text-muted-foreground">{kind === "units" ? `${r.name} · ${r.sub}` : r.sub}</TD>
                {kind === "units" && <TD nowrap>{r.base ? "Base unit" : "Packaging"}</TD>}
                {kind === "units" && (
                  <TD className="min-w-[220px] text-[11.5px] text-muted-foreground">
                    {r.base ? "Stock is counted in this unit" : r.conversions!.length ? (
                      <>
                        {r.conversions!.slice(0, 3).map((c) => <div key={c}>{c}</div>)}
                        {r.conversions!.length > 3 && <div>+{r.conversions!.length - 3} more</div>}
                      </>
                    ) : "No product uses this unit yet"}
                  </TD>
                )}
                <TD nowrap align="right">{r.products}</TD>
                <TD nowrap><StatusBadge status={r.status} /></TD>
                {canEdit && (
                  <TD nowrap align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" variant="outline" onClick={() => setEditing(r.key)}>Edit</Button>
                      <Button size="xs" variant="outline" onClick={() => toggle(r)}>{r.status === "Inactive" ? "Activate" : "Deactivate"}</Button>
                      <Button size="xs" variant="destructive-outline" onClick={() => remove(r)}>Delete</Button>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
        {!list.length && <EmptyState icon={<Search />} title={`No ${m.title.toLowerCase()} match`}>Adjust the search or status filter.</EmptyState>}
      </Card>
      {editing !== undefined && <MasterDialog kind={kind} editKey={editing} onClose={() => setEditing(undefined)} />}
    </Page>
  );
}

function MasterDialog({ kind, editKey, onClose }: { kind: Kind; editKey: string | null; onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const isNew = editKey === null;
  const m = META[kind];
  const [f, setF] = React.useState<FormState>(() => {
    const blank: FormState = { key: "", name: "", plural: "", tag: "", supplier: "", description: "", active: true };
    if (isNew) return blank;
    if (kind === "units") { const u = s.units.find((x) => x.code === editKey)!; return { ...blank, key: u.code, name: u.name, plural: u.plural, active: u.status !== "Inactive" }; }
    if (kind === "brands") { const b = s.brands.find((x) => x.id === editKey)!; return { ...blank, key: b.id, tag: b.tag, supplier: b.supplier, description: b.description, active: b.status !== "Inactive" }; }
    const c = s.categories.find((x) => x.id === editKey)!;
    return { ...blank, key: c.id, description: c.description, active: c.status !== "Inactive" };
  });
  const [errs, setErrs] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState("");
  const set = (k: keyof FormState) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const status = f.active ? "Active" : "Inactive";
    const data = kind === "units" ? { code: f.key.trim(), name: f.name, plural: f.plural, status } : kind === "brands" ? { id: f.key.trim(), tag: f.tag, supplier: f.supplier, description: f.description, status } : { id: f.key.trim(), description: f.description, status };
    const r = S.masterSave(kind, data, isNew);
    if (!r.ok) {
      setErrs(r.errs || {});
      setErr(r.error);
      return;
    }
    onClose();
    S.result(r, m.title.replace(/s$/, "") + (isNew ? " created" : " updated"));
  };
  const keyErr = errs.id || errs.code;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title={(isNew ? "New " : "Edit ") + m.one} description={`POST/PUT /api/${kind} · changes are audited`} />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label={kind === "units" ? "Code" : "Name"} required error={keyErr} hint={!isNew ? "Cannot be changed — products reference it." : kind === "units" ? "1–6 lowercase letters, e.g. dz" : undefined} className={kind === "units" ? undefined : "sm:col-span-2"}>
              <Input value={f.key} onChange={(e) => set("key")(kind === "units" ? e.target.value.toLowerCase() : e.target.value)} disabled={!isNew} autoFocus={isNew} aria-invalid={!!keyErr || undefined} />
            </Field>
            {kind === "units" && (
              <>
                <Field label="Name (singular)" required error={errs.name}>
                  <Input value={f.name} onChange={(e) => set("name")(e.target.value)} placeholder="e.g. Dozen" aria-invalid={!!errs.name || undefined} />
                </Field>
                <Field label="Plural" required error={errs.plural}>
                  <Input value={f.plural} onChange={(e) => set("plural")(e.target.value)} placeholder="e.g. dozens" aria-invalid={!!errs.plural || undefined} />
                </Field>
              </>
            )}
            {kind === "brands" && (
              <>
                <Field label="Tag" hint="Short label, e.g. Brand A">
                  <Input value={f.tag} onChange={(e) => set("tag")(e.target.value)} />
                </Field>
                <Field label="Usual supplier" error={errs.supplier}>
                  <Select value={f.supplier} onValueChange={set("supplier")} options={[{ value: "", label: "None" }, ...s.suppliers.map((x) => ({ value: x.id, label: x.name }))]} />
                </Field>
              </>
            )}
            {kind !== "units" && (
              <Field label="Description" className="sm:col-span-2">
                <Textarea value={f.description} onChange={(e) => set("description")(e.target.value)} className="min-h-16" />
              </Field>
            )}
          </div>
          {kind === "units" && <div className="text-[12px] text-muted-foreground">New units are packaging units. Set how many base units they hold on each product (Product catalogue → Edit → Additional unit conversions).</div>}
          {!isNew && <CheckboxField label="Active (inactive entries cannot be assigned to products)" checked={f.active} onCheckedChange={(c) => setF((x) => ({ ...x, active: c === true }))} />}
          {errs.status && <Alert tone="danger">{errs.status}</Alert>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save {m.one}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
