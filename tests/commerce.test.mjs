/* End-to-end tests of the commercial workflow against the real engine (engine.js + commerce.ts). Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshStore, storage } from "./setup.mjs";

const ok = (r) => { assert.equal(r.ok, true, r.error || JSON.stringify(r.errs)); return r; };
const bad = (r, re) => { assert.equal(r.ok, false, "expected the action to be blocked"); if (re) assert.match(r.error + " " + JSON.stringify(r.errs || {}), re); return r; };
const line = (S, sku, unit, uqty, extra = {}) => ({ sku, unit, uqty, uprice: S.prod(sku).price * S.unitFactor(sku, unit), discPct: 0, tax: "VAT15", ...extra });
const so = (S, id) => S.s.salesOrders.find((x) => x.id === id);
const inv = (S, id) => S.s.invoices.find((x) => x.id === id);
const rtn = (S, id) => S.s.returns.find((x) => x.id === id);
const sku = "BRW-LDY-250"; // 40 bars per carton

async function confirmedOrder(S, ctn = 50, extra = {}) {
  const r = ok(S.soSave({ customer: "CUS-001", wh: "TMA", method: "Delivery", terms: "Credit", address: "Makola", lines: [line(S, sku, "ctn", ctn)], ...extra }, true));
  return so(S, r.id);
}
function deliver(S, soId, cartons) {
  const d = ok(S.dispatchStart(soId));
  const dl = S.s.dispatches.find((x) => x.id === d.id);
  ok(S.dispatchVerify(d.id, dl.lines.map(() => ({ picked: cartons * 40, verified: cartons * 40 }))));
  ok(S.dispatchAssign(d.id, "u9", "GT-1"));
  ok(S.dispatchOut(d.id));
  return dl;
}

test("fresh dataset is migrated to schema v2 with linked sample documents", async () => {
  const S = await freshStore();
  assert.equal(S.s.v, 2);
  assert.ok(S.s.units.some((u) => u.code === "plt") && S.s.taxes.some((t) => t.id === "VAT15"));
  assert.equal(S.s.estimates.find((e) => e.id === "EST-2026-0001").so, "SO-2026-1201");
  assert.equal(so(S, "SO-2026-1201").est, "EST-2026-0001");
  // the goods refused on DSP-2026-0733 are held in quarantine awaiting inspection
  assert.equal(S.s.returns[0].status, "Pending inspection");
  assert.equal(S.bal("TMA", "PUR-MPS-150").quarantined, 96);
  // every invoice is issued and legacy totals are preserved
  assert.equal(inv(S, "INV-2026-0602").total, 2635000);
  assert.ok(S.s.payments.every((p) => /^RCT-2026-\d{4}$/.test(p.rct)));
});

test("saved v2 data reloads unchanged; unknown future schema reseeds", async () => {
  const S = await freshStore();
  ok(S.customerSave({ name: "Persisted Traders", type: "Business", terms: 0, limit: 0 }));
  const saved = JSON.parse(storage.get("soapflow-demo-v1"));
  const S2 = await freshStore(saved);
  assert.ok(S2.s.customers.some((c) => c.name === "Persisted Traders"));
  const S3 = await freshStore({ ...saved, v: 99 });
  assert.ok(!S3.s.customers.some((c) => c.name === "Persisted Traders"));
});

test("line maths: unit conversion, discount and tax in integer pesewas", async () => {
  const S = await freshStore();
  const l = { sku, unit: "ctn", factor: 40, qty: 400, uprice: 24000, discPct: 2.5, taxRate: 1500 };
  assert.deepEqual(S.lineCalc(l), { gross: 240000, disc: 6000, net: 234000, tax: 35100, total: 269100 });
  assert.deepEqual(S.lineCalc(l, 41), { gross: 24600, disc: 615, net: 23985, tax: 3598, total: 27583 }); // partial, in base units
});

test("products: new product is orderable; used products cannot be deleted", async () => {
  const S = await freshStore();
  const p = { sku: "VEL-NEW-300", name: "Velora 300 g", brand: "Velora", category: "Bathing", cartonPacks: 10, packBars: 6, cost4: 50000, price: 700, min: 0, tax: "VAT15", extraUnits: [{ unit: "plt", factor: 3000 }] };
  bad(S.productSave({ ...p, extraUnits: [{ unit: "ctn", factor: 60 }] }, true), /packaging unit/);
  ok(S.productSave(p, true));
  assert.equal(S.unitFactor("VEL-NEW-300", "plt"), 3000);
  assert.deepEqual(S.unitsFor("VEL-NEW-300").map((u) => u.unit), ["bar", "pk", "ctn", "plt"]);
  ok(S.productDelete("VEL-NEW-300")); // never used
  bad(S.productDelete(sku), /Discontinued/);
  ok(S.productSave({ ...S.prod(sku), status: "Discontinued" }, false));
  bad(S.soSave({ customer: "CUS-001", wh: "TMA", method: "Collection", terms: "Cash", lines: [line(S, sku, "ctn", 1)] }), /discontinued/);
});

test("masters: categories, units and taxes are validated and protected when in use", async () => {
  const S = await freshStore();
  ok(S.masterSave("categories", { id: "Liquid soap" }, true));
  bad(S.masterSave("categories", { id: "liquid soap" }, true), /already exists/);
  ok(S.masterSave("units", { code: "dz", name: "Dozen", plural: "dozens" }, true));
  bad(S.masterDelete("units", "ctn"), /Built-in/);
  bad(S.masterDelete("categories", "Bathing"), /in use/);
  ok(S.masterDelete("categories", "Liquid soap"));
  ok(S.masterSave("taxes", { id: "VAT15", name: "VAT 15%", rate: 1250 }, false));
  // an existing document keeps the rate it was created with
  assert.equal(S.s.estimates.find((e) => e.id === "EST-2026-0005").lines[0].taxRate, 1500);
});

test("customers: created with auto code, reusable, validated", async () => {
  const S = await freshStore();
  const r = ok(S.customerSave({ name: "Osu Mini Mart", type: "Business", email: "buy@osu.example", terms: 14, limit: 500000, tin: "C0012345678" }));
  assert.equal(r.id, "CUS-008");
  bad(S.customerSave({ name: "osu mini mart", type: "Business", terms: 0, limit: 0 }), /already exists/);
  bad(S.customerSave({ name: "No Limit Ltd", type: "Business", terms: 30, limit: 0 }), /credit limit/);
  ok(S.estimateSave({ customer: r.id, expiry: S.addDays(S.TODAY, 10), lines: [line(S, sku, "ctn", 2)] }));
});

test("estimate → accept → convert keeps customer, quantities, prices, discounts and taxes", async () => {
  const S = await freshStore();
  const e = ok(S.estimateSave({ customer: "CUS-002", wh: "TMA", expiry: S.addDays(S.TODAY, 30), lines: [line(S, sku, "ctn", 5, { uprice: 23000, discPct: 2 })], charges: [{ label: "Delivery", amount: 5000 }] }));
  const est = S.s.estimates.find((x) => x.id === e.id);
  bad(S.estimateConvert(e.id, { wh: "TMA", method: "Collection", terms: "Cash" }, true), /accepted/);
  ok(S.estimateAct(e.id, "send"));
  ok(S.estimateAct(e.id, "accept"));
  // catalogue price changes after quoting must not leak into the order
  ok(S.productSave({ ...S.prod(sku), price: 999 }, false));
  const r = ok(S.estimateConvert(e.id, { wh: "TMA", method: "Collection", terms: "Credit" }, true));
  const o = so(S, r.id);
  assert.equal(o.est, e.id);
  assert.equal(est.status, "Converted");
  assert.equal(est.so, o.id);
  assert.equal(o.customer, "CUS-002");
  assert.deepEqual(o.lines.map(({ sku, qty, uprice, discPct, taxRate }) => ({ sku, qty, uprice, discPct, taxRate })), [{ sku, qty: 200, uprice: 23000, discPct: 2, taxRate: 1500 }]);
  assert.equal(o.total, est.total);
  bad(S.estimateConvert(e.id, { wh: "TMA", method: "Collection", terms: "Cash" }, true), /already converted/);
  const dup = ok(S.estimateAct(e.id, "duplicate"));
  assert.equal(S.s.estimates.find((x) => x.id === dup.id).status, "Draft");
});

test("expired estimates cannot be accepted", async () => {
  const S = await freshStore();
  assert.equal(S.estStatus(S.s.estimates.find((e) => e.id === "EST-2026-0002")), "Expired");
  bad(S.estimateAct("EST-2026-0002", "accept"), /expired/);
});

test("confirming an order reserves stock but never deducts it", async () => {
  const S = await freshStore();
  const before = { ...S.bal("TMA", sku) };
  const o = await confirmedOrder(S, 50);
  assert.equal(o.status, "Confirmed");
  assert.equal(S.bal("TMA", sku).sellable, before.sellable);
  assert.equal(S.bal("TMA", sku).reserved, before.reserved + 2000);
  bad(S.soSave({ customer: "CUS-001", wh: "TMA", method: "Collection", terms: "Cash", lines: [line(S, sku, "ctn", 100000)] }, true), /over-allocate/);
});

test("backorders: allowed by setting, reserving only what is available", async () => {
  const S = await freshStore();
  ok(S.settingsSave({ allowBackorders: true }));
  const avail = S.avail("TMA", sku);
  const o = await confirmedOrder(S, 500, { terms: "Cash" });
  assert.equal(o.lines[0].reserved, avail);
  assert.equal(S.soLine(o, o.lines[0]).backorder, 20000 - avail);
});

test("partial invoicing: 200 of 500 cartons, then the remaining 300; duplicates blocked", async () => {
  const S = await freshStore();
  ok(S.settingsSave({ allowBackorders: true }));
  const o = await confirmedOrder(S, 500, { terms: "Cash" });
  const pre = S.invoicePrefill(o.id);
  assert.equal(pre.lines[0].invoiceable, 20000);
  const a = ok(S.invoiceSave({ so: o.id, termsDays: 0, lines: [{ sku, qty: 200 * 40 }] }, true));
  assert.equal(S.soProgress(o).invoice, "Partially invoiced");
  assert.equal(S.soLine(o, o.lines[0]).invoiceable, 300 * 40);
  bad(S.invoiceSave({ so: o.id, termsDays: 0, lines: [{ sku, qty: 300 * 40 + 1 }] }, true), /Duplicate invoicing is blocked/);
  const b = ok(S.invoiceSave({ so: o.id, termsDays: 0, lines: [{ sku, qty: 300 * 40 }] }, true));
  assert.equal(S.soProgress(o).invoice, "Fully invoiced");
  bad(S.invoiceSave({ so: o.id, termsDays: 0, lines: [{ sku, qty: 1 }] }), /only 0 bars can still be invoiced/);
  assert.notEqual(a.id, b.id);
  assert.equal(inv(S, a.id).total + inv(S, b.id).total, o.total);
  assert.equal(inv(S, a.id).kind, "SO");
  assert.equal(inv(S, a.id).so, o.id);
  // stock untouched by invoicing
  assert.equal(o.lines[0].fulfilled, 0);
});

test("draft invoices hold quantities; cancelling releases them; issued drafts are re-checked", async () => {
  const S = await freshStore();
  const o = await confirmedOrder(S, 10);
  const d1 = ok(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 400 }] }));
  bad(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 1 }] }), /can still be invoiced/);
  ok(S.invoiceAct(d1.id, "cancel", "Wrong quantity"));
  ok(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 400 }] }, true));
  bad(S.invoiceAct(d1.id, "issue"), /Only draft/);
});

test("delivered-basis invoicing follows dispatched quantities; multiple deliveries per order", async () => {
  const S = await freshStore();
  ok(S.settingsSave({ invoiceBasis: "delivered" }));
  const o = await confirmedOrder(S, 10);
  assert.equal(S.soLine(o, o.lines[0]).invoiceable, 0);
  const before = S.bal("TMA", sku).sellable;
  const d1 = deliver(S, o.id, 4);
  assert.equal(S.bal("TMA", sku).sellable, before - 160, "stock deducted exactly once at dispatch");
  bad(S.dispatchOut(d1.id), /duplicate/i);
  assert.equal(S.soLine(o, o.lines[0]).invoiceable, 160);
  assert.equal(o.status, "Partially Fulfilled");
  assert.equal(d1.invoice, undefined, "auto-invoicing is off by default");
  ok(S.dispatchDeliver(d1.id, { outcome: "Delivered", recipient: "Joseph" }));
  deliver(S, o.id, 6);
  assert.equal(S.soProgress(o).fulfil, "Fulfilled");
  assert.equal(S.soLine(o, o.lines[0]).invoiceable, 400);
  assert.equal(S.soProgress(o).invoice, "Not invoiced", "fulfilment and invoicing are independent");
});

test("auto-invoice on dispatch never double-invoices quantities already invoiced", async () => {
  const S = await freshStore();
  ok(S.settingsSave({ autoInvoiceOnDispatch: true }));
  const o = await confirmedOrder(S, 10);
  ok(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 240 }] }, true)); // 6 cartons invoiced up front
  const d = deliver(S, o.id, 10);
  const auto = inv(S, d.invoice);
  assert.equal(auto.lines[0].qty, 160);
  assert.equal(S.soProgress(o).invoice, "Fully invoiced");
});

test("direct invoice: totals, discount control, and fulfilment through dispatch", async () => {
  const S = await freshStore();
  const r = ok(S.invoiceSave({ customer: "CUS-003", wh: "KSI", termsDays: 0, lines: [line(S, "VEL-BTH-100", "ctn", 2)], charges: [{ label: "Loading", amount: 2000 }] }));
  const i = inv(S, r.id);
  assert.equal(i.kind, "Direct");
  assert.equal(i.status, "Draft");
  assert.equal(i.total, Math.round(2 * 240 * 295 * 1.15) + 2000);
  S.setUser("u7"); // sales officer: may draft, may not issue
  bad(S.invoiceAct(r.id, "issue"), /Not permitted/);
  bad(S.invoiceSave({ customer: "CUS-003", wh: "TMA", termsDays: 0, lines: [line(S, sku, "ctn", 1, { discPct: 20 })] }, true), /Not permitted/);
  S.setUser("u10");
  ok(S.invoiceAct(r.id, "issue"));
  bad(S.invoiceSave({ id: r.id, customer: "CUS-003", wh: "KSI", termsDays: 0, lines: [line(S, "VEL-BTH-100", "ctn", 3)] }), /cannot be edited/);
  const before = S.bal("KSI", "VEL-BTH-100").sellable;
  S.setUser("u1");
  const f = ok(S.invoiceAct(r.id, "fulfil", { wh: "KSI", method: "Collection" }));
  assert.equal(i.so, f.id);
  assert.equal(S.bal("KSI", "VEL-BTH-100").sellable, before, "issuing or linking an invoice never moves stock");
  assert.equal(S.soProgress(so(S, f.id)).invoice, "Fully invoiced");
  assert.equal(inv(S, r.id).kind, "Direct");
});

test("payments: partial, overpayment and duplicate references blocked, reversal restores balance", async () => {
  const S = await freshStore();
  const o = await confirmedOrder(S, 10);
  const r = ok(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 400 }] }, true));
  const i = inv(S, r.id);
  const half = Math.floor(i.total / 2);
  const p1 = ok(S.paymentRecord({ customer: "CUS-001", date: S.TODAY, amount: half, method: "Bank transfer", extRef: "TRX-1", alloc: [{ inv: i.id, amount: half }] }));
  assert.equal(S.invStatus(i), "Partially Paid");
  bad(S.paymentRecord({ customer: "CUS-001", date: S.TODAY, amount: i.total, method: "Bank transfer", extRef: "TRX-2", alloc: [{ inv: i.id, amount: i.total }] }), /Overpayment blocked/);
  bad(S.paymentRecord({ customer: "CUS-001", date: S.TODAY, amount: 100, method: "Bank transfer", extRef: "trx-1" }), /Duplicate/);
  bad(S.paymentRecord({ customer: "CUS-001", date: S.addDays(S.TODAY, 1), amount: 100, method: "Cash" }), /future/);
  const p2 = ok(S.paymentRecord({ customer: "CUS-001", date: S.TODAY, amount: i.total - half, method: "Mobile money", extRef: "MM-9", alloc: [{ inv: i.id, amount: i.total - half }] }));
  assert.equal(S.invStatus(i), "Paid");
  const pay = S.s.payments.find((p) => p.id === p2.id);
  assert.match(pay.rct, /^RCT-2026-/);
  assert.equal(pay.alloc[0].balAfter, 0);
  bad(S.invoiceAct(i.id, "void", "Mistake"), /Reverse those payments/);
  S.setUser("u7");
  bad(S.paymentAct(p1.id, "reverse", "Bounced"), /Not permitted/);
  S.setUser("u10");
  ok(S.paymentAct(p1.id, "reverse", "Bounced"));
  bad(S.paymentAct(p1.id, "reverse", "Again"), /duplicate/i);
  assert.equal(S.invBal(i), half);
  assert.equal(S.s.payments.find((p) => p.id === p1.id).status, "Reversed", "original record retained");
});

test("on-account payment can be allocated later, never beyond balance", async () => {
  const S = await freshStore();
  const p = ok(S.paymentRecord({ customer: "CUS-002", date: S.TODAY, amount: 100000, method: "Cash" }));
  const before = S.custBalance("CUS-002");
  bad(S.paymentAllocate(p.id, [{ inv: "INV-2026-0605", amount: 100001 }]), /unallocated/);
  ok(S.paymentAllocate(p.id, [{ inv: "INV-2026-0605", amount: 100000 }]));
  assert.equal(S.custBalance("CUS-002"), before);
  assert.equal(S.s.payments.find((x) => x.id === p.id).unallocated, 0);
});

test("void: issued invoice without payments; order quantity becomes invoiceable again", async () => {
  const S = await freshStore();
  const o = await confirmedOrder(S, 5);
  const r = ok(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 200 }] }, true));
  bad(S.soAct(o.id, "cancel", "Customer left"), /Void the invoice/);
  ok(S.invoiceAct(r.id, "void", "Raised in error"));
  assert.equal(S.soLine(o, o.lines[0]).invoiceable, 200);
  ok(S.soAct(o.id, "cancel", "Customer left"));
  assert.equal(o.lines[0].reserved, 0);
});

test("credit note with return: limited to delivered goods; stock restored only after inspection", async () => {
  const S = await freshStore();
  const o = await confirmedOrder(S, 10);
  const r = ok(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 400 }] }, true));
  bad(S.creditNoteSave({ inv: r.id, type: "Return", reason: "Damaged", lines: [{ sku, qty: 40 }] }), /limited to delivered/);
  const d = deliver(S, o.id, 10);
  ok(S.dispatchDeliver(d.id, { outcome: "Delivered", recipient: "Joseph" }));
  const i = inv(S, r.id); const due = S.invBal(i);
  const cn = ok(S.creditNoteSave({ inv: r.id, type: "Return", reason: "Damaged in store", lines: [{ sku, qty: 40 }] }));
  const note = S.s.creditNotes.find((n) => n.id === cn.id);
  assert.equal(note.amount, S.lineCalc(i.lines[0], 40).total);
  assert.equal(S.invBal(i), due - note.amount);
  const ret = rtn(S, note.rtn);
  assert.equal(ret.status, "Awaiting return");
  const b = S.bal("TMA", sku); const sell0 = b.sellable;
  bad(S.returnAct(ret.id, "inspect", { lines: [{ accepted: 40, damaged: 0 }] }), /Receive the goods/);
  ok(S.returnAct(ret.id, "receive"));
  assert.equal(b.sellable, sell0, "receiving into quarantine does not restore sellable stock");
  bad(S.returnAct(ret.id, "inspect", { lines: [{ accepted: 30, damaged: 0 }] }), /must equal/);
  ok(S.returnAct(ret.id, "inspect", { lines: [{ accepted: 30, damaged: 10 }] }));
  assert.equal(b.sellable, sell0 + 30);
  bad(S.returnAct(ret.id, "inspect", { lines: [{ accepted: 30, damaged: 10 }] }), /Duplicate/);
  bad(S.creditNoteSave({ inv: r.id, type: "Return", reason: "More", lines: [{ sku, qty: 400 }] }), /at most/);
  bad(S.creditNoteSave({ inv: r.id, type: "Discount", reason: "Too much", amount: i.total }), /exceeds/);
  ok(S.creditNoteSave({ inv: r.id, type: "Price correction", reason: "Agreed rebate", amount: 1000 }));
});

test("goods refused on delivery go to quarantine and an inspection return; quantity reopens on the order", async () => {
  const S = await freshStore();
  const o = await confirmedOrder(S, 10);
  const d = deliver(S, o.id, 10);
  const q0 = S.bal("TMA", sku).quarantined;
  ok(S.dispatchDeliver(d.id, { outcome: "Partially delivered", recipient: "Joseph", delivered: [320] }));
  assert.equal(S.bal("TMA", sku).quarantined, q0 + 80);
  const ret = S.s.returns.find((x) => x.ref === d.id);
  assert.equal(ret.status, "Pending inspection");
  assert.equal(o.lines[0].fulfilled, 320);
  assert.equal(S.soLine(o, o.lines[0]).toDeliver, 80);
  S.setUser("u7");
  bad(S.returnAct(ret.id, "inspect", { lines: [{ accepted: 80, damaged: 0 }] }), /Not permitted/);
});

test("refused goods on an auto-invoiced delivery are credited and re-invoiced on redelivery", async () => {
  const S = await freshStore();
  ok(S.settingsSave({ autoInvoiceOnDispatch: true }));
  const o = await confirmedOrder(S, 10);
  const d = deliver(S, o.id, 10);
  ok(S.dispatchDeliver(d.id, { outcome: "Partially delivered", recipient: "Joseph", delivered: [320] }));
  const cn = S.s.creditNotes.find((n) => n.inv === d.invoice);
  assert.equal(cn.reopen, true);
  assert.equal(cn.lines[0].qty, 80);
  assert.equal(S.soLine(o, o.lines[0]).invoiced, 320);
  const d2 = deliver(S, o.id, 2);
  assert.equal(inv(S, d2.invoice).lines[0].qty, 80);
});

test("permissions: drivers cannot sell, sales cannot void or credit, auditors are read-only", async () => {
  const S = await freshStore();
  S.setUser("u9");
  bad(S.soSave({ customer: "CUS-001", wh: "TMA", method: "Collection", terms: "Cash", lines: [line(S, sku, "ctn", 1)] }), /Not permitted/);
  S.setUser("u7");
  bad(S.invoiceAct("INV-2026-0613", "void", "x"), /Not permitted/);
  bad(S.creditNoteSave({ inv: "INV-2026-0613", type: "Adjustment", reason: "Goodwill", amount: 100 }), /Not permitted/);
  bad(S.productSave({ ...S.prod(sku), price: 1 }, false), /Not permitted/);
  S.setUser("u11");
  bad(S.estimateSave({ customer: "CUS-001", expiry: S.addDays(S.TODAY, 5), lines: [line(S, sku, "ctn", 1)] }), /Not permitted/);
  bad(S.customerSave({ name: "Auditor Co", type: "Business", terms: 0, limit: 0 }), /Not permitted/);
});

test("audit trail records user, action and reference for commercial events", async () => {
  const S = await freshStore();
  const o = await confirmedOrder(S, 2);
  const r = ok(S.invoiceSave({ so: o.id, termsDays: 30, lines: [{ sku, qty: 80 }] }, true));
  const h = S.history(r.id).map((a) => a.action);
  assert.ok(h.includes("Converted sales order to invoice") && h.includes("Issued invoice"));
  assert.ok(S.history(r.id).every((a) => a.user === "u1" && a.ts));
  assert.ok(S.related(o.id).some((x) => x.id === r.id));
  assert.ok(S.related(r.id).some((x) => x.id === o.id));
});

test("document numbers stay unique when two tabs create documents concurrently", async () => {
  await freshStore();
  const { createSoapStore } = await import("../src/lib/store/engine.js");
  const A = createSoapStore(); const B = createSoapStore(); // same storage, no sync between them
  const ids = [];
  for (let k = 0; k < 5; k++) {
    ids.push(ok(A.estimateSave({ customer: "CUS-001", expiry: A.addDays(A.TODAY, 5), lines: [line(A, sku, "ctn", 1)] })).id);
    ids.push(ok(B.estimateSave({ customer: "CUS-002", expiry: B.addDays(B.TODAY, 5), lines: [line(B, sku, "ctn", 1)] })).id);
  }
  assert.equal(new Set(ids).size, ids.length, ids.join(", "));
});

test("settings are validated by the engine, not only the screen", async () => {
  const S = await freshStore();
  bad(S.settingsSave({ invoiceBasis: "weekly" }), /Invoice basis/);
  bad(S.settingsSave({ defaultTax: "NOPE" }), /active tax rate/);
  bad(S.settingsSave({ allowBackorders: "yes" }), /on or off/);
  bad(S.settingsSave({ paymentMethods: ["Cheque"] }), /Payment methods/);
  S.setUser("u7");
  bad(S.settingsSave({ invoiceBasis: "delivered" }), /Not permitted/);
  S.setUser("u1");
  ok(S.settingsSave({ invoiceBasis: "delivered", estimateValidityDays: 14 }));
});
