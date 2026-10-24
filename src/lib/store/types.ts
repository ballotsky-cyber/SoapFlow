/* Types for the ported demo engine (engine.js). Money is integer pesewas; unit cost ("cost4") is GHS×10⁴ per bar; quantities are bars. */

export type WarehouseId = "TMA" | "KSI" | "TKD" | "TML" | (string & {});
export type RoleKey = "admin" | "owner" | "ops" | "wm" | "sk" | "proc" | "sales" | "dispatch" | "driver" | "acct" | "auditor";
export type Tone = "green" | "blue" | "amber" | "red" | "gray" | "violet";

export interface Route {
  name: string;
  id?: string;
  tab?: string;
  action?: string;
  filter?: string;
  kind?: string;
  [k: string]: unknown;
}

export interface Warehouse { id: WarehouseId; name: string; city: string; manager: string; locations: string[] }
export interface Brand { id: string; tag: string; supplier: string }
export interface PricePoint { date: string; price: number; by: string }
export interface Product {
  sku: string; name: string; brand: string; category: string; variant: string; size: string;
  cartonPacks: number; packBars: number; baseUnit: string; cost4: number; price: number; min: number;
  batch: boolean; expiryWarn: number; barcode: string; status: string; priceHistory: PricePoint[];
}
export interface Balance { wh: WarehouseId; sku: string; sellable: number; reserved: number; damaged: number; quarantined: number; inTransit: number; avg: number; last: string }
export interface Batch { id: string; wh: WarehouseId; sku: string; batch: string; mfg: string; exp: string; qty: number; bucket: string; days?: number }
export interface Supplier { id: string; name: string; contact: string; phone: string; email: string; address: string; terms: number; brands: string[] }
export interface Customer { id: string; name: string; type: string; contact: string; phone: string; city: string; address: string; terms: number; limit: number; since: string }
export interface User { id: string; name: string; role: RoleKey; wh: string[]; status: string; email: string; last: string }
export interface Line { sku: string; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Doc { id: string; status: string; lines: Line[]; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Invoice { id: string; so: string; dsp?: string; customer: string; wh: WarehouseId; date: string; due: string; lines: Line[]; total: number; paid: number; credited: number; cogs?: number; note?: string }
export interface Movement { id: string; ts: string; type: string; wh: WarehouseId; sku: string; qty: number; bucket: string; cost4: number; ref: string; user: string; after?: number }
export interface AuditEntry { id: string; ts: string; user: string; action: string; ref: string; detail: string }
export interface DayFigures { rev: number; cogs: number; rcv: number; dsp: number }

export interface Settings {
  expiryWarnDays: number; blindCountDefault: boolean; allowNegative: boolean; maxDiscountPct: number; creditCheck: boolean;
  paymentMethods: string[]; expenseCategories: string[]; currency: string; company: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SoapState {
  v: number; currentUser: string; warehouse: string; route: Route;
  warehouses: Warehouse[]; brands: Brand[]; products: Product[]; balances: Record<string, Balance>; batches: Batch[];
  suppliers: Supplier[]; customers: Customer[]; users: User[];
  pos: Doc[]; receipts: Doc[]; transfers: Doc[]; salesOrders: Doc[]; dispatches: Doc[];
  invoices: Invoice[]; payments: any[]; creditNotes: any[]; supplierInvoices: any[]; supplierPayments: any[];
  expenses: any[]; adjustments: any[]; counts: Doc[]; movements: Movement[]; costLog: any[];
  series: Record<string, Record<string, DayFigures>>; audit: AuditEntry[]; settings: Settings; seq: Record<string, number>;
}

export type Result = { ok: true; msg: string; ref?: string; [k: string]: any } | { ok: false; error: string; errs?: Record<string, string> };
export type ToastKind = "success" | "error" | "info" | "warn";
export interface Toast { id: number; kind: ToastKind; title: string; msg: string; ref: string }
export interface ConfirmConfig {
  title: string; body: string; confirmLabel: string; danger?: boolean; reasonLabel?: string;
  onConfirm?: (reason: string) => void;
}
export interface StockRow {
  sku: string; wh: string; sellable: number; reserved: number; damaged: number; quarantined: number; inTransit: number;
  value: number; avg: number; last: string; min: number; physical: number; available: number; reorder: string;
}
export interface Approval { type: string; ref: string; title: string; sub: string; route: Route; wh?: string }
export interface Exception { kind: string; ref: string; text: string; route: Route }
export interface SearchResult { type: string; ref: string; label: string; sub: string; route: Route }
export interface Period extends DayFigures { gp: number; margin: number; daily: (DayFigures & { date: string })[] }
export interface Page<T> { rows: T[]; page: number; pages: number; total: number; label: string; hasPrev: boolean; hasNext: boolean }

export interface SoapStore {
  readonly s: SoapState;
  readonly version: number;
  hooks: { onNavigate: ((route: Route) => void) | null };
  ui: { toasts: Toast[]; confirm: ConfirmConfig | null; loading: boolean };
  TODAY: string;
  ROLES: Record<RoleKey, { name: string; perms: string[]; readonly?: boolean }>;
  PERMS: string[];
  PERM_LABELS: Record<string, string>;
  WH: WarehouseId[];
  STATUS_TONE: Record<string, Tone>;
  tones: Record<Tone, [string, string]>;
  subscribe(fn: () => void): () => void;
  emit(): void;

  // lookups & formatting
  prod(sku: string): Product;
  bpc(sku: string): number;
  wh(id: string): Warehouse;
  cust(id: string): Customer;
  sup(id: string): Supplier;
  user(id?: string): User;
  uname(id?: string): string;
  role(): { name: string; perms: string[]; readonly?: boolean };
  can(perm: string): boolean;
  canView(perm: string): boolean;
  allowedWh(): WarehouseId[];
  hasAllWh(): boolean;
  scope(): WarehouseId[];
  inScope(w: string): boolean;
  money(pesewas: number): string;
  moneyShort(pesewas: number): string;
  cost(c4: number): string;
  valueOf(qty: number, c4: number): number;
  qty(sku: string, bars: number | null | undefined): string;
  toBars(sku: string, n: number | string, unit: string): number;
  fmtDate(iso?: string): string;
  badge(status: string): { bg: string; fg: string };
  commas(n: number): string;
  addDays(iso: string, d: number): string;
  diffDays(a: string, b: string): number;
  bal(w: string, sku: string): Balance;
  avail(w: string, sku: string): number;
  invStatus(i: Invoice): string;
  invBal(i: Invoice): number;
  custBalance(id: string): number;
  soTotal(so: Doc): number;
  poTotals(po: Doc): { sub: number; disc: number; tax: number; total: number };
  poReceived(poId: string, sku: string): number;
  poInvoiced(poId: string, sku: string): number;
  poDelivery(po: Doc): string;
  sinvMatch(s: any): string[];
  expiredSellable(w: string, sku: string): number;

  // actions
  setUser(id: string): void;
  setWarehouse(w: string): void;
  nav(name: string, params?: Partial<Route>, opts?: { silent?: boolean }): void;
  toast(kind: ToastKind, title: string, msg?: string, ref?: string): void;
  dismissToast(id: number): void;
  confirm(cfg: ConfirmConfig): void;
  closeConfirm(): void;
  result(r: Result, title?: string): Result;
  reset(): void;
  productSave(p: any, isNew: boolean): Result;
  receiptSave(d: any, submit?: boolean): Result;
  receiptPost(id: string): Result;
  receiptStatus(id: string, status: string): Result;
  receiptReject(id: string, reason: string): Result;
  transferSave(d: any, submit?: boolean): Result;
  transferAct(id: string, action: string, data?: any): Result;
  poSave(d: any, submit?: boolean): Result;
  poAct(id: string, action: string, reason?: string): Result;
  soSave(d: any, confirm?: boolean): Result;
  soAct(id: string, action: string, reason?: string): Result;
  dispatchStart(soId: string): Result;
  dispatchVerify(id: string, lines: any): Result;
  dispatchHandover(id: string, data: any): Result;
  dispatchAssign(id: string, driver: string, vehicle: string): Result;
  dispatchOut(id: string): Result;
  dispatchDeliver(id: string, data: any): Result;
  paymentRecord(d: any): Result;
  paymentAct(id: string, action: string, reason?: string): Result;
  creditNote(invId: string, amount: number, reason: string): Result;
  supplierPayment(d: any): Result;
  expenseSave(d: any): Result;
  expenseAct(id: string, action: string, reason?: string): Result;
  adjRequest(d: any): Result;
  adjAct(id: string, action: string, note?: string): Result;
  countCreate(d: any): Result;
  countSet(id: string, i: number, counted?: number | null, reason?: string): Result;
  countRecount(id: string, i: number): Result;
  countSubmit(id: string): Result;
  userSave(id: string, patch: any): Result;
  userCreate(d: any): Result;
  settingsSave(patch: Partial<Settings>): Result;

  // derived views
  stockRows(opts?: { consolidated?: boolean; whs?: string[] }): StockRow[];
  lowStock(): StockRow[];
  expiring(): (Batch & { days: number })[];
  approvals(): Approval[];
  exceptions(): Exception[];
  period(days: number, whs?: string[]): Period;
  search(q: string): SearchResult[];
  paginate<T>(rows: T[], page: number, size: number): Page<T>;
  sort<T>(rows: T[], key: string | null | undefined, dir?: "asc" | "desc" | string): T[];
  csv(name: string, cols: string[], rows: (string | number | null | undefined)[][]): void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
