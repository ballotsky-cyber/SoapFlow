/* Local shapes for the finance collections the engine types as `any[]`. */

export interface Alloc { inv: string; amount: number }

export interface Payment {
  id: string; customer: string; date: string; amount: number; method: string; extRef: string; by: string;
  alloc: Alloc[]; status: string; notes?: string; evidence?: string; unallocated?: number; verifiedBy?: string; reversal?: string;
}

export interface CreditNote { id: string; inv: string; customer: string; date: string; amount: number; reason: string; by: string }

export interface SupplierInvoice { id: string; supplier: string; po: string; grn?: string; due: string; total: number; paid: number; lines: { sku: string; qty: number }[] }

export interface SupplierPayment { id: string; supplier: string; date: string; amount: number; method: string; ref: string; alloc: Alloc[]; by: string }

export interface Expense {
  id: string; date: string; category: string; wh: string; amount: number; method: string; ref?: string; description: string;
  evidence?: string; status: string; by: string; approvedBy?: string; note?: string;
}
