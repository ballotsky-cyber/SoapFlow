"use client";

import * as React from "react";
import { useSoap } from "@/lib/store";
import type { ModuleProps } from "@/components/app/modules";
import { PayablesView } from "./invoices-view";
import { ExpensesView } from "./expenses-view";

/** Finance module: "payables" (supplier invoices & payments) or "expenses" (operating expenses). Customer invoicing lives in Sales. */
export default function FinancePage({ view }: ModuleProps) {
  const S = useSoap();
  const id = S.s.route.id;
  // Old deep links to customer invoices / payments (finance/INV-…) now open in Sales.
  const legacy = view !== "expenses" && typeof id === "string" ? (id.startsWith("INV-") ? "invoices" : id.startsWith("PAY-") ? "payments" : "") : "";
  React.useEffect(() => {
    if (legacy) S.nav(legacy, { id }, { silent: false });
  }, [legacy, id, S]);
  if (legacy) return null;
  return view === "expenses" ? <ExpensesView /> : <PayablesView />;
}
