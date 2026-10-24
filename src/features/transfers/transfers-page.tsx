"use client";

import * as React from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Page, PageHeader, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { FilterChips } from "./transfers-ui";
import { TransferDetail } from "./transfer-detail";
import { TransferFormDialog } from "./transfer-form-dialog";

const STATUSES = ["Draft", "Requested", "Approved", "In Transit", "Partially Received", "Received", "Disputed"];

export default function TransfersPage() {
  const S = useSoap();
  const s = S.s;
  const [filter, setFilter] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(() => s.route.action === "new" && S.can("trf.create"));

  const t0 = s.route.id ? s.transfers.find((x) => x.id === s.route.id) : undefined;
  const form = formOpen && <TransferFormDialog onClose={() => setFormOpen(false)} />;

  if (t0)
    return (
      <Page>
        <TransferDetail key={t0.id} t={t0} />
        {form}
      </Page>
    );

  const sc = S.scope();
  const vis = s.transfers.filter((x) => sc.includes(x.from) || sc.includes(x.to));
  const chips = [{ k: "", label: "All", n: vis.length }, ...STATUSES.map((k) => ({ k, label: k, n: vis.filter((x) => x.status === k).length }))];
  const rows = vis.filter((x) => !filter || x.status === filter);
  const sumq = (x: Doc, k: string) => {
    const tot = x.lines.reduce((a, l) => a + l[k], 0);
    if (!tot) return "—";
    return x.lines.length === 1 ? S.qty(x.lines[0].sku, tot) : S.commas(tot) + " bars";
  };

  return (
    <Page>
      <PageHeader
        icon={ArrowLeftRight}
        title="Warehouse transfers"
        description="Stock leaves the source on dispatch, is tracked in transit, and lands at the destination on receipt. Transfers move cost, not revenue."
        actions={
          S.can("trf.create") && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              New transfer request
            </Button>
          )
        }
      />
      <FilterChips items={chips} value={filter} onChange={setFilter} />
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Transfer</TH>
              <TH>Route</TH>
              <TH>Requested</TH>
              <TH align="right">Lines</TH>
              <TH align="right">Requested qty</TH>
              <TH align="right">Approved</TH>
              <TH align="right">Dispatched</TH>
              <TH align="right">Received</TH>
              <TH>Status</TH>
              <TH>Requested by</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((x) => (
              <TR key={x.id} onClick={() => S.nav("transfers", { id: x.id })}>
                <TD nowrap><Ref>{x.id}</Ref></TD>
                <TD nowrap>{S.wh(x.from).name + " → " + S.wh(x.to).name}</TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(x.date)}</TD>
                <TD align="right">{x.lines.length}</TD>
                <TD nowrap align="right">{sumq(x, "req")}</TD>
                <TD nowrap align="right">{sumq(x, "appr")}</TD>
                <TD nowrap align="right">{sumq(x, "disp")}</TD>
                <TD nowrap align="right" className={cn(x.status === "Disputed" && "text-danger")}>{sumq(x, "recv")}</TD>
                <TD nowrap><StatusBadge status={x.status} /></TD>
                <TD nowrap>{S.uname(x.by)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!rows.length && <EmptyState icon={<ArrowLeftRight />} title="No transfers in this view." />}
      </Card>
      {form}
    </Page>
  );
}
