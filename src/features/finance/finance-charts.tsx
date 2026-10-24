"use client";

import { useSoap, type Invoice } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const AGING = [
  { label: "Current", bar: "bg-primary" },
  { label: "1–30 days", bar: "bg-warning/60" },
  { label: "31–60 days", bar: "bg-warning" },
  { label: "60+ days", bar: "bg-danger" },
];

/** Status → token colour (CSS variable for the conic gradient, class for the legend swatch). */
const MIX: { label: string; v: string; sw: string }[] = [
  { label: "Paid", v: "var(--success)", sw: "bg-success" },
  { label: "Partially Paid", v: "var(--warning)", sw: "bg-warning" },
  { label: "Unpaid", v: "var(--subtle-foreground)", sw: "bg-subtle-foreground" },
  { label: "Overdue", v: "var(--danger)", sw: "bg-danger" },
  { label: "Credited", v: "var(--violet)", sw: "bg-violet" },
];

/** Receivables aging bars + invoice status donut for the invoices in scope. */
export function FinanceCharts({ inv }: { inv: Invoice[] }) {
  const S = useSoap();
  const ag = [0, 0, 0, 0];
  inv.forEach((i) => {
    const b = S.invBal(i);
    if (b <= 0) return;
    const od = S.diffDays(S.TODAY, i.due);
    ag[od <= 0 ? 0 : od <= 30 ? 1 : od <= 60 ? 2 : 3] += b;
  });
  const agM = Math.max(1, ...ag);

  const mix = MIX.map((m) => ({ ...m, n: inv.filter((i) => S.invStatus(i) === m.label).length })).filter((m) => m.n);
  const tot = mix.reduce((a, m) => a + m.n, 0) || 1;
  let acc = 0;
  const donut =
    "conic-gradient(" +
    (mix.length
      ? mix
          .map((m) => {
            const a = acc;
            acc += (m.n / tot) * 360;
            return `${m.v} ${a.toFixed(1)}deg ${acc.toFixed(1)}deg`;
          })
          .join(", ")
      : "var(--muted) 0deg 360deg") +
    ")";

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader title="Receivables aging" description="Outstanding customer balances by days past due" />
        <CardContent className="flex flex-col gap-2">
          <div className="flex h-[150px] items-end gap-3 border-b px-1.5 sm:gap-4">
            {AGING.map((a, i) => (
              <div key={a.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11.5px] font-semibold whitespace-nowrap tabular">{S.moneyShort(ag[i])}</span>
                <div title={S.moneyShort(ag[i])} className={cn("min-h-[3px] w-full max-w-16 rounded-t-md", a.bar)} style={{ height: `${Math.round((ag[i] / agM) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 px-1.5 sm:gap-4">
            {AGING.map((a) => (
              <span key={a.label} className="min-w-0 flex-1 text-center text-[11.5px] text-muted-foreground">{a.label}</span>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Invoice status mix" description="Count of customer invoices in scope" />
        <CardContent className="flex flex-wrap items-center gap-5">
          <div className="relative size-[140px] shrink-0 rounded-full" style={{ background: donut }}>
            <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card">
              <span className="text-[22px] font-semibold tabular">{inv.length}</span>
              <span className="text-[11px] text-muted-foreground">invoices</span>
            </div>
          </div>
          <div className="flex min-w-[140px] flex-1 flex-col gap-2">
            {mix.map((m) => (
              <div key={m.label} className="flex justify-between gap-2 text-[12.5px]">
                <span className="flex items-center gap-2 text-secondary-foreground">
                  <span className={cn("size-2.5 rounded-[3px]", m.sw)} />
                  {m.label}
                </span>
                <span className="font-semibold tabular">{m.n}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
