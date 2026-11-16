"use client";

import * as React from "react";
import { ChartColumn, Download, Lock, TrendingUp } from "lucide-react";
import { useSoap } from "@/lib/store";
import type { ModuleProps } from "@/components/app/modules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Page, PageHeader, StatCard } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { REPORT_DESC, REPORT_GROUPS, SALES_GROUPS } from "./report-defs";
import { buildReport, type ReportOut } from "./build-report";
import { ReportChart } from "./report-chart";

interface Filters {
  rep: string;
  from: string;
  to: string;
  /** Active preset in days (0 = month to date, -1 = custom range). */
  preset: number;
  wh: string;
  brand: string;
  sku: string;
  customer: string;
}

const PRESETS = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "0", label: "MTD" },
];

const clock = () => new Date().toTimeString().slice(0, 5);

/** Reports module. view "sales" (Sales → Sales reports) shows only the sales & receivables groups. */
export default function ReportsPage({ view }: ModuleProps) {
  const S = useSoap();
  const s = S.s;
  const sales = view === "sales";
  const groups = sales ? SALES_GROUPS : REPORT_GROUPS;
  const reports = groups.flatMap((g) => g.items);
  const [f, setF] = React.useState<Filters>(() => ({
    rep: typeof s.route.report === "string" && reports.some((r) => r.key === s.route.report) ? s.route.report : sales ? "sales-customer" : "stock",
    from: S.addDays(S.TODAY, -29),
    to: S.TODAY,
    preset: 30,
    wh: "SCOPE",
    brand: "",
    sku: "",
    customer: "",
  }));
  const [gen, setGen] = React.useState(false);
  const [genAt, setGenAt] = React.useState(clock);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  /** Apply a filter change and show the brief "Generating report…" state, as the prototype does. */
  const regen = (patch: Partial<Filters>) => {
    setF((x) => ({ ...x, ...patch }));
    setGen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setGen(false);
      setGenAt(clock());
    }, 350);
  };

  const cur = reports.find((x) => x.key === f.rep) ?? reports[0];
  const locked = !S.canView(cur.perm);
  const whs = f.wh === "SCOPE" ? S.scope() : [f.wh];
  const out: ReportOut = locked ? { cols: [], rows: [], raw: [], summary: [] } : buildReport(cur.key, S, whs, f.from, f.to, cur.usesProduct ? f.brand : "", cur.usesProduct ? f.sku : "", cur.usesCustomer ? f.customer : "");
  const exp = (ext: "csv" | "xls") => () =>
    S.csv("report-" + cur.key + "-" + f.from + "-to-" + f.to + (ext === "xls" ? "-excel" : ""), out.cols.map((c) => c.label), out.raw);

  const whOpts = [{ value: "SCOPE", label: s.warehouse === "ALL" ? "All permitted warehouses" : "Current: " + S.wh(s.warehouse).name }, ...S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }))];
  const skus = s.products.filter((p) => !f.brand || p.brand === f.brand).map((p) => p.sku);

  return (
    <Page>
      <PageHeader
        icon={sales ? ChartColumn : TrendingUp}
        title={sales ? "Sales reports" : "Reports"}
        description={
          sales
            ? "Sales, estimates, invoices, collections and receivables — computed from issued documents. Filter by date, warehouse and customer; export to CSV or Excel."
            : "Operational and financial reports from demonstration data. Revenue, inventory value, gross profit, expenses, receivables and payables are reported separately."
        }
      />
      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Report picker: list on desktop, select on phones/tablets */}
        <Card className="no-print hidden flex-col gap-0.5 p-2 lg:flex">
          {groups.map((g) => (
            <React.Fragment key={g.label}>
              <div className="px-2 pt-2 pb-1 text-[10.5px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">{g.label}</div>
              {g.items.map((r) => {
                const active = r.key === cur.key;
                const can = S.canView(r.perm);
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => regen({ rep: r.key })}
                    aria-current={active || undefined}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-1.5 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                      active ? "bg-primary-soft font-semibold text-primary-soft-foreground" : can ? "hover:bg-muted" : "text-subtle-foreground hover:bg-muted",
                    )}
                  >
                    {r.label}
                    {!can && <Lock className="size-3.5 shrink-0 text-subtle-foreground" />}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </Card>
        <Select
          className="no-print lg:hidden"
          aria-label="Report"
          value={cur.key}
          onValueChange={(v) => regen({ rep: v })}
          options={reports.map((r) => ({ value: r.key, label: (groups.find((g) => g.items.includes(r))?.label ?? "") + " · " + r.label + (S.canView(r.perm) ? "" : " (restricted)") }))}
        />

        <div className="flex min-w-0 flex-col gap-3">
          <Card className="flex flex-col gap-2.5 px-3.5 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{cur.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{REPORT_DESC[cur.key]}</div>
              </div>
              <div className="no-print flex gap-1.5">
                <Button variant="outline" size="sm" onClick={exp("csv")} disabled={locked}>
                  <Download />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exp("xls")} disabled={locked}>
                  Excel
                </Button>
              </div>
            </div>
            <div className="no-print flex flex-wrap items-center gap-2 border-t pt-2.5">
              {cur.usesDate && (
                <>
                  <SegmentedControl
                    value={String(f.preset)}
                    onValueChange={(v) => {
                      const d = Number(v);
                      regen({ preset: d, from: d ? S.addDays(S.TODAY, -(d - 1)) : S.TODAY.slice(0, 8) + "01", to: S.TODAY });
                    }}
                    items={PRESETS}
                    className="w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
                  />
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <DatePicker size="sm" value={f.from} max={f.to} onChange={(v) => v && regen({ from: v, preset: -1 })} className="flex-1 sm:w-36 sm:flex-none" />
                    <span className="text-muted-foreground">to</span>
                    <DatePicker size="sm" value={f.to} min={f.from} onChange={(v) => v && regen({ to: v, preset: -1 })} className="flex-1 sm:w-36 sm:flex-none" />
                  </div>
                </>
              )}
              <Select size="sm" aria-label="Warehouse" value={f.wh} onValueChange={(v) => regen({ wh: v })} options={whOpts} className="w-full sm:w-56" />
              {cur.usesCustomer && (
                <Select size="sm" aria-label="Customer" value={f.customer} onValueChange={(v) => regen({ customer: v })} options={[{ value: "", label: "All customers" }, ...s.customers.map((c) => ({ value: c.id, label: c.name }))]} className="w-full sm:w-52" />
              )}
              {cur.usesProduct && (
                <>
                  <Select size="sm" aria-label="Brand" value={f.brand} onValueChange={(v) => regen({ brand: v, sku: "" })} options={[{ value: "", label: "All brands" }, ...s.brands.map((b) => b.id)]} className="w-[calc(50%-4px)] sm:w-36" />
                  <Select size="sm" aria-label="Product" value={f.sku} onValueChange={(v) => regen({ sku: v })} options={[{ value: "", label: "All products" }, ...skus]} className="w-[calc(50%-4px)] sm:w-44" />
                </>
              )}
            </div>
          </Card>

          {locked && (
            <Card className="flex flex-col items-center px-6 py-10 text-center text-muted-foreground">
              <Lock className="size-7 text-warning" />
              <div className="mt-1.5 mb-1 font-semibold text-foreground">Restricted report</div>
              Your role ({S.role().name}) cannot view this report. Financial and cost data are protected by role; the API enforces the same rule.
            </Card>
          )}

          {!locked && gen && (
            <Card className="flex flex-col gap-2.5 p-4">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-[200px]" />
              <div className="text-xs text-muted-foreground">Generating report…</div>
            </Card>
          )}

          {!locked && !gen && (
            <>
              {out.summary.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
                  {out.summary.map((k) => (
                    <StatCard key={k.k} label={k.k} value={k.v} sub={k.s} tone={k.tone ?? "default"} className="p-3 [&>div:nth-child(2)]:text-[17px]" />
                  ))}
                </div>
              )}
              {out.chart && <ReportChart bars={out.chart} title={out.chartTitle} legend={out.chartLegend} from={S.fmtDate(f.from)} to={S.fmtDate(f.to)} yLabel={S.moneyShort} />}
              <Card className="overflow-hidden">
                <Table wrapperClassName="max-h-[560px] overflow-auto">
                  <THead>
                    <tr>
                      {out.cols.map((c, i) => (
                        <TH key={c.label + i} align={c.align} className="sticky top-0 z-10 bg-muted">
                          {c.label}
                        </TH>
                      ))}
                    </tr>
                  </THead>
                  <TBody>
                    {out.rows.map((r, i) => (
                      <TR key={i}>
                        {r.map((c, j) => (
                          <TD key={j} nowrap align={c.align} className={cn("py-2 tabular", c.cls, c.bold && "font-semibold")}>
                            {c.v}
                          </TD>
                        ))}
                      </TR>
                    ))}
                  </TBody>
                </Table>
                {!out.rows.length && (
                  <div className="px-6 py-9 text-center text-muted-foreground">
                    <div className="mb-1 font-semibold text-foreground">No data for these filters</div>
                    Widen the date range or choose another warehouse.
                  </div>
                )}
                <div className="flex flex-wrap justify-between gap-2 border-t px-3 py-2 text-[11.5px] text-muted-foreground">
                  <span>{out.rows.length} rows</span>
                  <span>
                    Generated {S.fmtDate(S.TODAY)} {genAt} · demonstration data · GET /api/reports/{cur.key}
                  </span>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
