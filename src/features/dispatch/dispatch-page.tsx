"use client";

import * as React from "react";
import { PackageSearch, Truck } from "lucide-react";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Grid, Page, PageHeader, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { DispatchDetail } from "./dispatch-detail";
import { ReturnsTab } from "./returns-tab";

type TabKey = "ready" | "active" | "done" | "returns";

export default function DispatchPage() {
  const S = useSoap();
  const s = S.s;
  const isDriver = S.user().role === "driver";
  const [tab, setTab] = React.useState<TabKey>(() => (s.route.tab === "returns" && !isDriver ? "returns" : isDriver ? "active" : "ready"));
  const [focusSO] = React.useState<string | undefined>(() => {
    const so = s.route.so;
    return typeof so === "string" && s.salesOrders.some((x) => x.id === so) ? so : undefined;
  });

  const d0 = s.route.id && s.route.tab !== "returns" ? s.dispatches.find((x) => x.id === s.route.id) : undefined;
  if (d0)
    return (
      <Page>
        <DispatchDetail key={d0.id} d={d0} />
      </Page>
    );

  const sc = S.scope();
  const me = s.currentUser;
  const canProcess = S.can("dsp.process");
  const soOf = (id: string): Doc | undefined => s.salesOrders.find((x) => x.id === id);
  const readySO = s.salesOrders.filter(
    (x) =>
      sc.includes(x.wh) &&
      ["Confirmed", "Partially Fulfilled"].includes(x.status) &&
      x.lines.some((l) => l.qty - l.fulfilled > 0) &&
      !s.dispatches.some((d) => d.so === x.id && !d.deducted && d.status !== "Cancelled"),
  );
  const mine = (d: Doc) => !isDriver || d.driver === me;
  const active = s.dispatches.filter((d) => sc.includes(d.wh) && mine(d) && ["Picking", "Verified", "Assigned", "Out for delivery"].includes(d.status));
  const done = s.dispatches.filter((d) => sc.includes(d.wh) && mine(d) && ["Completed", "Delivered", "Partially delivered", "Failed"].includes(d.status));
  const tabs = [
    ...(isDriver ? [] : [{ value: "ready" as TabKey, label: "Ready to pick", count: readySO.length }]),
    { value: "active" as TabKey, label: isDriver ? "My deliveries" : "In progress", count: active.length },
    { value: "done" as TabKey, label: "Completed & exceptions", count: done.length },
    ...(isDriver ? [] : [{ value: "returns" as TabKey, label: "Returns", count: s.returns.filter((r) => sc.includes(r.wh) && r.status !== "Inspected").length }]),
  ];

  const start = (soId: string) => {
    const r = S.dispatchStart(soId);
    S.result(r, "Pick list created");
    if (r.ok) S.nav("dispatch", { id: r.id as string });
  };

  const list = tab === "done" ? done : active;

  return (
    <Page>
      <PageHeader icon={Truck} title="Deliveries" description="Dispatch & deliveries: pick, verify and hand over. Stock is deducted exactly once — at handover or when the vehicle leaves. Returns are restored only after inspection." />
      <Tabs value={tab} onValueChange={setTab} items={tabs} />
      {tab === "returns" ? (
        <ReturnsTab focus={s.route.tab === "returns" && typeof s.route.id === "string" ? s.route.id : undefined} />
      ) : tab === "ready" ? (
        readySO.length ? (
          <Grid min={320}>
            {readySO.map((x) => (
              <Card key={x.id} className={cn("flex flex-col gap-2 px-4 py-3", focusSO === x.id && "border-primary ring-1 ring-primary/30")}>
                <div className="flex justify-between gap-2">
                  <Ref>{x.id}</Ref>
                  <span className={cn("text-[11.5px] font-semibold", x.method === "Delivery" ? "text-violet" : "text-primary")}>{x.method}</span>
                </div>
                <div className="font-semibold">{S.cust(x.customer).name + (x.walkin ? " — " + x.walkin : "")}</div>
                <div className="text-xs text-muted-foreground">
                  {S.wh(x.wh).name} · {x.terms} · {x.lines.length} lines · <span className="tabular">{S.money(S.soTotal(x))}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                  <span className="text-xs text-secondary-foreground">
                    {x.status + (x.lines.some((l) => l.reserved < l.qty - l.fulfilled) ? " · partly unreserved" : " · fully reserved")}
                  </span>
                  {canProcess && <Button size="sm" onClick={() => start(x.id)}>Start picking</Button>}
                </div>
              </Card>
            ))}
          </Grid>
        ) : (
          <Card className="border-dashed">
            <EmptyState icon={<PackageSearch />} title="No confirmed orders waiting to be picked in this scope." />
          </Card>
        )
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <tr>
                {["Dispatch", "Sales order", "Customer", "Warehouse", "Method", "Status", "Officer", "Date", "POD"].map((c) => <TH key={c}>{c}</TH>)}
              </tr>
            </THead>
            <TBody>
              {list.map((d) => (
                <TR key={d.id} onClick={() => S.nav("dispatch", { id: d.id })}>
                  <TD nowrap><Ref>{d.id}</Ref></TD>
                  <TD nowrap className="font-mono text-[11.5px]">{d.so}</TD>
                  <TD className="min-w-[160px]">{S.cust(soOf(d.so)?.customer ?? "").name}</TD>
                  <TD nowrap>{S.wh(d.wh).name}</TD>
                  <TD nowrap>{d.method}</TD>
                  <TD nowrap><StatusBadge status={d.status} /></TD>
                  <TD nowrap>{d.driver ? S.uname(d.driver) : "—"}</TD>
                  <TD nowrap className="text-muted-foreground">{S.fmtDate(d.dispatchedAt || d.date)}</TD>
                  <TD nowrap className="font-mono text-[11.5px]">{d.pod || (d.collector ? "Collected" : "—")}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {!list.length && <EmptyState icon={<Truck />} title={isDriver ? "No deliveries assigned to you." : "Nothing here yet."} />}
        </Card>
      )}
    </Page>
  );
}
