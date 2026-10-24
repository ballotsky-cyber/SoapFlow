import type { Doc, Line, SoapStore } from "@/lib/store";

export type Unit = "ctn" | "pk" | "bar";
export const UNITS: Unit[] = ["ctn", "pk", "bar"];

/** Editable receipt line inside the wizard (quantities as typed, plus unit). */
export interface WLine {
  sku: string;
  cost4: number;
  expN: string;
  expU: Unit;
  cntN: string;
  cntU: Unit;
  rejN: string;
  rejU: Unit;
  dmgN: string;
  dmgU: Unit;
  batch: string;
  mfg: string;
  exp: string;
}

/** Wizard working copy of a goods receipt. `arrival` is "yyyy-MM-ddTHH:mm". */
export interface WReceipt {
  id: string | null;
  supplier: string;
  po: string;
  wh: string;
  truck: string;
  driver: string;
  dn: string;
  arrival: string;
  notes: string;
  lines: WLine[];
  status?: string;
}

export interface LineCalc {
  exp: number;
  cnt: number;
  rej: number;
  dmg: number;
  acc: number;
  short: number;
}

const nowHHMM = () => new Date().toTimeString().slice(0, 5);

export function blankReceipt(S: SoapStore): WReceipt {
  return { id: null, supplier: "", po: "", wh: S.scope()[0], truck: "", driver: "", dn: "", arrival: S.TODAY + "T" + nowHHMM(), notes: "", lines: [] };
}

export function unitOf(S: SoapStore, sku: string, bars: number): [Unit, number] {
  const p = S.prod(sku);
  if (bars % S.bpc(sku) === 0) return ["ctn", bars / S.bpc(sku)];
  if (bars % p.packBars === 0) return ["pk", bars / p.packBars];
  return ["bar", bars];
}

export function fromReceipt(S: SoapStore, g: Doc): WReceipt {
  const lines = g.lines.map((l: Line): WLine => {
    const [eu, en] = unitOf(S, l.sku, l.expected);
    const [cu, cn] = unitOf(S, l.sku, l.counted);
    const [ru, rn] = unitOf(S, l.sku, l.rejected);
    const [du, dn] = unitOf(S, l.sku, l.damaged);
    return {
      sku: l.sku,
      cost4: l.cost4,
      expN: String(en),
      expU: eu,
      cntN: l.counted || (g.status !== "Arrived" && g.status !== "Counting") ? String(cn) : "",
      cntU: cu === "bar" && !l.counted ? eu : cu,
      rejN: rn ? String(rn) : "",
      rejU: ru,
      dmgN: dn ? String(dn) : "",
      dmgU: du,
      batch: l.batch || "",
      mfg: l.mfg || "",
      exp: l.exp || "",
    };
  });
  return { id: g.id, supplier: g.supplier, po: g.po, wh: g.wh, truck: g.truck, driver: g.driver || "", dn: g.dn, arrival: String(g.arrival).replace(" ", "T"), notes: g.notes || "", lines, status: g.status };
}

export function lineFromPO(S: SoapStore, po: Doc, l: Line): WLine {
  const rem = Math.max(0, l.qty - S.poReceived(po.id, l.sku));
  const [u, n] = unitOf(S, l.sku, rem);
  return { sku: l.sku, cost4: l.cost4, expN: String(n), expU: u, cntN: "", cntU: u, rejN: "", rejU: u, dmgN: "", dmgU: u, batch: "", mfg: "", exp: "" };
}

export function calc(S: SoapStore, l: WLine): LineCalc {
  const exp = S.toBars(l.sku, l.expN, l.expU);
  const cnt = S.toBars(l.sku, l.cntN, l.cntU);
  const rej = S.toBars(l.sku, l.rejN, l.rejU);
  const dmg = S.toBars(l.sku, l.dmgN, l.dmgU);
  return { exp, cnt, rej, dmg, acc: cnt - rej - dmg, short: exp - cnt };
}

export function toData(S: SoapStore, w: WReceipt) {
  return {
    id: w.id,
    supplier: w.supplier,
    po: w.po,
    wh: w.wh,
    truck: w.truck.trim().toUpperCase(),
    driver: w.driver,
    dn: w.dn.trim(),
    arrival: w.arrival.replace("T", " "),
    notes: w.notes,
    status: undefined as string | undefined,
    lines: w.lines.map((l) => {
      const c = calc(S, l);
      return { sku: l.sku, expected: c.exp, counted: c.cnt, accepted: c.acc, rejected: c.rej, damaged: c.dmg, cost4: l.cost4, batch: l.batch.trim(), mfg: l.mfg, exp: l.exp };
    }),
  };
}

/** Returns [stepToGoBackTo, message] for the first failing rule up to `step`, or null. */
export function validate(S: SoapStore, w: WReceipt, step: number): [number, string] | null {
  if (step >= 1 && (!w.supplier || !w.wh || !w.truck.trim() || !w.dn.trim() || !w.arrival)) return [1, "Supplier, destination warehouse, truck registration, delivery note and arrival time are required."];
  if (step >= 2 && !w.lines.length) return [2, "Add at least one product line."];
  if (step >= 3) for (const l of w.lines) if (l.cntN === "") return [3, `Enter the physically counted quantity for ${l.sku} (enter 0 if none arrived).`];
  if (step >= 4)
    for (const l of w.lines) {
      const c = calc(S, l);
      if (c.acc < 0) return [4, `${l.sku}: rejected + damaged (${S.commas(c.rej + c.dmg)} bars) exceeds counted (${S.commas(c.cnt)} bars).`];
    }
  if (step >= 5)
    for (const l of w.lines) {
      const c = calc(S, l);
      if (S.prod(l.sku).batch && c.acc > 0) {
        if (!l.batch.trim() || !l.exp) return [5, `${l.sku} is batch-tracked — batch number and expiry date are required.`];
        if (l.exp <= S.TODAY) return [5, `${l.sku}: expiry date is in the past. Expired goods must be rejected, not accepted.`];
      }
    }
  return null;
}

export const STEP_LABELS: [string, string][] = [
  ["Truck & documents", "Record supplier, purchase order, truck, delivery note, arrival time and destination."],
  ["Products on this truck", "One truck can carry several brands and products. Lines are pre-filled from the PO balance."],
  ["Expected vs counted", "Enter quantities in cartons, packs or bars — conversions use each product's packaging."],
  ["Condition", "Record rejected and damaged quantities. Short delivery is calculated automatically."],
  ["Batches & expiry", "Required only for batch-tracked products."],
  ["Review discrepancies", "Check totals and explain differences before submitting for approval."],
  ["Approve & post", "Done by the warehouse manager from the receipt page."],
];

/** Short / over text and tone for a line. */
export function shortInfo(S: SoapStore, l: WLine, c: LineCalc): { text: string; cls: string } {
  const text = l.cntN === "" ? "—" : c.short > 0 ? "Short " + S.qty(l.sku, c.short) : c.short < 0 ? "Over " + S.qty(l.sku, -c.short) : "Matches";
  const cls = c.short > 0 ? "text-warning" : c.short < 0 ? "text-violet" : "text-success";
  return { text, cls };
}
