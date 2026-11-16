/* SoapFlow commercial module — ILLUSTRATIVE, client-side. Installed into the demo engine by createSoapStore() (engine.js).
   Product masters, customers, estimates, sales orders, invoices, payments & receipts, credit notes and customer returns.
   Every business rule is enforced here (the engine stands in for the backend); screens only pre-validate for convenience.
   Money: integer pesewas. Quantities: integer base units (bars). Tax rates: basis points (1500 = 15%). Discounts: percent.
   Document lines snapshot name, unit conversion, unit price and tax rate, so catalogue changes never alter issued documents.
   Type-only imports are erased, so this file also runs under `node --experimental-strip-types` for the tests. */

import type {
  Balance, Brand, Category, Charge, CreditLine, CreditNote, CreditNoteType, Customer, CustomerReturn, DayFigures, DocLine, DocTotals, Estimate,
  Invoice, LineAmounts, LineInput, OrderLine, Party, Payment, Product, Result, SalesOrder, SoapState, TaxRate, Unit, User, Warehouse,
} from "./types";

export const SCHEMA = 2;

type Fail = { ok: false; error: string; errs?: Record<string, string> };
type Ok = Extract<Result, { ok: true }>;

/** Engine internals the module is given (see installCommerce call in engine.js). */
export interface EngineCtx {
  readonly st: SoapState;
  TODAY: string;
  pad(n: number, l?: number): string;
  addDays(iso: string, d: number): string;
  diffDays(a: string, b: string): number;
  clock(): string;
  nextRef(prefix: string): string;
  log(action: string, ref: string, detail: string): void;
  move(type: string, wh: string, sku: string, qty: number, bucket: string, cost4: number | null, ref: string): void;
  bal(wh: string, sku: string): Balance;
  prod(sku: string): Product;
  cust(id: string): Customer;
  wh(id: string): Warehouse;
  user(id?: string): User;
  can(perm: string): boolean;
  deny(what?: string): Fail;
  fail(msg: string): Fail;
  ok(msg: string, ref?: string, extra?: Record<string, unknown>): Ok;
  whDeny(w: string): Fail | null;
  money(m: number): string;
  qty(sku: string, n: number): string;
  avail(w: string, sku: string): number;
  wavg(b: Balance, qIn: number, c4: number, ref: string): void;
  day(w: string): DayFigures;
  emit(): void;
}

/** Per-line progress of a sales order. */
export interface OrderLineProgress {
  sku: string; ordered: number; reserved: number; fulfilled: number; returned: number;
  invoiced: number; draft: number; invoiceable: number; toDeliver: number; backorder: number;
}
export interface OrderProgress {
  rows: OrderLineProgress[]; uninvoiced: number; billed: number; paid: number; invoiceable: boolean;
  fulfil: "Not fulfilled" | "Partially fulfilled" | "Fulfilled";
  invoice: "Not invoiced" | "Partially invoiced" | "Fully invoiced";
  payment: "Not billed" | "Unpaid" | "Partially paid" | "Paid";
}
export interface InvoicePrefill {
  so: string; customer: string; wh: string; termsDays: number; basis: "ordered" | "delivered";
  lines: (OrderLine & OrderLineProgress)[];
  charges: (Charge & { idx: number; used: boolean })[];
}
export interface ReturnableLine { sku: string; name: string; unit: string; factor: number; invoiced: number; credited: number; max: number }
export interface RelatedDoc { type: string; id: string; status: string; amount: number | null; route: { name: string; id: string; tab?: string } }
export type MasterKind = "categories" | "brands" | "units" | "taxes";
export interface UnitOption { unit: string; factor: number; label: string }

/* Form payloads accepted by the actions. Amounts are pesewas, quantities base units unless noted. */
export interface ProductInput {
  sku: string; name: string; brand: string; category: string; variant?: string; size?: string; description?: string; image?: string;
  cartonPacks: number; packBars: number; baseUnit?: string; extraUnits?: { unit: string; factor: number }[];
  cost4: number; price: number; min: number; tax: string; barcode?: string; batch?: boolean; status?: string;
}
export interface MasterInput { id?: string; code?: string; name?: string; plural?: string; rate?: number; tag?: string; supplier?: string; description?: string; status?: string }
export interface CustomerInput {
  id?: string; name: string; type: string; contact?: string; phone?: string; email?: string; address?: string; delivAddr?: string; city?: string;
  tin?: string; terms: number; limit: number; status?: string;
}
export interface EstimateInput { id?: string; customer: string; wh?: string; expiry: string; ref?: string; notes?: string; terms?: string; lines: LineInput[]; charges?: Charge[] }
export interface OrderInput {
  id?: string; customer: string; walkin?: string; wh: string; method: string; terms: string; address?: string; expected?: string; ref?: string; notes?: string;
  lines?: LineInput[]; charges?: Charge[];
}
export interface InvoiceInput {
  id?: string; so?: string; customer?: string; wh?: string; date?: string; termsDays: number; ref?: string; notes?: string;
  /** Direct invoice: catalogue rows. Order invoice: { sku, qty } in base units. */
  lines?: (LineInput | { sku: string; qty: number })[];
  soCharges?: number[]; charges?: Charge[];
}
export interface FulfilInput { wh?: string; method?: string; address?: string; expected?: string }
export interface PaymentInput {
  customer: string; date: string; amount: number; method: string; extRef?: string; receivedBy?: string; notes?: string; evidence?: string;
  alloc?: { inv: string; amount: number }[];
}
export interface CreditNoteInput { inv: string; type: CreditNoteType; reason: string; wh?: string; lines?: { sku: string; qty: number }[]; amount?: number }

const SO_INVOICEABLE = ["Confirmed", "Ready for Collection", "Ready for Dispatch", "Partially Fulfilled", "Dispatched", "Delivered", "Completed"];
const SO_OPEN = ["Confirmed", "Ready for Collection", "Ready for Dispatch", "Partially Fulfilled"];
const INV_ACTIVE = ["Draft", "Issued"];
const CN_TYPES: CreditNoteType[] = ["Return", "Price correction", "Discount", "Adjustment"];
const WALKIN = "CUS-006";
const BUILTIN_UNITS = ["bar", "pc", "pk", "ctn"];

const DEFAULT_UNITS: Unit[] = [
  { code: "bar", name: "Bar", plural: "bars", base: true, status: "Active" },
  { code: "pc", name: "Piece", plural: "pieces", base: true, status: "Active" },
  { code: "pk", name: "Pack", plural: "packs", base: false, status: "Active" },
  { code: "ctn", name: "Carton", plural: "cartons", base: false, status: "Active" },
  { code: "box", name: "Box", plural: "boxes", base: false, status: "Active" },
  { code: "plt", name: "Pallet", plural: "pallets", base: false, status: "Active" },
];
const DEFAULT_TAXES: TaxRate[] = [
  { id: "VAT15", name: "VAT 15%", rate: 1500, status: "Active" },
  { id: "EXEMPT", name: "Exempt / zero-rated", rate: 0, status: "Active" },
];
const DEFAULT_CATEGORIES = ["Bathing", "Laundry", "Multipurpose", "Antibacterial", "Herbal"];

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const isInt = (n: unknown): n is number => Number.isInteger(n);
const str = (v: unknown) => String(v ?? "").trim();

export function installCommerce(E: EngineCtx) {
  const S = () => E.st; // state is replaced on reset / cross-tab sync, so always read it through E
  const { TODAY, pad, addDays, clock, log, move, bal, prod, cust, wh, can, deny, fail, ok, whDeny, money, qty, avail, wavg, day, nextRef } = E;
  const me = () => S().currentUser;
  const findEst = (id: string) => S().estimates.find((x) => x.id === id);
  const findSO = (id: string) => S().salesOrders.find((x) => x.id === id);
  const findInv = (id: string) => S().invoices.find((x) => x.id === id);
  const findPay = (id: string) => S().payments.find((x) => x.id === id);
  const findCN = (id: string) => S().creditNotes.find((x) => x.id === id);
  const findRtn = (id: string) => S().returns.find((x) => x.id === id);

  // ---------- units, taxes & line maths
  const unitDef = (code: string): Unit => S().units.find((u) => u.code === code) || { code, name: code, plural: code, base: false, status: "Active" };
  const unitFactor = (sku: string, unit: string): number => {
    const p = prod(sku);
    if (!unit || unit === (p.baseUnit || "bar")) return 1;
    if (unit === "pk") return p.packBars;
    if (unit === "ctn") return p.cartonPacks * p.packBars;
    const x = (p.extraUnits || []).find((u) => u.unit === unit);
    return x ? x.factor : 0;
  };
  const unitsFor = (sku: string): UnitOption[] => {
    const p = prod(sku);
    const out = [{ unit: p.baseUnit || "bar", factor: 1 }];
    if (p.packBars > 1) out.push({ unit: "pk", factor: p.packBars });
    if (p.cartonPacks * p.packBars > 1) out.push({ unit: "ctn", factor: p.cartonPacks * p.packBars });
    (p.extraUnits || []).forEach((u) => out.push({ unit: u.unit, factor: u.factor }));
    return out.map((u) => ({ ...u, label: unitDef(u.unit).name }));
  };
  const taxOf = (id: string) => S().taxes.find((t) => t.id === id);
  const lineCalc = (l: DocLine, q?: number): LineAmounts => {
    const n = q == null ? l.qty : q;
    const gross = Math.round((n * l.uprice) / (l.factor || 1));
    const disc = Math.round((gross * (l.discPct || 0)) / 100);
    const net = gross - disc;
    const tax = Math.round((net * (l.taxRate || 0)) / 10000);
    return { gross, disc, net, tax, total: net + tax };
  };
  const docTotals = (d: { lines: DocLine[]; charges?: Charge[] }): DocTotals => {
    const t = { sub: 0, disc: 0, net: 0, tax: 0, chargesTotal: 0, total: 0 };
    d.lines.forEach((l) => { const c = lineCalc(l); t.sub += c.gross; t.disc += c.disc; t.net += c.net; t.tax += c.tax; });
    t.chargesTotal = (d.charges || []).reduce((a, c) => a + c.amount, 0);
    t.total = t.net + t.tax + t.chargesTotal;
    return t;
  };
  const stamp = <T extends { lines: DocLine[]; charges?: Charge[] }>(d: T): T & DocTotals => Object.assign(d, docTotals(d));
  /** Discount against the catalogue list price, including any price override — used for the approval threshold. */
  const effDisc = (l: DocLine) => { const list = l.qty * prod(l.sku).price; return list ? Math.max(0, Math.round(((list - lineCalc(l).net) * 1000) / list) / 10) : 0; };
  const party = (id: string): Party => { const c = cust(id); return { name: c.name, contact: c.contact || "", phone: c.phone || "", email: c.email || "", address: c.address || "", delivAddr: c.delivAddr || c.address || "", tin: c.tin || "" }; };

  /** Build stored lines from form rows. `prev` = the lines being edited (their discontinued products stay allowed). */
  const mkLines = (rows: LineInput[] | undefined, prev?: DocLine[]): { lines: DocLine[]; error?: undefined } | { error: string } => {
    if (!Array.isArray(rows) || !rows.length) return { error: "Add at least one product line." };
    const seen = new Set<string>(); const lines: DocLine[] = [];
    for (const r of rows) {
      const p = S().products.find((x) => x.sku === r.sku);
      if (!p) return { error: "Select a product on every line." };
      if (seen.has(p.sku)) return { error: `${p.name} appears twice — combine it into one line.` };
      seen.add(p.sku);
      if (p.status !== "Active" && !(prev || []).some((x) => x.sku === p.sku)) return { error: `${p.name} is discontinued and cannot be added to new documents.` };
      const unit = r.unit || p.baseUnit || "bar";
      const factor = unitFactor(p.sku, unit);
      if (!factor) return { error: `${p.name}: no conversion is configured for unit "${unit}".` };
      const uqty = Number(r.uqty);
      const q = Math.round(uqty * factor);
      if (!(uqty > 0) || Math.abs(q - uqty * factor) > 1e-6) return { error: `${p.name}: enter a quantity above zero that converts to whole ${unitDef(p.baseUnit || "bar").plural}.` };
      const uprice = Number(r.uprice);
      if (!isInt(uprice) || uprice < 0) return { error: `${p.name}: enter a valid unit price — negative prices are not allowed.` };
      const discPct = Number(r.discPct) || 0;
      if (discPct < 0 || discPct > 100) return { error: `${p.name}: discount must be between 0 and 100%.` };
      const t = taxOf(r.tax || p.tax);
      if (!t) return { error: `${p.name}: select a tax rate.` };
      lines.push({ sku: p.sku, name: p.name, desc: str(r.desc), unit, factor, uqty, qty: q, uprice, discPct, taxCode: t.id, taxRate: t.rate });
    }
    return { lines };
  };
  const mkCharges = (rows: Charge[] | undefined): { charges: Charge[]; error?: undefined } | { error: string } => {
    const out: Charge[] = [];
    for (const c of rows || []) {
      const label = str(c.label); const amount = Number(c.amount);
      if (!label && !amount) continue;
      if (!label) return { error: "Describe every additional charge." };
      if (!isInt(amount) || amount <= 0) return { error: `Charge "${label}": enter an amount above zero.` };
      out.push({ label, amount });
    }
    return { charges: out };
  };

  // ---------- invoices, customers & orders (derived)
  const invBal = (i: Invoice) => (i.status === "Issued" ? i.total - i.paid - i.credited : 0);
  const invStatus = (i: Invoice): string => {
    if (i.status !== "Issued") return i.status;
    if (i.total > 0 && i.credited >= i.total) return "Credited";
    if (i.total - i.paid - i.credited <= 0) return "Paid";
    if (i.due < TODAY) return "Overdue";
    if (i.paid > 0) return "Partially Paid";
    return "Issued";
  };
  /** Outstanding on issued invoices, less unallocated (on-account) payments. */
  const custBalance = (id: string) =>
    S().invoices.filter((i) => i.customer === id).reduce((a, i) => a + invBal(i), 0) -
    S().payments.filter((p) => p.customer === id && p.status !== "Reversed").reduce((a, p) => a + (p.unallocated || 0), 0);
  const estStatus = (e: Estimate): string => (["Draft", "Sent"].includes(e.status) && e.expiry < TODAY ? "Expired" : e.status);

  const soInvoices = (so: SalesOrder, exclude?: string) => S().invoices.filter((i) => i.so === so.id && INV_ACTIVE.includes(i.status) && i.id !== exclude);
  const cnQty = (pred: (n: CreditNote) => boolean, sku: string) => S().creditNotes.filter(pred).reduce((a, n) => a + n.lines.filter((l) => l.sku === sku).reduce((x, l) => x + l.qty, 0), 0);
  /** Per-line progress of an order. `exclude` skips one draft invoice (the one being edited). */
  const soLine = (so: SalesOrder, l: OrderLine, exclude?: string): OrderLineProgress => {
    const invs = soInvoices(so, exclude);
    const sum = (pred: (i: Invoice) => boolean) => invs.filter(pred).reduce((a, i) => a + i.lines.filter((x) => x.sku === l.sku).reduce((b, x) => b + x.qty, 0), 0);
    const reopened = cnQty((n) => n.so === so.id && n.reopen, l.sku); // refused on delivery, credited back, to be re-delivered
    const invoiced = sum(() => true) - reopened;
    const cap = S().settings.invoiceBasis === "delivered" ? l.fulfilled : l.qty;
    const open = SO_OPEN.includes(so.status);
    return {
      sku: l.sku, ordered: l.qty, reserved: l.reserved, fulfilled: l.fulfilled,
      returned: (l.returned || 0) + cnQty((n) => n.so === so.id && n.type === "Return" && !n.reopen, l.sku),
      invoiced, draft: sum((i) => i.status === "Draft"),
      invoiceable: SO_INVOICEABLE.includes(so.status) ? Math.max(0, Math.min(cap, l.qty) - invoiced) : 0,
      toDeliver: open ? Math.max(0, l.qty - l.fulfilled) : 0,
      backorder: open ? Math.max(0, l.qty - l.fulfilled - l.reserved) : 0,
    };
  };
  const soChargesUsed = (so: SalesOrder, exclude?: string) =>
    new Set(soInvoices(so, exclude).flatMap((i) => i.charges.filter((c) => c.soCharge != null).map((c) => c.soCharge as number)));
  const soTotal = (so: SalesOrder) => (so.total != null ? so.total : docTotals(so).total);
  /** Order, fulfilment, invoicing and payment progress are tracked independently. */
  const soProgress = (so: SalesOrder): OrderProgress => {
    const rows = so.lines.map((l) => soLine(so, l));
    const cancelled = so.status === "Cancelled";
    const anyFul = rows.some((r) => r.fulfilled > 0); const allFul = so.lines.every((l) => l.fulfilled >= l.qty);
    const anyInv = rows.some((r) => r.invoiced > 0); const allInv = rows.every((r) => r.invoiced >= r.ordered);
    const issued = S().invoices.filter((i) => i.so === so.id && i.status === "Issued");
    const billed = issued.reduce((a, i) => a + i.total - i.credited, 0); const paid = issued.reduce((a, i) => a + i.paid, 0);
    const used = soChargesUsed(so);
    const uninvoiced = cancelled ? 0
      : so.lines.reduce((a, l, k) => a + lineCalc(l, Math.max(0, l.qty - rows[k].invoiced)).total, 0) + (so.charges || []).reduce((a, c, k) => a + (used.has(k) ? 0 : c.amount), 0);
    return {
      rows, uninvoiced, billed, paid,
      fulfil: allFul ? "Fulfilled" : anyFul ? "Partially fulfilled" : "Not fulfilled",
      invoice: allInv && anyInv ? "Fully invoiced" : anyInv ? "Partially invoiced" : "Not invoiced",
      payment: !issued.length ? "Not billed" : paid >= billed ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid",
      invoiceable: SO_INVOICEABLE.includes(so.status) && (rows.some((r) => r.invoiceable > 0) || (so.charges || []).some((c, k) => !used.has(k))),
    };
  };
  const soEditable = (so: SalesOrder) => {
    if (["Draft", "Pending Approval"].includes(so.status)) return true;
    if (so.status !== "Confirmed") return false;
    return so.lines.every((l) => !l.fulfilled) && !S().dispatches.some((d) => d.so === so.id && d.status !== "Cancelled") && !soInvoices(so).length;
  };
  const invoicePrefill = (soId: string): InvoicePrefill | null => {
    const so = findSO(soId); if (!so) return null;
    const used = soChargesUsed(so);
    return {
      so: so.id, customer: so.customer, wh: so.wh, termsDays: so.termsDays || 0, basis: S().settings.invoiceBasis,
      lines: so.lines.map((l) => ({ ...clone(l), ...soLine(so, l) })),
      charges: (so.charges || []).map((c, k) => ({ label: c.label, amount: c.amount, idx: k, used: used.has(k) })),
    };
  };
  /** Quantities still creditable as returns per invoice line (bounded by what was invoiced and what was delivered). */
  const cnReturnable = (invId: string): ReturnableLine[] => {
    const inv = findInv(invId); if (!inv) return [];
    const so = inv.so ? findSO(inv.so) : undefined;
    return inv.lines.map((il) => {
      const credited = cnQty((n) => n.inv === inv.id, il.sku);
      const sl = so && so.lines.find((x) => x.sku === il.sku);
      const delivered = so && sl ? Math.max(0, sl.fulfilled - cnQty((n) => n.so === so.id && n.type === "Return" && !n.reopen, il.sku)) : 0;
      return { sku: il.sku, name: il.name, unit: il.unit, factor: il.factor, invoiced: il.qty, credited, max: Math.max(0, Math.min(il.qty - credited, delivered)) };
    });
  };
  const history = (ref: string) => S().audit.filter((a) => a.ref === ref || (ref.length > 6 && (a.detail || "").includes(ref)));
  /** Documents linked to `ref` across the chain: estimate → order → invoices → payments / credit notes / deliveries / returns. */
  const related = (ref: string): RelatedDoc[] => {
    const st = S(); const out: RelatedDoc[] = []; const seen = new Set([ref]);
    const add = (type: string, id: string, status: string, amount: number | null, route: RelatedDoc["route"]) => { if (!id || seen.has(id)) return; seen.add(id); out.push({ type, id, status, amount, route }); };
    const addInv = (i: Invoice) => add("Invoice", i.id, invStatus(i), i.total, { name: "invoices", id: i.id });
    const addSO = (o: SalesOrder) => add("Sales order", o.id, o.status, soTotal(o), { name: "sales-orders", id: o.id });
    const addRtn = (r: CustomerReturn) => add("Return", r.id, r.status, null, { name: "dispatch", tab: "returns", id: r.id });
    const addPays = (inv: Invoice) => st.payments.filter((p) => p.alloc.some((a) => a.inv === inv.id)).forEach((p) => add("Payment", p.id, p.status, p.alloc.filter((a) => a.inv === inv.id).reduce((a, x) => a + x.amount, 0), { name: "payments", id: p.id }));
    const addCNs = (pred: (n: CreditNote) => boolean) => st.creditNotes.filter(pred).forEach((n) => add("Credit note", n.id, n.status, n.amount, { name: "credit-notes", id: n.id }));
    const addOrder = (o: SalesOrder) => {
      const e = o.est ? findEst(o.est) : undefined; if (e) add("Estimate", e.id, estStatus(e), e.total, { name: "estimates", id: e.id });
      st.invoices.filter((i) => i.so === o.id).forEach((i) => { addInv(i); addPays(i); });
      st.dispatches.filter((d) => d.so === o.id).forEach((d) => add("Delivery", d.id, d.status, null, { name: "dispatch", id: d.id }));
      addCNs((n) => n.so === o.id);
      st.returns.filter((r) => r.so === o.id).forEach(addRtn);
    };
    const withOrder = (id: string) => { const so = findSO(id); if (so) { addSO(so); addOrder(so); } };
    const e = findEst(ref); const o = findSO(ref); const i = findInv(ref); const p = findPay(ref); const n = findCN(ref);
    if (e && e.so) withOrder(e.so);
    if (o) addOrder(o);
    if (i) { if (i.so) withOrder(i.so); addPays(i); addCNs((x) => x.inv === i.id); }
    if (p) p.alloc.forEach((a) => { const inv = findInv(a.inv); if (inv) { addInv(inv); const so = inv.so ? findSO(inv.so) : undefined; if (so) addSO(so); } });
    if (n) {
      const inv = findInv(n.inv); if (inv) addInv(inv);
      const so = n.so ? findSO(n.so) : undefined; if (so) addSO(so);
      const r = n.rtn ? findRtn(n.rtn) : undefined; if (r) addRtn(r);
    }
    return out;
  };

  // ---------- products & master data
  const LINE_COLLS = ["estimates", "salesOrders", "invoices", "creditNotes", "pos", "receipts", "transfers", "dispatches", "returns", "counts", "supplierInvoices"] as const;
  const docsWithLines = () => LINE_COLLS.flatMap((c) => (S()[c] || []) as { lines?: { sku: string; unit?: string }[] }[]);
  const productUsed = (sku: string) => {
    const st = S();
    return docsWithLines().filter((d) => (d.lines || []).some((l) => l.sku === sku)).length
      + st.adjustments.filter((a: { sku: string }) => a.sku === sku).length + st.movements.filter((m) => m.sku === sku).length
      + Object.values(st.balances).filter((b) => b.sku === sku && (b.sellable || b.reserved || b.damaged || b.quarantined || b.inTransit)).length;
  };

  const productSave = (p: ProductInput, isNew: boolean): Result => {
    if (!can("cat.edit")) return deny();
    const st = S(); const errs: Record<string, string> = {};
    const x = isNew ? undefined : st.products.find((y) => y.sku === p.sku);
    if (!isNew && !x) return fail("Product not found.");
    if (!p.sku || !/^[A-Z0-9-]{4,}$/.test(p.sku)) errs.sku = "Use 4+ characters: capitals, digits and hyphens.";
    if (isNew && st.products.some((y) => y.sku === p.sku)) errs.sku = "SKU already exists.";
    if (!p.name) errs.name = "Product name is required.";
    const br = st.brands.find((b) => b.id === p.brand);
    if (!br || (br.status === "Inactive" && (!x || x.brand !== p.brand))) errs.brand = "Select an active brand.";
    const ca = st.categories.find((c) => c.id === p.category);
    if (!ca || (ca.status === "Inactive" && (!x || x.category !== p.category))) errs.category = "Select an active category.";
    if (!isInt(p.cartonPacks) || p.cartonPacks < 1) errs.cartonPacks = "Must be a whole number of at least 1.";
    if (!isInt(p.packBars) || p.packBars < 1) errs.packBars = "Must be a whole number of at least 1.";
    if (!(p.cost4 > 0)) errs.cost4 = "Enter a purchase cost.";
    if (!(p.price > 0)) errs.price = "Enter a selling price.";
    if (p.price > 0 && p.cost4 > 0 && p.price * 100 < p.cost4) errs.price = "Selling price is below purchase cost.";
    if (!isInt(p.min) || p.min < 0) errs.min = "Reorder level must be zero or more.";
    if (!taxOf(p.tax)) errs.tax = "Select a tax rate.";
    const bu = p.baseUnit || "bar";
    if (!unitDef(bu).base) errs.baseUnit = "Choose a base unit (bar or piece).";
    if (x && (x.baseUnit || "bar") !== bu && productUsed(x.sku)) errs.baseUnit = "The base unit cannot change once the product has stock or transactions.";
    const extra = p.extraUnits || []; const seenU = new Set<string>();
    for (const u of extra) {
      const d = st.units.find((y) => y.code === u.unit);
      if (!d || d.base || ["pk", "ctn"].includes(u.unit)) { errs.extraUnits = "Choose a packaging unit for every extra conversion (packs and cartons are set above)."; break; }
      if (seenU.has(u.unit)) { errs.extraUnits = `${d.name} is listed twice.`; break; }
      if (!isInt(u.factor) || u.factor < 2) { errs.extraUnits = `1 ${d.name.toLowerCase()} must equal at least 2 base units.`; break; }
      seenU.add(u.unit);
    }
    if (p.image && (!p.image.startsWith("data:image/") || p.image.length > 250000)) errs.image = "Use a JPG, PNG or WebP image (it is resized automatically).";
    if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", errs };
    const data = {
      sku: p.sku, name: p.name, brand: p.brand, category: p.category, variant: p.variant || "", size: p.size || "", description: p.description || "", image: p.image || "",
      cartonPacks: p.cartonPacks, packBars: p.packBars, baseUnit: bu, extraUnits: extra.map((u) => ({ unit: u.unit, factor: u.factor })),
      cost4: p.cost4, price: p.price, min: p.min, tax: p.tax, barcode: p.barcode || "", batch: !!p.batch, status: p.status === "Discontinued" ? "Discontinued" : "Active",
    };
    if (!x) { st.products.push({ ...data, expiryWarn: 60, priceHistory: [{ date: TODAY, price: p.price, by: E.user().name }] }); log("Created product", p.sku, p.name); }
    else {
      const changes = (["name", "price", "cost4", "status", "tax", "cartonPacks", "packBars"] as const).filter((k) => x[k] !== data[k]);
      if (x.price !== data.price) x.priceHistory = (x.priceHistory || []).concat([{ date: TODAY, price: data.price, by: E.user().name }]);
      Object.assign(x, data); log("Updated product", p.sku, changes.length ? "Changed: " + changes.join(", ") : "Catalogue fields updated");
    }
    E.emit(); return ok(isNew ? "Product created — available on estimates, orders and invoices." : "Product updated. Issued documents keep their original descriptions and prices.", p.sku);
  };
  const productDelete = (sku: string): Result => {
    if (!can("cat.edit")) return deny();
    const st = S(); const p = st.products.find((x) => x.sku === sku); if (!p) return fail("Product not found.");
    const used = productUsed(sku);
    if (used) return fail(`${p.name} is used in ${used} transaction record(s) and cannot be deleted. Mark it Discontinued instead — history is preserved.`);
    st.products = st.products.filter((x) => x.sku !== sku);
    Object.keys(st.balances).forEach((k) => { if (st.balances[k].sku === sku) delete st.balances[k]; });
    log("Deleted product", sku, p.name + " · never used in a transaction");
    E.emit(); return ok("Product deleted.", sku);
  };

  const MASTER: Record<MasterKind, { label: string; perm: string; key: "id" | "code"; used: (id: string) => number }> = {
    categories: { label: "Category", perm: "cat.edit", key: "id", used: (id) => S().products.filter((p) => p.category === id).length },
    brands: { label: "Brand", perm: "cat.edit", key: "id", used: (id) => S().products.filter((p) => p.brand === id).length },
    units: {
      label: "Unit", perm: "cat.edit", key: "code",
      used: (code) => S().products.filter((p) => (p.baseUnit || "bar") === code || (p.extraUnits || []).some((u) => u.unit === code)).length + docsWithLines().filter((d) => (d.lines || []).some((l) => l.unit === code)).length,
    },
    taxes: { label: "Tax rate", perm: "set.manage", key: "id", used: (id) => S().products.filter((p) => p.tax === id).length + (S().settings.defaultTax === id ? 1 : 0) },
  };
  const masterSave = (kind: MasterKind, d: MasterInput, isNew: boolean): Result => {
    const m = MASTER[kind]; if (!m) return fail("Unknown list.");
    if (!can(m.perm)) return deny();
    const st = S(); const errs: Record<string, string> = {};
    const id = str(d[m.key]);
    const list = st[kind] as { id?: string; code?: string }[];
    const x = isNew ? undefined : list.find((y) => y[m.key] === id);
    if (!isNew && !x) return fail(m.label + " not found.");
    if (kind === "units") {
      if (!/^[a-z]{1,6}$/.test(id)) errs.code = 'Use 1–6 lowercase letters, e.g. "dz".';
      if (!str(d.name)) errs.name = "Name is required.";
      if (!str(d.plural)) errs.plural = "Plural is required.";
    } else if (kind === "taxes") {
      if (!/^[A-Z0-9]{2,10}$/.test(id)) errs.id = 'Use 2–10 capitals or digits, e.g. "VAT15".';
      if (!str(d.name)) errs.name = "Name is required.";
      if (!isInt(d.rate) || d.rate < 0 || d.rate > 10000) errs.rate = "Enter a rate between 0 and 100% (up to 2 decimals).";
    } else {
      if (id.length < 2) errs.id = "Name must be at least 2 characters.";
      if (kind === "brands" && d.supplier && !st.suppliers.some((s) => s.id === d.supplier)) errs.supplier = "Unknown supplier.";
    }
    if (isNew && list.some((y) => String(y[m.key]).toLowerCase() === id.toLowerCase())) errs[m.key] = m.label + " already exists.";
    if (d.status === "Inactive" && kind === "taxes" && st.settings.defaultTax === id) errs.status = "The default tax rate cannot be deactivated.";
    if (d.status === "Inactive" && kind === "units" && BUILTIN_UNITS.includes(id)) errs.status = "Built-in units cannot be deactivated.";
    if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", errs };
    const status = d.status === "Inactive" ? "Inactive" : "Active";
    if (kind === "units") {
      const u = x as Unit | undefined; const data: Unit = { code: id, name: str(d.name), plural: str(d.plural), base: u ? u.base : false, status };
      if (u) Object.assign(u, data); else st.units.push(data);
    } else if (kind === "taxes") {
      const t = x as TaxRate | undefined; const data: TaxRate = { id, name: str(d.name), rate: d.rate as number, status };
      if (t && t.rate !== data.rate) log("Changed tax rate", id, t.rate / 100 + "% → " + data.rate / 100 + "% · applies to new documents only");
      if (t) Object.assign(t, data); else st.taxes.push(data);
    } else if (kind === "brands") {
      const data: Brand = { id, tag: str(d.tag), supplier: d.supplier || "", description: str(d.description), status };
      if (x) Object.assign(x, data); else st.brands.push(data);
    } else {
      const data: Category = { id, description: str(d.description), status };
      if (x) Object.assign(x, data); else st.categories.push(data);
    }
    log((isNew ? "Created " : "Updated ") + m.label.toLowerCase(), id, status);
    E.emit(); return ok(m.label + (isNew ? " created." : " updated."), id);
  };
  const masterDelete = (kind: MasterKind, id: string): Result => {
    const m = MASTER[kind]; if (!m) return fail("Unknown list.");
    if (!can(m.perm)) return deny();
    if (kind === "units" && BUILTIN_UNITS.includes(id)) return fail("Built-in units cannot be deleted.");
    const used = m.used(id);
    if (used) return fail(`${m.label} "${id}" is in use (${used} record(s)). Set it Inactive instead.`);
    const st = S();
    if (kind === "units") st.units = st.units.filter((y) => y.code !== id);
    else if (kind === "taxes") st.taxes = st.taxes.filter((y) => y.id !== id);
    else if (kind === "brands") st.brands = st.brands.filter((y) => y.id !== id);
    else st.categories = st.categories.filter((y) => y.id !== id);
    log("Deleted " + m.label.toLowerCase(), id, ""); E.emit(); return ok(m.label + " deleted.", id);
  };

  // ---------- customers
  const customerSave = (d: CustomerInput): Result => {
    if (!can("cus.edit")) return deny();
    const st = S(); const errs: Record<string, string> = {};
    const x = d.id ? st.customers.find((c) => c.id === d.id) : undefined;
    if (d.id && !x) return fail("Customer not found.");
    const name = str(d.name);
    if (name.length < 2) errs.name = "Customer name is required.";
    else if (st.customers.some((c) => c.id !== d.id && c.name.toLowerCase() === name.toLowerCase())) errs.name = "A customer with this name already exists.";
    if (!d.type) errs.type = "Select a customer type.";
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errs.email = "Enter a valid email address.";
    if (!isInt(d.terms) || d.terms < 0 || d.terms > 365) errs.terms = "Payment terms must be 0–365 days.";
    if (!isInt(d.limit) || d.limit < 0) errs.limit = "Credit limit cannot be negative.";
    else if (d.terms > 0 && d.limit === 0) errs.limit = "Set a credit limit to offer credit terms (or use 0 days for cash).";
    if (d.tin && !/^[A-Z0-9-]{6,20}$/i.test(d.tin)) errs.tin = "Use 6–20 letters, digits or hyphens.";
    if (x && x.id === WALKIN && d.status === "Inactive") errs.status = "The walk-in account cannot be deactivated.";
    if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", errs };
    const data = {
      name, type: d.type, contact: str(d.contact) || "—", phone: str(d.phone), email: str(d.email), address: str(d.address), delivAddr: str(d.delivAddr),
      city: str(d.city), tin: str(d.tin).toUpperCase(), terms: d.terms, limit: d.limit, status: d.status === "Inactive" ? "Inactive" : "Active",
    };
    let id: string;
    if (x) { Object.assign(x, data); id = x.id; log("Updated customer", id, name); }
    else {
      let n = st.seq.CUS || 0;
      do { n++; id = "CUS-" + pad(n, 3); } while (st.customers.some((c) => c.id === id));
      st.seq.CUS = n; st.customers.push({ id, since: TODAY, ...data }); log("Created customer", id, name + " · " + d.type);
    }
    E.emit(); return ok(x ? "Customer updated." : "Customer created.", id, { id });
  };
  const custCheck = (id: string) => {
    const c = S().customers.find((x) => x.id === id);
    if (!c) return "Select a customer.";
    if (c.status === "Inactive") return `${c.name} is inactive. Reactivate the customer first.`;
    return null;
  };

  // ---------- estimates
  const estimateSave = (d: EstimateInput): Result => {
    if (!can("est.create")) return deny();
    const x = d.id ? findEst(d.id) : undefined;
    if (d.id && !x) return fail("Estimate not found.");
    if (x && !["Draft", "Sent"].includes(estStatus(x))) return fail(`${x.id} is ${estStatus(x).toLowerCase()} and can no longer be edited. Duplicate it instead.`);
    const ce = custCheck(d.customer); if (ce) return fail(ce);
    if (d.wh) { const wd = whDeny(d.wh); if (wd) return wd; }
    const date = x ? x.date : TODAY;
    if (!d.expiry || d.expiry < date) return fail("Valid-until date must be on or after the estimate date.");
    if (d.expiry < TODAY) return fail("Valid-until date is in the past.");
    const r = mkLines(d.lines, x && x.lines); if (r.error !== undefined) return fail(r.error);
    const ch = mkCharges(d.charges); if (ch.error !== undefined) return fail(ch.error);
    const data = stamp({ customer: d.customer, party: party(d.customer), wh: d.wh || "", expiry: d.expiry, ref: str(d.ref), notes: str(d.notes), terms: str(d.terms), lines: r.lines, charges: ch.charges });
    let e = x;
    if (e) { Object.assign(e, data); log("Revised estimate", e.id, money(e.total) + " · " + e.lines.length + " line(s)"); }
    else { e = { id: nextRef("EST"), date, status: "Draft", by: me(), ...data }; S().estimates.unshift(e); log("Created estimate", e.id, cust(e.customer).name + " · " + money(e.total)); }
    E.emit(); return ok(x ? "Estimate updated." : "Estimate saved as draft.", e.id, { id: e.id });
  };
  const estimateAct = (id: string, action: string, data?: string): Result => {
    const e = findEst(id); if (!e) return fail("Estimate not found.");
    if (!can("est.create")) return deny();
    const cur = estStatus(e);
    const done = (msg: string, what: string) => { log(what, id, data || ""); E.emit(); return ok(msg, id); };
    if (action === "send") {
      if (!["Draft", "Sent"].includes(cur)) return fail(`A ${cur.toLowerCase()} estimate cannot be sent.`);
      e.status = "Sent"; e.sentAt = clock(); e.sentTo = data || e.party.email; return done("Estimate marked as sent to the customer.", "Sent estimate to customer");
    }
    if (action === "accept") {
      if (cur === "Expired") return fail("This estimate has expired. Duplicate it to quote again at current terms.");
      if (!["Draft", "Sent"].includes(cur)) return fail(`A ${cur.toLowerCase()} estimate cannot be accepted.`);
      e.status = "Accepted"; e.acceptedAt = clock(); e.decidedBy = me(); return done("Estimate accepted — it can now be converted into a sales order.", "Customer accepted estimate");
    }
    if (action === "reject") {
      if (!["Draft", "Sent", "Expired"].includes(cur)) return fail(`A ${cur.toLowerCase()} estimate cannot be rejected.`);
      if (!data) return fail("Record why the customer rejected the estimate.");
      e.status = "Rejected"; e.reason = data; e.decidedBy = me(); return done("Estimate marked as rejected.", "Customer rejected estimate");
    }
    if (action === "expire") {
      if (!["Draft", "Sent", "Expired"].includes(cur) || e.status === "Expired") return fail("Only open estimates can be expired.");
      e.status = "Expired"; return done("Estimate marked as expired.", "Expired estimate");
    }
    if (action === "cancel") {
      if (["Converted", "Cancelled"].includes(cur)) return fail(`A ${cur.toLowerCase()} estimate cannot be cancelled.`);
      if (!data) return fail("A cancellation reason is required.");
      e.status = "Cancelled"; e.reason = data; return done("Estimate cancelled.", "Cancelled estimate");
    }
    if (action === "duplicate") {
      const n: Estimate = { ...clone(e), id: nextRef("EST"), date: TODAY, expiry: addDays(TODAY, S().settings.estimateValidityDays || 30), status: "Draft", by: me(), party: party(e.customer), copyOf: e.id };
      (["sentAt", "sentTo", "acceptedAt", "convertedAt", "decidedBy", "reason", "so"] as const).forEach((k) => delete n[k]);
      S().estimates.unshift(n); log("Duplicated estimate", n.id, "from " + e.id); E.emit(); return ok("Copy created as a new draft.", n.id, { id: n.id });
    }
    return fail("Unknown action.");
  };

  // ---------- sales orders
  const reserve = (so: SalesOrder): { error: string } | { short: number; error?: undefined } => {
    if (!S().settings.allowBackorders)
      for (const l of so.lines) {
        const need = l.qty - l.fulfilled - l.reserved;
        if (need > 0 && avail(so.wh, l.sku) < need) return { error: `Only ${qty(l.sku, avail(so.wh, l.sku))} of ${prod(l.sku).name} is available at ${wh(so.wh).name}. Reservation would over-allocate stock — backorders are disabled in Settings.` };
      }
    let short = 0;
    so.lines.forEach((l) => {
      const need = l.qty - l.fulfilled - l.reserved; if (need <= 0) return;
      const take = Math.min(need, avail(so.wh, l.sku));
      if (take > 0) { bal(so.wh, l.sku).reserved += take; l.reserved += take; }
      short += need - take;
    });
    return { short };
  };
  const release = (so: SalesOrder) => so.lines.forEach((l) => { if (l.reserved > 0) { const b = bal(so.wh, l.sku); b.reserved = Math.max(0, b.reserved - l.reserved); l.reserved = 0; } });
  const approvalReasons = (so: SalesOrder) => {
    const reasons: string[] = []; const st = S();
    const maxD = Math.max(0, ...so.lines.map(effDisc));
    if (maxD > st.settings.maxDiscountPct && !can("so.approve")) reasons.push(`discount ${maxD}% (incl. price changes) exceeds the ${st.settings.maxDiscountPct}% limit`);
    if (so.terms === "Credit" && st.settings.creditCheck && custBalance(so.customer) + soTotal(so) > cust(so.customer).limit) reasons.push("exceeds customer credit limit");
    return reasons;
  };
  type Confirmed = { error: string } | { msg: string; error?: undefined };
  /** Decide Pending Approval vs Confirmed (+ reservation). Mutates `so` only on success. */
  const confirmSO = (so: SalesOrder): Confirmed => {
    const reasons = approvalReasons(so);
    if (reasons.length) { so.status = "Pending Approval"; so.approvalReason = reasons.join("; "); return { msg: "Order needs approval: " + so.approvalReason + ". Stock is reserved once approved." }; }
    const r = reserve(so); if (r.error !== undefined) return r;
    so.status = "Confirmed"; delete so.approvalReason;
    return { msg: r.short ? "Order confirmed. Available stock reserved; the rest is on backorder until stock arrives." : "Order confirmed and available stock reserved. Physical stock is unchanged until dispatch." };
  };
  /** Confirm without approval checks — for orders that fulfil an invoice already authorised and issued. */
  const reserveOnly = (so: SalesOrder): Confirmed => { const r = reserve(so); if (r.error !== undefined) return r; so.status = "Confirmed"; return { msg: "Fulfilment order confirmed and stock reserved." }; };
  interface Built { lines: DocLine[]; charges: Charge[]; extra?: Partial<SalesOrder>; reserveOnly?: boolean }
  const saveSO = (d: OrderInput, confirm: boolean, built: Built | null): Result & { so?: SalesOrder } => {
    if (!can("so.create")) return deny();
    const wd = whDeny(d.wh); if (wd) return wd;
    const x = d.id ? findSO(d.id) : undefined;
    if (d.id && !x) return fail("Sales order not found.");
    if (x && !soEditable(x)) return fail(`${x.id} is ${x.status.toLowerCase()} and can no longer be edited.`);
    const ce = custCheck(d.customer); if (ce) return fail(ce);
    const c = cust(d.customer);
    if (d.customer === WALKIN && !str(d.walkin)) return fail("Enter the walk-in customer name and phone.");
    if (!["Collection", "Delivery"].includes(d.method)) return fail("Choose collection or delivery.");
    if (d.method === "Delivery" && !str(d.address)) return fail("Delivery address is required for delivery orders.");
    if (!["Cash", "Credit"].includes(d.terms)) return fail("Choose cash or credit terms.");
    if (d.terms === "Credit" && c.limit === 0) return fail(`${c.name} has no credit facility. Use cash terms.`);
    const date = x ? x.date : TODAY;
    if (d.expected && d.expected < date) return fail("Expected delivery date cannot be before the order date.");
    let lines: DocLine[]; let charges: Charge[];
    if (built) { lines = built.lines; charges = built.charges; }
    else {
      const r = mkLines(d.lines, x && x.lines); if (r.error !== undefined) return fail(r.error);
      const ch = mkCharges(d.charges); if (ch.error !== undefined) return fail(ch.error);
      lines = r.lines; charges = ch.charges;
    }
    const base = x ? clone(x) : ({ id: "", date, status: "Draft", by: me() } as SalesOrder);
    const draft = stamp(Object.assign(base, {
      customer: d.customer, walkin: str(d.walkin), party: party(d.customer), wh: d.wh, method: d.method, terms: d.terms, termsDays: d.terms === "Cash" ? 0 : c.terms,
      address: str(d.address), expected: d.expected || "", ref: str(d.ref), notes: str(d.notes),
      lines: lines.map((l): OrderLine => ({ ...l, fulfilled: 0, reserved: 0, returned: 0 })), charges,
    }, built && built.extra));
    // Editing a confirmed order: release its reservation, then confirm again (restored if stock is short).
    const wasConfirmed = !!x && x.status === "Confirmed";
    if (x && wasConfirmed) release(x);
    let msg = "Draft saved. No stock reserved.";
    if (confirm || wasConfirmed) {
      const r = built && built.reserveOnly ? reserveOnly(draft) : confirmSO(draft);
      if (r.error !== undefined) { if (x && wasConfirmed) reserve(x); return fail(r.error); }
      msg = r.msg;
    } else draft.status = "Draft";
    let so: SalesOrder;
    if (x) { Object.assign(x, draft); so = x; log("Edited sales order", so.id, so.status + " · " + money(so.total)); }
    else {
      so = Object.assign(draft, { id: nextRef("SO") }); S().salesOrders.unshift(so);
      log("Created sales order", so.id, so.status + " · " + money(so.total) + (so.est ? " · from " + so.est : "") + (so.inv ? " · fulfils " + so.inv : ""));
    }
    return { ...ok(msg, so.id, { id: so.id }), so };
  };
  const soSave = (d: OrderInput, confirm?: boolean): Result => { const r = saveSO(d, !!confirm, null); if (r.ok) E.emit(); return r; };
  const estimateConvert = (estId: string, d: OrderInput, confirm?: boolean): Result => {
    const e = findEst(estId); if (!e) return fail("Estimate not found.");
    if (!can("so.create")) return deny();
    if (e.status === "Converted") return fail(`${e.id} was already converted to ${e.so}. Duplicate conversion blocked.`);
    if (estStatus(e) !== "Accepted") return fail("Only accepted estimates can be converted into sales orders.");
    // The customer, products, quantities, prices, discounts and tax rates are carried over exactly as quoted.
    const r = saveSO({ ...d, id: "", customer: e.customer }, !!confirm, { lines: clone(e.lines), charges: clone(e.charges || []), extra: { est: e.id, ref: d.ref || e.ref || "" } });
    if (!r.ok) return r;
    e.status = "Converted"; e.so = r.ref; e.convertedAt = clock();
    log("Converted estimate to sales order", e.id, e.id + " → " + r.ref);
    E.emit(); return r;
  };
  const soAct = (id: string, action: string, reason?: string): Result => {
    const so = findSO(id); if (!so) return fail("Sales order not found.");
    if (action === "confirm") {
      if (!can("so.create")) return deny(); const wd = whDeny(so.wh); if (wd) return wd;
      if (so.status !== "Draft") return fail("Only draft orders can be confirmed.");
      const ce = custCheck(so.customer); if (ce) return fail(ce);
      const r = confirmSO(so); if (r.error !== undefined) return fail(r.error);
      log((so.status as string) === "Confirmed" ? "Confirmed sales order" : "Submitted sales order for approval", id, so.approvalReason || "Stock reserved"); E.emit(); return ok(r.msg, id);
    }
    if (action === "approve") {
      if (!can("so.approve")) return deny(); if (so.status !== "Pending Approval") return fail("Only orders pending approval can be approved.");
      const r = reserve(so); if (r.error !== undefined) return fail(r.error);
      so.status = "Confirmed"; so.approvedBy = me(); log("Approved sales order", id, so.approvalReason || ""); E.emit(); return ok("Approved, confirmed and stock reserved.", id);
    }
    if (action === "reject") {
      if (!can("so.approve")) return deny(); if (so.status !== "Pending Approval") return fail("Only orders pending approval can be rejected.");
      if (!reason) return fail("A reason is required.");
      so.status = "Cancelled"; so.cancelReason = reason; log("Rejected sales order", id, reason); E.emit(); return ok("Order rejected.", id);
    }
    if (action === "cancel") {
      if (so.status === "Draft" ? !(can("so.create") || can("doc.cancel")) : !(can("doc.cancel") || can("so.approve"))) return deny("Cancelling confirmed orders requires cancel authority.");
      if (["Dispatched", "Delivered", "Completed", "Cancelled"].includes(so.status)) return fail("This order can no longer be cancelled. Use a return or credit note.");
      if (!reason) return fail("A cancellation reason is required.");
      const drafts = soInvoices(so).filter((i) => i.status === "Draft");
      if (drafts.length) return fail(`Cancel the draft invoice(s) ${drafts.map((i) => i.id).join(", ")} first.`);
      const over = so.lines.filter((l) => soLine(so, l).invoiced > l.fulfilled);
      if (over.length) return fail(`Goods not yet delivered have been invoiced (${over.map((l) => l.sku).join(", ")}). Void the invoice or raise a credit note before cancelling.`);
      release(so); so.status = "Cancelled"; so.cancelReason = reason; so.cancelledBy = me();
      S().dispatches.filter((dd) => dd.so === id && !dd.deducted).forEach((dd) => { dd.status = "Cancelled"; });
      log("Cancelled sales order", id, reason); E.emit(); return ok("Order cancelled. Reservations released back to available stock.", id);
    }
    return fail("Unknown action.");
  };

  // ---------- invoices
  const issueCheck = (inv: Invoice) => {
    if (!(inv.total > 0)) return "Invoice total must be above zero.";
    if (!inv.so) {
      const maxD = Math.max(0, ...inv.lines.map(effDisc));
      if (maxD > S().settings.maxDiscountPct && !can("so.approve")) return `Discount ${maxD}% (incl. price changes) exceeds the ${S().settings.maxDiscountPct}% limit — an authorised manager must issue this invoice.`;
    }
    return null;
  };
  const issueNow = (inv: Invoice) => {
    inv.status = "Issued"; inv.issuedBy = me(); inv.issuedAt = clock();
    day(inv.wh).rev += inv.total - inv.tax;
    log("Issued invoice", inv.id, cust(inv.customer).name + " · " + money(inv.total) + (inv.so ? " · " + inv.so : " · direct"));
  };
  const soLineCopy = (l: DocLine, q: number): DocLine => ({ sku: l.sku, name: l.name, desc: l.desc || "", unit: l.unit, factor: l.factor, uqty: q / l.factor, qty: q, uprice: l.uprice, discPct: l.discPct, taxCode: l.taxCode, taxRate: l.taxRate });
  const invoiceSave = (d: InvoiceInput, issue?: boolean): Result => {
    if (!can("sinv.create")) return deny();
    if (issue && !can("sinv.issue")) return deny("Issuing invoices requires finance authorisation.");
    const st = S();
    const x = d.id ? findInv(d.id) : undefined;
    if (d.id && !x) return fail("Invoice not found.");
    if (x && x.status !== "Draft") return fail(`${x.id} is ${x.status.toLowerCase()} — issued invoices cannot be edited. Use a credit note, or void it.`);
    const date = d.date || TODAY;
    if (date > TODAY) return fail("Invoice date cannot be in the future.");
    const termsDays = Number(d.termsDays);
    if (!isInt(termsDays) || termsDays < 0 || termsDays > 365) return fail("Payment terms must be 0–365 days.");
    const soId = x ? x.so : d.so;
    let so: SalesOrder | undefined; let lines: DocLine[] = []; let charges: Charge[] = []; let customer: string; let whId: string;
    if (soId) {
      so = findSO(soId);
      if (!so) return fail("Sales order not found.");
      if (!SO_INVOICEABLE.includes(so.status)) return fail(`${so.id} is ${so.status.toLowerCase()} — only confirmed orders can be invoiced.`);
      const wd = whDeny(so.wh); if (wd) return wd;
      customer = so.customer; whId = so.wh;
      for (const r of (d.lines || []) as { sku: string; qty: number }[]) {
        const q = Number(r.qty); if (!q) continue;
        const l = so.lines.find((y) => y.sku === r.sku);
        if (!l) return fail(`${r.sku} is not on ${so.id}.`);
        if (!isInt(q) || q < 0) return fail(`${l.name}: enter a whole quantity of ${unitDef(prod(l.sku).baseUnit || "bar").plural}.`);
        const row = soLine(so, l, x && x.id);
        if (q > row.invoiceable) return fail(`${l.name}: only ${qty(l.sku, row.invoiceable)} can still be invoiced (ordered ${qty(l.sku, l.qty)}, already invoiced ${qty(l.sku, row.invoiced)}${st.settings.invoiceBasis === "delivered" ? ", delivered " + qty(l.sku, l.fulfilled) : ""}). Duplicate invoicing is blocked.`);
        lines.push(soLineCopy(l, q));
      }
      const used = soChargesUsed(so, x && x.id);
      for (const k of d.soCharges || []) {
        const c = (so.charges || [])[k]; if (!c) return fail("Unknown order charge.");
        if (used.has(k)) return fail(`Charge "${c.label}" has already been invoiced.`);
        charges.push({ label: c.label, amount: c.amount, soCharge: k });
      }
      if (!lines.length && !charges.length) return fail("Enter a quantity to invoice on at least one line.");
    } else {
      const ce = custCheck(d.customer || ""); if (ce) return fail(ce);
      if (!d.wh) return fail("Select the warehouse the sale is booked to.");
      const wd = whDeny(d.wh); if (wd) return wd;
      customer = d.customer as string; whId = d.wh;
      const r = mkLines(d.lines as LineInput[], x && x.lines); if (r.error !== undefined) return fail(r.error); lines = r.lines;
    }
    const ex = mkCharges(d.charges); if (ex.error !== undefined) return fail(ex.error);
    charges = charges.concat(ex.charges);
    const base: Invoice = x ? clone(x) : ({ id: "", status: "Draft", kind: so ? "SO" : "Direct", so: so ? so.id : "", paid: 0, credited: 0, by: me(), created: clock() } as Invoice);
    const next = stamp(Object.assign(base, { customer, wh: whId, party: party(customer), date, termsDays, due: addDays(date, termsDays), ref: str(d.ref), notes: str(d.notes), lines, charges }));
    if (issue) { const e = issueCheck(next); if (e) return fail(e); }
    let inv: Invoice;
    if (x) { Object.assign(x, next); inv = x; log("Edited draft invoice", inv.id, money(inv.total)); }
    else {
      inv = Object.assign(next, { id: nextRef("INV") }); st.invoices.unshift(inv);
      log(so ? "Converted sales order to invoice" : "Created direct invoice", inv.id, (so ? so.id + " → " + inv.id + " · " : "") + money(inv.total) + " · " + lines.length + " line(s)");
    }
    if (issue) issueNow(inv);
    E.emit();
    return ok(issue ? "Invoice issued. It can no longer be edited — corrections go through credit notes." : "Draft invoice saved. Its quantities are held against the order until it is issued or cancelled.", inv.id, { id: inv.id });
  };
  const invoiceAct = (id: string, action: string, data?: string | FulfilInput): Result => {
    const inv = findInv(id); if (!inv) return fail("Invoice not found.");
    const reason = typeof data === "string" ? data : "";
    if (action === "issue") {
      if (!can("sinv.issue")) return deny("Issuing invoices requires finance authorisation.");
      if (inv.status !== "Draft") return fail(inv.status === "Issued" ? `${id} is already issued. Duplicate issue blocked.` : "Only draft invoices can be issued.");
      if (inv.so) {
        const so = findSO(inv.so);
        if (!so || !SO_INVOICEABLE.includes(so.status)) return fail(`${inv.so} is no longer open for invoicing. Cancel this draft.`);
        for (const l of inv.lines) {
          const sl = so.lines.find((y) => y.sku === l.sku); if (!sl) return fail(`${l.sku} is no longer on ${so.id}.`);
          const row = soLine(so, sl, inv.id);
          if (l.qty > row.invoiceable) return fail(`${l.name}: only ${qty(l.sku, row.invoiceable)} remains invoiceable on ${so.id}.`);
        }
      }
      const e = issueCheck(inv); if (e) return fail(e);
      issueNow(inv); E.emit(); return ok("Invoice issued.", id);
    }
    if (action === "cancel") {
      if (!can("sinv.create") && !can("doc.cancel")) return deny();
      if (inv.status !== "Draft") return fail("Only draft invoices can be cancelled. Void issued invoices, or raise a credit note.");
      if (!reason) return fail("A cancellation reason is required.");
      inv.status = "Cancelled"; inv.reason = reason; inv.cancelledBy = me(); inv.cancelledAt = clock();
      log("Cancelled draft invoice", id, reason); E.emit(); return ok("Draft invoice cancelled; its quantities are released back to the order.", id);
    }
    if (action === "void") {
      if (!can("doc.cancel")) return deny("Voiding invoices requires cancel authority.");
      if (inv.status !== "Issued") return fail("Only issued invoices can be voided.");
      if (inv.paid > 0) return fail(`${id} has ${money(inv.paid)} of payments allocated. Reverse those payments first, or raise a credit note.`);
      if (inv.credited > 0) return fail(`${id} already has credit notes — it can no longer be voided.`);
      if (!reason) return fail("A reason is required to void an invoice.");
      inv.status = "Void"; inv.reason = reason; inv.voidedBy = me(); inv.voidedAt = clock();
      day(inv.wh).rev -= inv.total - inv.tax;
      log("Voided invoice", id, reason + " · " + money(inv.total)); E.emit(); return ok("Invoice voided. The number is kept on record; order quantities are released.", id);
    }
    if (action === "send") {
      if (!(can("sinv.create") || can("sinv.issue") || can("fin.record"))) return deny();
      if (inv.status !== "Issued") return fail("Issue the invoice before sending it to the customer.");
      inv.sentAt = clock(); inv.sentTo = reason || inv.party.email;
      log("Sent invoice to customer", id, inv.sentTo || "no email on file"); E.emit(); return ok("Invoice marked as sent.", id);
    }
    if (action === "fulfil") {
      // A direct invoice bills goods without moving stock; the goods leave through a sales order and the dispatch workflow.
      if (!can("so.create")) return deny();
      if (inv.kind !== "Direct" || inv.status !== "Issued") return fail("Only issued direct invoices need a fulfilment order.");
      if (inv.so) return fail(`${id} is already linked to ${inv.so}.`);
      const o: FulfilInput = typeof data === "object" && data ? data : {};
      const credit = inv.termsDays > 0 && cust(inv.customer).limit > 0;
      const r = saveSO(
        { customer: inv.customer, wh: o.wh || inv.wh, method: o.method || "Collection", terms: credit ? "Credit" : "Cash", address: o.address || inv.party.delivAddr, expected: o.expected || "", notes: "Fulfilment of direct invoice " + id, walkin: inv.customer === WALKIN ? inv.party.name : "" },
        true, { lines: clone(inv.lines), charges: [], reserveOnly: true, extra: { inv: id, termsDays: inv.termsDays } },
      );
      if (!r.ok || !r.so) return r;
      inv.so = r.so.id;
      log("Created fulfilment order for invoice", id, id + " → " + r.so.id); E.emit();
      return ok("Fulfilment order created and stock reserved. Goods leave through dispatch.", r.so.id, { id: r.so.id });
    }
    return fail("Unknown action.");
  };

  // ---------- payments & receipts
  const paymentRecord = (d: PaymentInput): Result => {
    if (!can("fin.record")) return deny();
    const st = S(); const errs: Record<string, string> = {};
    if (!st.customers.some((x) => x.id === d.customer)) errs.customer = "Select a customer.";
    if (!isInt(d.amount) || !(d.amount > 0)) errs.amount = "Enter an amount greater than zero.";
    if (!d.date) errs.date = "Enter the date received."; else if (d.date > TODAY) errs.date = "Payment date cannot be in the future.";
    if (!d.method || !st.settings.paymentMethods.includes(d.method)) errs.method = "Select a payment method.";
    const extRef = str(d.extRef);
    if (d.method && d.method !== "Cash" && !extRef) errs.extRef = "Transaction reference is required for non-cash payments.";
    const dup = extRef ? st.payments.find((p) => p.extRef && p.extRef.toLowerCase() === extRef.toLowerCase() && p.status !== "Reversed") : undefined;
    if (dup) errs.extRef = `This reference is already recorded (${dup.id}). Duplicate payments are blocked.`;
    const receivedBy = d.receivedBy || me();
    if (!st.users.some((u) => u.id === receivedBy)) errs.receivedBy = "Select who received the payment.";
    const alloc = (d.alloc || []).filter((a) => a.amount); const seen = new Set<string>();
    for (const a of alloc) {
      const i = findInv(a.inv);
      if (!i || i.customer !== d.customer) { errs.alloc = `Invoice ${a.inv} does not belong to this customer.`; break; }
      if (i.status !== "Issued") { errs.alloc = `${i.id} is ${i.status.toLowerCase()} — payments can only be allocated to issued invoices.`; break; }
      if (seen.has(a.inv)) { errs.alloc = `${a.inv} is allocated twice.`; break; }
      seen.add(a.inv);
      if (!isInt(a.amount) || a.amount < 0) { errs.alloc = "Allocations must be positive amounts."; break; }
      if (a.amount > invBal(i)) { errs.alloc = `Allocation to ${i.id} exceeds its balance (${money(invBal(i))}). Overpayment blocked.`; break; }
    }
    const allocSum = alloc.reduce((a, x) => a + x.amount, 0);
    if (!errs.amount && allocSum > d.amount) errs.alloc = "Allocated total exceeds the payment amount.";
    if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", errs };
    const p: Payment = {
      id: nextRef("PAY"), rct: nextRef("RCT"), customer: d.customer, date: d.date, amount: d.amount, method: d.method, extRef, receivedBy, by: me(), alloc: [],
      status: "Recorded", notes: str(d.notes), evidence: d.evidence || "", unallocated: d.amount - allocSum, at: clock(),
    };
    alloc.forEach((a) => { const i = findInv(a.inv) as Invoice; i.paid += a.amount; p.alloc.push({ inv: a.inv, amount: a.amount, balAfter: invBal(i) }); });
    st.payments.unshift(p);
    log("Recorded customer payment", p.id, money(p.amount) + " · " + p.method + " · receipt " + p.rct + (p.alloc.length ? " · " + p.alloc.map((a) => a.inv).join(", ") : " · on account"));
    E.emit(); return ok(`Payment recorded; receipt ${p.rct} generated. Status is Recorded until verified against the statement.`, p.id, { id: p.id });
  };
  const paymentAllocate = (id: string, alloc: { inv: string; amount: number }[]): Result => {
    if (!can("fin.record")) return deny();
    const p = findPay(id); if (!p) return fail("Payment not found.");
    if (p.status === "Reversed") return fail("Reversed payments cannot be allocated.");
    const rows = (alloc || []).filter((a) => a.amount);
    if (!rows.length) return fail("Enter an amount to allocate.");
    let sum = 0;
    for (const a of rows) {
      const i = findInv(a.inv);
      if (!i || i.customer !== p.customer || i.status !== "Issued") return fail(`${a.inv} is not an issued invoice of this customer.`);
      if (!isInt(a.amount) || a.amount < 0 || a.amount > invBal(i)) return fail(`Allocation to ${a.inv} exceeds its balance (${money(invBal(i))}).`);
      if (rows.filter((y) => y.inv === a.inv).length > 1) return fail(`${a.inv} is allocated twice.`);
      sum += a.amount;
    }
    if (sum > (p.unallocated || 0)) return fail(`Only ${money(p.unallocated || 0)} of ${p.id} is unallocated.`);
    rows.forEach((a) => {
      const i = findInv(a.inv) as Invoice; i.paid += a.amount;
      const ex = p.alloc.find((y) => y.inv === a.inv);
      if (ex) { ex.amount += a.amount; ex.balAfter = invBal(i); } else p.alloc.push({ inv: a.inv, amount: a.amount, balAfter: invBal(i) });
    });
    p.unallocated -= sum;
    log("Allocated on-account payment", id, rows.map((a) => a.inv + " " + money(a.amount)).join(", ")); E.emit(); return ok("On-account amount allocated.", id);
  };
  const paymentAct = (id: string, action: string, reason?: string): Result => {
    const p = findPay(id); if (!p) return fail("Payment not found.");
    if (action === "verify") {
      if (!can("fin.verify")) return deny();
      if (p.status !== "Recorded") return fail("Only recorded payments can be verified.");
      p.status = "Verified"; p.verifiedBy = me(); log("Verified payment", id, "Matched to statement"); E.emit(); return ok("Payment verified.", id);
    }
    if (action === "reverse") {
      if (!can("fin.reverse")) return deny("Reversing payments requires finance authority.");
      if (p.status === "Reversed") return fail("Already reversed — duplicate reversal blocked.");
      if (!reason) return fail("A reversal reason is required.");
      p.alloc.forEach((a) => { const i = findInv(a.inv); if (i) i.paid = Math.max(0, i.paid - a.amount); });
      p.status = "Reversed"; p.reversal = reason; p.reversedBy = me(); p.reversedAt = clock();
      log("Reversed payment", id, reason + " · " + money(p.amount)); E.emit(); return ok("Payment reversed; invoice balances restored. Original record and receipt retained.", id);
    }
    if (action === "send") {
      if (!can("fin.record") && !can("fin.verify")) return deny();
      p.sentAt = clock(); log("Sent payment receipt", p.rct, p.id); E.emit(); return ok("Receipt marked as sent.", id);
    }
    return fail("Unknown action.");
  };

  // ---------- credit notes & customer returns
  const dispatchCost = (soId: string, sku: string): number | null => {
    for (const d of S().dispatches.filter((x) => x.so === soId && x.deducted)) { const l = d.lines.find((y) => y.sku === sku && y.cost4); if (l) return l.cost4; }
    return null;
  };
  type ReturnOpen = Omit<CustomerReturn, "id" | "date" | "by" | "note" | "lines"> & { lines: { sku: string; qty: number; cost4: number | null }[] };
  const openReturn = (r: ReturnOpen): CustomerReturn => {
    const x: CustomerReturn = { ...r, id: nextRef("RTN"), date: TODAY, by: me(), note: "", lines: r.lines.map((l) => ({ sku: l.sku, name: prod(l.sku).name, qty: l.qty, cost4: l.cost4 || bal(r.wh, l.sku).avg, accepted: 0, damaged: 0 })) };
    S().returns.unshift(x);
    log("Opened customer return", x.id, x.source + " · " + (x.cn || x.ref) + " · " + x.lines.length + " line(s) · stock restored only after inspection");
    return x;
  };
  const cnLines = (inv: Invoice, rows: { sku: string; qty: number }[]): CreditLine[] =>
    rows.map((r) => {
      const il = inv.lines.find((y) => y.sku === r.sku) as DocLine; const c = lineCalc(il, r.qty);
      return { ...soLineCopy(il, r.qty), net: c.net, tax: c.tax, total: c.total };
    });
  const creditNoteSave = (d: CreditNoteInput): Result => {
    if (!can("cn.create")) return deny();
    const inv = findInv(d.inv); if (!inv) return fail("Select an invoice.");
    if (inv.status !== "Issued") return fail("Credit notes can only be raised against issued invoices.");
    if (!CN_TYPES.includes(d.type)) return fail("Select the credit note type.");
    const reason = str(d.reason); if (reason.length < 4) return fail("Give a clear reason for the credit note.");
    let lines: CreditLine[] = []; let net: number; let tax: number; let whId = inv.wh; let so: SalesOrder | undefined;
    if (d.type === "Return") {
      so = inv.so ? findSO(inv.so) : undefined;
      if (!so) return fail("Product returns need goods that left through a sales order. Use a price correction or adjustment for this invoice.");
      whId = d.wh || so.wh; const wd = whDeny(whId); if (wd) return wd;
      const lim = cnReturnable(inv.id); const rows: { sku: string; qty: number }[] = [];
      for (const r of d.lines || []) {
        const q = Number(r.qty); if (!q) continue;
        const m = lim.find((y) => y.sku === r.sku); if (!m) return fail(`${r.sku} is not on ${inv.id}.`);
        if (!isInt(q) || q < 0) return fail(`${m.name}: enter a whole quantity.`);
        if (q > m.max) return fail(`${m.name}: at most ${qty(m.sku, m.max)} can be returned (invoiced ${qty(m.sku, m.invoiced)}, already credited ${qty(m.sku, m.credited)}, limited to delivered goods).`);
        rows.push({ sku: r.sku, qty: q });
      }
      if (!rows.length) return fail("Enter a returned quantity on at least one line.");
      lines = cnLines(inv, rows);
      net = lines.reduce((a, l) => a + l.net, 0); tax = lines.reduce((a, l) => a + l.tax, 0);
    } else {
      const amount = Number(d.amount);
      if (!isInt(amount) || amount <= 0) return fail("Enter a credit amount greater than zero.");
      tax = inv.total ? Math.round((amount * inv.tax) / inv.total) : 0; net = amount - tax;
    }
    const amount = net + tax; const creditable = inv.total - inv.credited;
    if (amount > creditable) return fail(`Credit ${money(amount)} exceeds what remains creditable on ${inv.id} (${money(creditable)}).`);
    const cn: CreditNote = { id: nextRef("CN"), inv: inv.id, so: inv.so || "", customer: inv.customer, party: inv.party || party(inv.customer), wh: inv.wh, date: TODAY, type: d.type, reason, lines, net, tax, amount, by: me(), status: "Issued", reopen: false, at: clock() };
    S().creditNotes.unshift(cn);
    inv.credited += amount; day(inv.wh).rev -= net;
    log("Issued credit note", cn.id, inv.id + " · " + d.type + " · " + money(amount));
    if (so) {
      const soId = so.id;
      const r = openReturn({ source: "Credit note", ref: cn.id, cn: cn.id, inv: inv.id, so: soId, customer: inv.customer, wh: whId, status: "Awaiting return", lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, cost4: dispatchCost(soId, l.sku) })) });
      cn.rtn = r.id;
    }
    E.emit();
    return ok(cn.rtn ? `Credit note issued. Return ${cn.rtn} awaits the goods — stock is restored only after inspection.` : "Credit note issued and the invoice balance reduced.", cn.id, { id: cn.id });
  };
  const returnAct = (id: string, action: string, data?: { lines: { accepted: number; damaged: number }[]; note?: string }): Result => {
    const r = findRtn(id); if (!r) return fail("Return not found.");
    const wd = whDeny(r.wh); if (wd) return wd;
    if (action === "receive") {
      if (!can("rtn.inspect") && !can("dsp.process")) return deny();
      if (r.status !== "Awaiting return") return fail("These goods have already been received.");
      r.lines.forEach((l) => { bal(r.wh, l.sku).quarantined += l.qty; move("Customer return", r.wh, l.sku, l.qty, "quarantined", l.cost4, r.id); });
      r.status = "Pending inspection"; r.receivedBy = me(); r.receivedAt = clock();
      log("Received returned goods into quarantine", id, wh(r.wh).name); E.emit(); return ok("Goods received into quarantine. Inspect them to restore sellable stock.", id);
    }
    if (action === "inspect") {
      if (!can("rtn.inspect")) return deny("Return inspection requires warehouse manager authority.");
      if (r.status === "Inspected") return fail("Already inspected — stock was restored once. Duplicate blocked.");
      if (r.status !== "Pending inspection") return fail("Receive the goods into quarantine before inspecting them.");
      const rows = (data && data.lines) || [];
      for (let k = 0; k < r.lines.length; k++) {
        const l = r.lines[k]; const x = rows[k] || { accepted: 0, damaged: 0 };
        const a = Number(x.accepted) || 0, dm = Number(x.damaged) || 0;
        if (!isInt(a) || !isInt(dm) || a < 0 || dm < 0) return fail(`${l.sku}: enter whole quantities.`);
        if (a + dm !== l.qty) return fail(`${l.sku}: accepted + damaged must equal the ${qty(l.sku, l.qty)} returned.`);
        if (bal(r.wh, l.sku).quarantined < l.qty) return fail(`${l.sku}: quarantine holds less than the returned quantity — investigate before posting.`);
      }
      r.lines.forEach((l, k) => {
        const a = Number(rows[k].accepted) || 0, dm = Number(rows[k].damaged) || 0; const b = bal(r.wh, l.sku);
        b.quarantined -= l.qty; move("Return inspected", r.wh, l.sku, -l.qty, "quarantined", l.cost4, r.id);
        if (a) {
          wavg(b, a, l.cost4, r.id); b.sellable += a;
          const nb = S().batches.filter((x) => x.wh === r.wh && x.sku === l.sku && x.bucket === "sellable").sort((x, y) => (x.exp < y.exp ? 1 : -1))[0];
          if (nb) nb.qty += a;
          move("Return accepted", r.wh, l.sku, a, "sellable", l.cost4, r.id);
        }
        if (dm) { b.damaged += dm; move("Return — damaged", r.wh, l.sku, dm, "damaged", l.cost4, r.id); }
        l.accepted = a; l.damaged = dm;
      });
      r.status = "Inspected"; r.inspectedBy = me(); r.inspectedAt = clock(); r.note = str(data && data.note);
      log("Inspected customer return", id, r.lines.map((l) => `${l.sku} +${l.accepted} sellable / ${l.damaged} damaged`).join("; ")); E.emit();
      return ok("Inspection posted. Accepted goods are back in sellable stock; damaged goods are held separately.", id);
    }
    return fail("Unknown action.");
  };

  // ---------- dispatch hooks (called by the engine inside its own stock postings; they never emit)
  /** After stock leaves: raise an invoice for the shipped quantities when auto-invoicing applies (always for cash collections). */
  const onDispatch = (so: SalesOrder, d: { id: string; method: string }, shipped: { sku: string; qty: number }[]): Invoice | null => {
    const cashCollect = so.terms === "Cash" && d.method === "Collection";
    if (!S().settings.autoInvoiceOnDispatch && !cashCollect) return null;
    const lines: DocLine[] = [];
    shipped.forEach((x) => { const l = so.lines.find((y) => y.sku === x.sku); if (!l) return; const q = Math.min(x.qty, Math.max(0, l.qty - soLine(so, l).invoiced)); if (q > 0) lines.push(soLineCopy(l, q)); });
    if (!lines.length) return null;
    const used = soChargesUsed(so);
    const charges = (so.charges || []).map((c, k) => ({ label: c.label, amount: c.amount, soCharge: k })).filter((c) => !used.has(c.soCharge));
    const termsDays = so.termsDays != null ? so.termsDays : so.terms === "Cash" ? 0 : cust(so.customer).terms;
    const inv = stamp({
      id: nextRef("INV"), kind: "SO", auto: true, so: so.id, dsp: d.id, customer: so.customer, party: party(so.customer), wh: so.wh, date: TODAY, termsDays, due: addDays(TODAY, termsDays),
      ref: so.ref || "", notes: "", lines, charges, status: "Draft", paid: 0, credited: 0, by: me(), created: clock(),
    } as Invoice);
    S().invoices.unshift(inv); issueNow(inv);
    if (cashCollect) {
      const p: Payment = {
        id: nextRef("PAY"), rct: nextRef("RCT"), customer: so.customer, date: TODAY, amount: inv.total, method: "Cash", extRef: "", receivedBy: me(), by: me(),
        alloc: [{ inv: inv.id, amount: inv.total, balAfter: 0 }], status: "Recorded", notes: "Cash collected at handover — pending finance verification.", evidence: "", unallocated: 0, at: clock(),
      };
      S().payments.unshift(p); inv.paid = inv.total;
      log("Recorded customer payment", p.id, money(p.amount) + " · Cash at handover · receipt " + p.rct);
    }
    return inv;
  };
  /** Goods refused on delivery are already in quarantine: open a return for inspection, and credit an auto-raised invoice. */
  const onDeliveryReturn = (d: { id: string; wh: string; invoice?: string }, so: SalesOrder, rets: { sku: string; qty: number; cost4: number }[]) => {
    const rtn = openReturn({ source: "Delivery", ref: d.id, so: so.id, inv: d.invoice || "", customer: so.customer, wh: d.wh, status: "Pending inspection", receivedBy: me(), receivedAt: clock(), lines: rets });
    const inv = d.invoice ? findInv(d.invoice) : undefined;
    if (!inv || inv.status !== "Issued") return { rtn, credit: 0 };
    const lim = cnReturnable(inv.id);
    const rows = rets
      .map((x) => { const il = inv.lines.find((y) => y.sku === x.sku); const m = lim.find((y) => y.sku === x.sku); return il ? { sku: x.sku, qty: Math.min(x.qty, il.qty - (m ? m.credited : 0)) } : null; })
      .filter((x): x is { sku: string; qty: number } => !!x && x.qty > 0);
    if (!rows.length) return { rtn, credit: 0 };
    const lines = cnLines(inv, rows);
    const net = lines.reduce((a, l) => a + l.net, 0), tax = lines.reduce((a, l) => a + l.tax, 0);
    if (net + tax > inv.total - inv.credited) return { rtn, credit: 0 };
    const cn: CreditNote = { id: nextRef("CN"), inv: inv.id, so: so.id, customer: inv.customer, party: inv.party, wh: inv.wh, date: TODAY, type: "Return", reason: "Refused on delivery " + d.id, lines, net, tax, amount: net + tax, by: me(), status: "Issued", reopen: true, rtn: rtn.id, at: clock() };
    S().creditNotes.unshift(cn); inv.credited += cn.amount; day(inv.wh).rev -= net; rtn.cn = cn.id;
    log("Issued credit note", cn.id, inv.id + " · refused on delivery · " + money(cn.amount));
    return { rtn, credit: cn.amount, cn };
  };

  // ---------- schema migration v1 → v2 (runs on saved demo data as well as on a fresh seed)
  /* eslint-disable @typescript-eslint/no-explicit-any -- v1 records have no type; they are reshaped in place. */
  const convLine = (l: any): any => {
    const p = prod(l.sku); const b = p.cartonPacks * p.packBars;
    const unit = b > 1 && l.qty % b === 0 ? "ctn" : p.baseUnit || "bar"; const factor = unit === "ctn" ? b : 1;
    const out = { ...l, name: p.name, desc: "", unit, factor, uqty: l.qty / factor, uprice: l.price * factor, discPct: l.discPct || 0, taxCode: "", taxRate: 0 };
    delete out.price; return out;
  };
  const migrate = (st: any): SoapState => {
    if (st.v >= SCHEMA) return st;
    st.settings = {
      invoiceBasis: "ordered", autoInvoiceOnDispatch: false, allowBackorders: false, estimateValidityDays: 30, defaultTax: "VAT15",
      companyAddress: "Plot 14, Heavy Industrial Area, Tema, Ghana", companyPhone: "+233 30 220 0000", companyEmail: "accounts@demo-soapflow.test", companyTin: "C0001234567",
      bankDetails: "Demo Bank Ghana · Tema Main · Acc 0012-3456-7890",
      termsEstimate: "Prices are valid until the date shown and subject to stock availability at order confirmation.",
      termsOrder: "Goods remain the property of the seller until paid in full. Report shortages or damage on delivery.",
      termsInvoice: "Payment due by the due date shown. Quote the invoice number with your payment. Goods are not returnable without a credit note.",
      ...st.settings,
    };
    if (!st.settings.paymentMethods.includes("Other")) st.settings.paymentMethods.push("Other");
    st.units = st.units || clone(DEFAULT_UNITS);
    st.taxes = st.taxes || clone(DEFAULT_TAXES);
    st.categories = st.categories || [...new Set(DEFAULT_CATEGORIES.concat(st.products.map((p: any) => p.category)))].map((id) => ({ id, description: "", status: "Active" }));
    st.brands.forEach((b: any) => { b.status = b.status || "Active"; b.description = b.description || ""; });
    st.products.forEach((p: any) => Object.assign(p, { description: "", image: "", tax: st.settings.defaultTax, extraUnits: [], baseUnit: "bar", ...p }));
    st.customers.forEach((c: any) => Object.assign(c, { email: "", delivAddr: c.address, tin: "", status: "Active", ...c }));
    st.salesOrders.forEach((so: any) => {
      so.lines = so.lines.map((l: any) => ("uprice" in l ? l : convLine(l)));
      const c = st.customers.find((x: any) => x.id === so.customer);
      Object.assign(so, { charges: [], expected: "", ref: "", notes: "", est: "", termsDays: so.terms === "Cash" ? 0 : c ? c.terms : 0, party: party(so.customer), ...so });
      stamp(so);
    });
    st.invoices.forEach((i: any) => {
      if (i.status) return;
      const legacy = !i.lines.length; const total = i.total;
      Object.assign(i, { kind: i.so ? "SO" : "Legacy", status: "Issued", lines: i.lines.map(convLine), charges: [], termsDays: Math.max(0, E.diffDays(i.due, i.date)), party: party(i.customer), ref: "", notes: i.note || "", by: "u10", issuedBy: "u10", issuedAt: i.date + " 09:00", auto: !!i.dsp });
      if (legacy) Object.assign(i, { sub: total, disc: 0, net: total, tax: 0, chargesTotal: 0, total });
      else stamp(i);
    });
    let rct = 0;
    st.payments.slice().reverse().forEach((p: any) => { if (!p.rct) p.rct = "RCT-2026-" + pad(++rct); p.receivedBy = p.receivedBy || p.by; p.unallocated = p.unallocated || 0; p.notes = p.notes || ""; p.evidence = p.evidence || ""; });
    st.creditNotes.forEach((n: any) => {
      if (n.status) return;
      const inv = st.invoices.find((i: any) => i.id === n.inv) || {};
      const refused = /^Returned on delivery/.test(n.reason || "");
      Object.assign(n, { type: refused ? "Return" : "Adjustment", so: inv.so || "", wh: inv.wh || "", party: party(n.customer), lines: [], net: n.amount, tax: 0, status: "Issued", reopen: refused });
    });
    st.estimates = st.estimates || [];
    st.returns = st.returns || [];
    st.seq = { EST: 0, RCT: rct, RTN: 0, CUS: Math.max(0, ...st.customers.map((c: any) => parseInt(c.id.slice(4), 10) || 0)), ...st.seq };
    // Goods refused on earlier deliveries sit in quarantine with no inspection record yet: open one per delivery.
    st.dispatches.filter((d: any) => d.deducted && d.lines.some((l: any) => l.delivered < l.dispatched) && ["Partially delivered", "Failed"].includes(d.status)).forEach((d: any) => {
      const so = st.salesOrders.find((o: any) => o.id === d.so); if (!so) return;
      const cn = st.creditNotes.find((n: any) => n.reason === "Returned on delivery " + d.id);
      st.seq.RTN++;
      st.returns.unshift({
        id: "RTN-2026-" + pad(st.seq.RTN), source: "Delivery", ref: d.id, so: so.id, inv: d.invoice || "", cn: cn ? cn.id : "", customer: so.customer, wh: d.wh,
        date: (d.deliveredAt || d.date).slice(0, 10), status: "Pending inspection", by: d.driver || d.by, receivedBy: d.driver || d.by, receivedAt: d.deliveredAt || d.date, note: d.outcomeNote || "",
        lines: d.lines.filter((l: any) => l.delivered < l.dispatched).map((l: any) => ({ sku: l.sku, name: prod(l.sku).name, qty: l.dispatched - l.delivered, cost4: l.cost4 || bal(d.wh, l.sku).avg, accepted: 0, damaged: 0 })),
      });
    });
    st.v = SCHEMA;
    return st;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /** Illustrative commercial records for a fresh demo dataset (never added to migrated user data). */
  const seedCommerce = (st: SoapState) => {
    const P = (sku: string) => st.products.find((p) => p.sku === sku) as Product;
    const units: Record<string, [string, number][]> = { "VEL-BTH-100": [["plt", 9600]], "VEL-BTH-200": [["plt", 4320]], "BRW-LDY-250": [["box", 20], ["plt", 2400]], "BRW-LDY-500": [["plt", 1440]], "PUR-ANT-125": [["plt", 7200]] };
    Object.keys(units).forEach((k) => { P(k).extraUnits = units[k].map(([unit, factor]) => ({ unit, factor })); });
    const desc: Record<string, string> = {
      "VEL-BTH-100": "Gentle everyday bathing bar with moisturising glycerine.", "BRW-LDY-250": "Blue laundry bar for hand and machine pre-wash.",
      "PUR-ANT-125": "Antibacterial soap for clinics, hotels and households.", "SUN-HRB-120": "Herbal shea-butter soap, cold-processed.",
    };
    Object.keys(desc).forEach((k) => { P(k).description = desc[k]; });
    st.customers.forEach((c) => { c.email = c.email || (c.id === WALKIN ? "" : c.contact.toLowerCase().replace(/[^a-z]+/g, ".") + "@customer.example"); });
    const C = (id: string) => st.customers.find((c) => c.id === id) as Customer;
    C("CUS-001").tin = "C0004471209";
    Object.assign(C("CUS-004"), { tin: "C0009120335", delivAddr: "Warehouse 3, Aboabo Industrial Area, Tamale" });
    const L = (sku: string, ctn: number, discPct = 0): DocLine => {
      const p = P(sku); const f = p.cartonPacks * p.packBars; const t = st.taxes.find((x) => x.id === p.tax) as TaxRate;
      return { sku, name: p.name, desc: "", unit: "ctn", factor: f, uqty: ctn, qty: ctn * f, uprice: p.price * f, discPct, taxCode: t.id, taxRate: t.rate };
    };
    const so1201 = st.salesOrders.find((s) => s.id === "SO-2026-1201") as SalesOrder;
    const est = (id: string, customer: string, date: string, expiry: string, status: Estimate["status"], lines: DocLine[], charges: Charge[] = [], extra: Partial<Estimate> = {}): Estimate =>
      stamp({ id, customer, party: party(customer), wh: "TMA", date, expiry, status, by: "u7", ref: "", notes: "", terms: st.settings.termsEstimate, lines, charges, ...extra } as Estimate);
    st.estimates = [
      est("EST-2026-0005", "CUS-002", TODAY, addDays(TODAY, 30), "Draft", [L("PUR-MPS-150", 15), L("VEL-BTH-200", 8, 2)]),
      est("EST-2026-0004", "CUS-004", "2026-10-20", "2026-11-19", "Sent", [L("BRW-LDY-500", 30, 3), L("PUR-ANT-125", 20)], [{ label: "Delivery to Tamale", amount: 45000 }], { wh: "TML", sentAt: "2026-10-20 10:15", sentTo: "ibrahim.seidu@customer.example" }),
      est("EST-2026-0003", "CUS-005", "2026-10-18", "2026-11-17", "Accepted", [L("VEL-LAV-100", 10), L("SUN-HRB-120", 6)], [{ label: "Delivery to Takoradi", amount: 15000 }], { wh: "TKD", sentAt: "2026-10-18 14:00", acceptedAt: "2026-10-21 09:30", decidedBy: "u7" }),
      est("EST-2026-0002", "CUS-007", "2026-09-10", "2026-10-10", "Sent", [L("VEL-BTH-100", 3)], [], { sentAt: "2026-09-10 11:20" }),
      est("EST-2026-0001", "CUS-001", "2026-10-14", "2026-11-13", "Converted", so1201.lines.map((l) => soLineCopy(l, l.qty)), [], { so: "SO-2026-1201", sentAt: "2026-10-14 15:40", acceptedAt: "2026-10-20 16:05", convertedAt: "2026-10-21 08:30", decidedBy: "u7" }),
    ];
    so1201.est = "EST-2026-0001";
    st.seq.EST = 5;
    ([
      ["2026-10-21 08:30", "u7", "Converted estimate to sales order", "EST-2026-0001", "EST-2026-0001 → SO-2026-1201"],
      ["2026-10-21 09:30", "u7", "Customer accepted estimate", "EST-2026-0003", ""],
      ["2026-10-20 10:15", "u7", "Sent estimate to customer", "EST-2026-0004", "ibrahim.seidu@customer.example"],
    ] as const).forEach(([ts, user, action, ref, detail]) => { st.seq.AUD++; st.audit.push({ id: "AUD-" + st.seq.AUD, ts, user, action, ref, detail }); });
    st.audit.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  };

  const api = {
    unitDef, unitFactor, unitsFor, taxOf, lineCalc, docTotals, effDisc, invStatus, invBal, custBalance, estStatus, soTotal,
    soLine, soProgress, soEditable, soChargesUsed, invoicePrefill, cnReturnable, productUsed, history, related,
    productSave, productDelete, masterSave, masterDelete, customerSave, estimateSave, estimateAct, estimateConvert, soSave, soAct,
    invoiceSave, invoiceAct, paymentRecord, paymentAllocate, paymentAct, creditNoteSave, returnAct,
  };
  return { api, migrate, seedCommerce, onDispatch, onDeliveryReturn, unitFactor, invStatus, invBal, custBalance, soTotal };
}

export type CommerceApi = ReturnType<typeof installCommerce>["api"];
