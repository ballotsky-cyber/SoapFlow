"use client";

import * as React from "react";
import { ArrowLeftRight, ArrowUpDown, Inbox, type LucideIcon, Package, ShoppingCart, SlidersHorizontal, Truck, Undo2 } from "lucide-react";
import { useSoap, type StockRow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TR } from "@/components/ui/table";
import { Grid, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { IconTitle } from "./section-title";

const moveIcon = (type: string): LucideIcon =>
  /Receipt|receipt/.test(type) ? Inbox : /Transfer|transit/.test(type) ? ArrowLeftRight : /dispatch/i.test(type) ? Truck : /return/i.test(type) ? Undo2 : SlidersHorizontal;

function HeaderLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="link" onClick={onClick} className="h-auto px-0 text-xs">
      {children}
    </Button>
  );
}

export function RecentActivity({ low }: { low: StockRow[] }) {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();

  const movements = s.movements.filter((m) => sc.includes(m.wh)).slice(0, 8);
  const orders = s.salesOrders
    .filter((o) => sc.includes(o.wh))
    .sort((a, b) => (a.id < b.id ? 1 : -1))
    .slice(0, 6);
  const lowList = low
    .slice()
    .sort((a, b) => a.available - b.available)
    .slice(0, 5);

  return (
    <Grid min={520} className="gap-3.5">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader title={<IconTitle icon={ArrowUpDown}>Recent stock movements</IconTitle>} actions={<HeaderLink onClick={() => S.nav("inventory", { tab: "ledger" })}>Open ledger</HeaderLink>} />
        <Table>
          <TBody>
            {movements.map((m) => {
              const neg = m.qty < 0;
              const Icon = moveIcon(m.type);
              return (
                <TR key={m.id}>
                  <TD className="w-10 py-2 pr-0">
                    <span className={cn("flex size-7 items-center justify-center rounded-lg", neg ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
                      <Icon className="size-4" />
                    </span>
                  </TD>
                  <TD nowrap className="py-2">
                    <div>
                      {m.type} · <span className="font-mono text-[11.5px]">{m.sku}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{S.wh(m.wh).name + " · " + m.bucket} · {S.fmtDate(m.ts)}</div>
                  </TD>
                  <TD nowrap align="right" className={cn("py-2 font-semibold", neg ? "text-danger" : "text-success")}>
                    {(m.qty > 0 ? "+" : "") + S.qty(m.sku, m.qty)}
                  </TD>
                  <TD nowrap align="right" className="py-2">
                    <Ref>{m.ref}</Ref>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <div className="flex min-w-0 flex-col gap-3.5">
        <Card className="overflow-hidden">
          <CardHeader title={<IconTitle icon={ShoppingCart}>Recent orders</IconTitle>} actions={<HeaderLink onClick={() => S.nav("sales-orders")}>All orders</HeaderLink>} />
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => S.nav("sales-orders", { id: o.id })}
              className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-1 border-b px-4 py-2.5 text-left last:border-0 hover:bg-muted/60"
            >
              <span className="truncate text-[12.5px]">
                <span className="font-mono text-[11.5px] text-primary">{o.id}</span> · {S.cust(o.customer).name}
              </span>
              <StatusBadge status={o.status} className="justify-self-end" />
              <span className="truncate text-[11.5px] text-muted-foreground">{S.wh(o.wh).name + " · " + o.method + " · " + o.terms}</span>
              <span className="justify-self-end text-xs font-medium tabular">{S.money(S.soTotal(o))}</span>
            </button>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title={<IconTitle icon={Package} tone="warning">Low-stock alerts</IconTitle>} actions={<HeaderLink onClick={() => S.nav("inventory", { filter: "low" })}>View all {low.length}</HeaderLink>} />
          {lowList.map((r) => {
            const pct = r.min ? Math.min(100, Math.round((r.available / r.min) * 100)) : 0;
            return (
              <div key={r.wh + r.sku} className="flex flex-col gap-1.5 border-b px-4 py-2.5 last:border-0" title={S.prod(r.sku).name + " — " + pct + "% of minimum"}>
                <div className="flex items-center justify-between gap-2.5">
                  <span className="truncate text-[12.5px]">
                    {S.prod(r.sku).name} <span className="text-muted-foreground">· {S.wh(r.wh).name}</span>
                  </span>
                  <StatusBadge status={r.reorder} />
                </div>
                <Progress value={Math.max(pct, 3)} tone={r.reorder === "Out of stock" ? "danger" : "warning"} />
                <div className="text-[11px] text-muted-foreground">
                  Available {S.qty(r.sku, r.available)} of minimum {S.qty(r.sku, r.min)}
                </div>
              </div>
            );
          })}
          {!low.length && <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">All products are above their minimum thresholds.</div>}
        </Card>
      </div>
    </Grid>
  );
}
