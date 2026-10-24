"use client";

import * as React from "react";
import { useSoap, type DayFigures, type SoapStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Grid } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { Donut, LegendDot, PairedBars, type Swatch, TrendChart } from "./charts";

export const AWAITING_STATUSES = ["Confirmed", "Ready for Collection", "Ready for Dispatch", "Partially Fulfilled", "Pending Approval"];

type Bucket = DayFigures & { date: string };

/** Daily buckets for the chosen period (14 days for "Today"; weekly buckets for 90 days). */
function periodBuckets(S: SoapStore, per: number, sc: string[]): Bucket[] {
  let buckets: Bucket[] = per === 1 ? S.period(14, sc).daily : S.period(per, sc).daily;
  if (per === 90) {
    const w: Bucket[] = [];
    for (let i = 0; i < buckets.length; i += 7) {
      const ch = buckets.slice(i, i + 7);
      w.push(ch.reduce((a, d) => ({ date: a.date || d.date, rev: a.rev + d.rev, cogs: a.cogs + d.cogs, rcv: a.rcv + d.rcv, dsp: a.dsp + d.dsp }), { date: "", rev: 0, cogs: 0, rcv: 0, dsp: 0 }));
    }
    buckets = w;
  }
  return buckets;
}

const sw = (stroke: string, bg: string): Swatch => ({ stroke, bg });
const SW = {
  primary: sw("stroke-primary", "bg-primary"),
  primary70: sw("stroke-primary/70", "bg-primary/70"),
  primary45: sw("stroke-primary/45", "bg-primary/45"),
  primary25: sw("stroke-primary/25", "bg-primary/25"),
  success: sw("stroke-success", "bg-success"),
  warning: sw("stroke-warning", "bg-warning"),
  violet: sw("stroke-violet", "bg-violet"),
  violet50: sw("stroke-violet/50", "bg-violet/50"),
  neutral: sw("stroke-muted-foreground/60", "bg-muted-foreground/60"),
  neutralLight: sw("stroke-muted-foreground/25", "bg-muted-foreground/25"),
};

const ORDER_GROUPS: [string, string[], Swatch][] = [
  ["Draft", ["Draft"], SW.neutralLight],
  ["Needs approval", ["Pending Approval"], SW.warning],
  ["Confirmed", ["Confirmed"], SW.primary],
  ["Ready", ["Ready for Collection", "Ready for Dispatch"], SW.primary45],
  ["Partially fulfilled", ["Partially Fulfilled"], SW.violet50],
  ["Dispatched", ["Dispatched"], SW.violet],
  ["Delivered / completed", ["Delivered", "Completed"], SW.success],
  ["Cancelled", ["Cancelled"], SW.neutral],
];
const BRAND_SW = [SW.primary, SW.primary70, SW.primary45, SW.primary25];

export function FinanceCharts({ per, plabel }: { per: number; plabel: string }) {
  const S = useSoap();
  const sc = S.scope();
  const buckets = periodBuckets(S, per, sc);
  const bRev = buckets.reduce((a, d) => a + d.rev, 0);
  const bC = buckets.reduce((a, d) => a + d.cogs, 0);
  const so = S.s.salesOrders.filter((o) => sc.includes(o.wh));
  const legend = ORDER_GROUPS.map(([label, ss, swatch]) => ({ label, swatch, n: so.filter((o) => ss.includes(o.status)).length })).filter((x) => x.n);
  const open = so.filter((o) => AWAITING_STATUSES.includes(o.status)).length;
  const stats = [
    { k: "Revenue", v: S.moneyShort(bRev), cls: "text-primary" },
    { k: "Cost of goods sold", v: S.moneyShort(bC), cls: "text-muted-foreground" },
    { k: "Gross profit", v: S.moneyShort(bRev - bC), cls: "text-success" },
    { k: "Gross margin", v: (bRev ? Math.round(((bRev - bC) * 1000) / bRev) / 10 : 0) + "%", cls: "" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
      <Card className="min-w-0 xl:col-span-2">
        <CardHeader
          className="border-b-0 pb-1"
          title="Revenue and gross profit"
          description={(per === 90 ? "Weekly" : "Daily") + " · " + (per === 1 ? "last 14 days" : plabel)}
          actions={
            <span className="flex flex-wrap gap-3.5 text-[11.5px] text-muted-foreground">
              <LegendDot line swatch={SW.primary} label="Revenue" />
              <LegendDot line swatch={SW.success} label="Gross profit" />
              <LegendDot line swatch={SW.neutral} label="COGS" />
            </span>
          }
        />
        <CardContent className="pt-2">
          <TrendChart
            yLabel={S.moneyShort}
            points={buckets.map((d) => ({
              date: d.date,
              rev: d.rev,
              cogs: d.cogs,
              title: S.fmtDate(d.date) + (per === 90 ? " (week)" : "") + " — revenue " + S.moneyShort(d.rev) + ", COGS " + S.moneyShort(d.cogs) + ", gross profit " + S.moneyShort(d.rev - d.cogs),
            }))}
          />
          <div className="mt-1.5 flex justify-between pl-14 text-[11px] text-subtle-foreground">
            <span>{S.fmtDate(buckets[0]?.date)}</span>
            <span>{per === 90 ? "Weekly buckets" : S.fmtDate(S.TODAY)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {stats.map((t) => (
              <div key={t.k} className="rounded-lg bg-muted/70 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">{t.k}</div>
                <div className={cn("text-[15px] font-semibold tabular", t.cls)}>{t.v}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader className="border-b-0 pb-1" title="Orders by status" description={so.length + " orders in scope"} />
        <CardContent className="flex flex-wrap items-center gap-5 pt-2">
          <Donut center={<span className="text-2xl">{open}</span>} sub="open" slices={legend.map((l) => ({ key: l.label, n: l.n, swatch: l.swatch, title: l.label + ": " + l.n + " orders" }))} />
          <div className="flex min-w-[140px] flex-1 flex-col gap-2">
            {legend.map((l) => (
              <div key={l.label} className="flex justify-between gap-2 text-[12.5px]">
                <LegendDot swatch={l.swatch} label={l.label} />
                <span className="font-semibold tabular">{l.n}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StockCharts({ per }: { per: number }) {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();
  const costV = S.canView("cost.view");
  const rows = S.stockRows();

  const whStats = sc.map((w) => {
    const o = { w, avail: 0, res: 0, hold: 0, val: 0, tot: 0 };
    rows.filter((x) => x.wh === w).forEach((x) => {
      o.avail += x.available;
      o.res += x.reserved;
      o.hold += x.damaged + x.quarantined;
      o.val += x.value;
    });
    o.tot = o.avail + o.res + o.hold;
    return o;
  });
  const mw = Math.max(1, ...whStats.map((o) => o.tot));

  const brandStats = s.brands.map((b, i) => {
    const r = rows.filter((x) => S.prod(x.sku).brand === b.id);
    return { name: b.id, tag: b.tag, swatch: BRAND_SW[i % 4], skus: s.products.filter((p) => p.brand === b.id).length, val: costV ? r.reduce((a, x) => a + x.value, 0) : r.reduce((a, x) => a + x.sellable, 0) };
  });
  const tb = brandStats.reduce((a, b) => a + b.val, 0) || 1;
  const fmtVal = (v: number) => (costV ? S.moneyShort(v) : S.commas(v) + " bars");

  const buckets = periodBuckets(S, per, sc);

  return (
    <Grid min={420} className="gap-3.5">
      <Card className="min-w-0">
        <CardHeader className="border-b-0 pb-1" title="Stock levels by warehouse" description={costV ? "Stock value at cost" : "Quantity in bars"} />
        <CardContent className="flex flex-col gap-3.5 pt-2">
          {whStats.map((o) => (
            <button
              key={o.w}
              type="button"
              title={S.wh(o.w).name + " — open stock overview"}
              onClick={() => {
                S.setWarehouse(o.w);
                S.nav("inventory");
              }}
              className="-mx-2 flex cursor-pointer flex-col gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-muted/60"
            >
              <span className="flex w-full justify-between gap-2 text-[12.5px]">
                <span className="font-medium">{S.wh(o.w).name}</span>
                <span className="font-semibold tabular">{costV ? S.moneyShort(o.val) : S.commas(o.tot) + " bars"}</span>
              </span>
              <span className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-md bg-muted">
                <span title={"Available " + S.commas(o.avail)} className="rounded-md bg-primary" style={{ width: (o.avail / mw) * 100 + "%" }} />
                <span title={"Reserved " + S.commas(o.res)} className="rounded-md bg-primary/40" style={{ width: (o.res / mw) * 100 + "%" }} />
                <span title={"Damaged / quarantined " + S.commas(o.hold)} className="rounded-md bg-warning" style={{ width: (o.hold / mw) * 100 + "%" }} />
              </span>
              <span className="text-[11.5px] text-muted-foreground">{S.commas(o.avail) + " available · " + S.commas(o.res) + " reserved · " + S.commas(o.hold) + " held"}</span>
            </button>
          ))}
          <div className="flex flex-wrap gap-3.5 border-t pt-2 text-[11.5px] text-muted-foreground">
            <LegendDot swatch={SW.primary} label="Available" />
            <LegendDot swatch={sw("", "bg-primary/40")} label="Reserved" />
            <LegendDot swatch={SW.warning} label="Damaged / quarantined" />
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="border-b-0 pb-1" title="Inventory distribution by brand" description={costV ? "Share of sellable value at cost" : "Share of sellable quantity"} />
        <CardContent className="flex flex-wrap items-center gap-5 pt-2">
          <Donut center={costV ? S.moneyShort(tb) : S.commas(tb)} sub="total" slices={brandStats.map((b) => ({ key: b.name, n: b.val, swatch: b.swatch, title: b.name + ": " + fmtVal(b.val) + " (" + Math.round((b.val / tb) * 100) + "%)" }))} />
          <div className="flex min-w-[180px] flex-1 flex-col gap-2.5">
            {brandStats.map((b) => (
              <div key={b.name} className="flex items-center justify-between gap-2.5 text-[12.5px]">
                <span className="flex items-center gap-2">
                  <span className={cn("size-2.5 shrink-0 rounded-[3px]", b.swatch.bg)} />
                  <span className="flex flex-col leading-tight">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-[11px] text-muted-foreground">{b.tag} · {b.skus} SKUs</span>
                  </span>
                </span>
                <span className="text-right tabular">
                  <b>{Math.round((b.val / tb) * 100)}%</b>
                  <div className="text-[11px] text-muted-foreground">{fmtVal(b.val)}</div>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader
          className="border-b-0 pb-1"
          title="Sales and supply volume"
          description="Quantity in bars"
          actions={
            <span className="flex gap-3 text-[11.5px] text-muted-foreground">
              <LegendDot swatch={SW.primary} label="Dispatched" />
              <LegendDot swatch={sw("", "bg-muted-foreground/35")} label="Received" />
            </span>
          }
        />
        <CardContent className="pt-2">
          <PairedBars
            yLabel={(v) => (v >= 1000 ? Math.round(v / 100) / 10 + "k" : String(v))}
            bars={buckets.map((d, i) => ({
              key: d.date + i,
              a: d.dsp,
              b: d.rcv,
              highlight: d.date === S.TODAY,
              title: S.fmtDate(d.date) + (per === 90 ? " (week)" : "") + " — dispatched " + S.commas(d.dsp) + " bars, received " + S.commas(d.rcv) + " bars",
            }))}
          />
          <div className="mt-1.5 flex justify-between pl-12 text-[11px] text-subtle-foreground">
            <span>{S.fmtDate(buckets[0]?.date)}</span>
            <span>{per === 90 ? "Weekly buckets" : S.fmtDate(S.TODAY)}</span>
          </div>
        </CardContent>
      </Card>
    </Grid>
  );
}
