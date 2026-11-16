/* Local shapes for the supplier-side finance collections the engine types as `any[]`.
   Customer invoices, payments and credit notes are typed by the store (see lib/store/types.ts). */

export interface SupplierAlloc { inv: string; amount: number }

export interface SupplierInvoice { id: string; supplier: string; po: string; grn?: string; due: string; total: number; paid: number; lines: { sku: string; qty: number }[] }

export interface SupplierPayment { id: string; supplier: string; date: string; amount: number; method: string; ref: string; alloc: SupplierAlloc[]; by: string }

export interface Expense {
  id: string; date: string; category: string; wh: string; amount: number; method: string; ref?: string; description: string;
  evidence?: string; status: string; by: string; approvedBy?: string; note?: string;
}
