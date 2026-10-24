"use client";

import * as React from "react";
import { Paperclip, Printer } from "lucide-react";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Alert } from "@/components/ui/misc";
import { DetailHeader, Fact, Grid, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { StepTrack, type StepState } from "./receiving-ui";
import { GrnPrintDialog } from "./grn-print-dialog";

const TRACK = ["Truck & documents", "Products", "Quantities", "Condition", "Batches", "Review & submit", "Approve & post"];
const IDX: Record<string, number> = { Draft: 0, Arrived: 1, Counting: 3, "Pending Approval": 6, Posted: 7, Rejected: 6 };

export function ReceiptDetail({ g, onEdit }: { g: Doc; onEdit: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [print, setPrint] = React.useState(false);
  const costV = S.canView("cost.view");

  const idx = IDX[g.status] ?? 0;
  const steps = TRACK.map((label, i) => ({ label, state: (i < idx ? "done" : i === idx ? "current" : "todo") as StepState }));
  const tot = (k: string) => g.lines.reduce((a, l) => a + l[k], 0);
  const shortT = g.lines.reduce((a, l) => a + Math.max(0, l.expected - l.counted), 0);
  const pending = g.status === "Pending Approval";
  const posted = g.status === "Posted";
  const canApprove = pending && S.can("rcv.approve") && S.allowedWh().includes(g.wh);
  const canEdit = ["Draft", "Arrived", "Counting"].includes(g.status) && S.can("rcv.create");
  const whName = S.wh(g.wh).name;

  const banner: { tone: "success" | "info" | "warning" | "danger"; text: string } | null = posted
    ? { tone: "success", text: `Posted by ${S.uname(g.postedBy)} on ${S.fmtDate(g.postedAt)}. Accepted quantities are now sellable stock at ${whName} and weighted-average costs were recalculated. This receipt is locked — corrections require an authorised reversal or stock adjustment.` }
    : pending
      ? canApprove
        ? { tone: "info", text: "Review the accepted, damaged and short quantities. Posting is a single atomic transaction: accepted goods become sellable, damaged goods are held separately, rejected goods are excluded." }
        : { tone: "warning", text: "Awaiting approval by the " + whName + " warehouse manager. Stock has not changed yet." }
      : g.status === "Rejected"
        ? { tone: "danger", text: "Rejected by " + S.uname(g.rejectedBy) + ": " + (g.reason || "") + " No stock was changed." }
        : null;

  const hist = s.audit.filter((a) => a.ref === g.id).map((a) => ({ action: a.action, user: S.uname(a.user), when: S.fmtDate(a.ts), detail: a.detail }));
  const history = hist.length ? hist : [{ action: "Receipt recorded", user: S.uname(g.by), when: S.fmtDate(g.arrival), detail: "Seeded demonstration record" }];
  const docs = ["Delivery note " + g.dn + ".pdf", "Truck photo " + g.truck + ".jpg", ...(posted ? ["Supplier invoice (linked in Finance)"] : [])];

  const post = () =>
    S.confirm({
      title: "Approve and post " + g.id + "?",
      body: `${S.commas(tot("accepted"))} accepted bars will be added to sellable stock at ${whName}; ${S.commas(tot("damaged"))} damaged bars held separately. Weighted-average cost will be recalculated. Posted receipts cannot be edited.`,
      confirmLabel: "Approve & post",
      onConfirm: () => S.result(S.receiptPost(g.id), "Receipt posted"),
    });
  const reject = () =>
    S.confirm({
      title: "Reject " + g.id + "?",
      body: "The receipt will be closed without changing stock. The supplier must re-deliver against a new receipt.",
      confirmLabel: "Reject receipt",
      danger: true,
      reasonLabel: "Reason for rejection",
      onConfirm: (rs) => S.result(S.receiptReject(g.id, rs), "Receipt rejected"),
    });

  const muted = "text-subtle-foreground";

  return (
    <>
      <div className={cn("flex flex-col gap-4", print && "print:hidden")}>
        <DetailHeader
          backLabel="All receipts"
          onBack={() => S.nav("receiving")}
          reference={g.id}
          title={`${S.sup(g.supplier).name} → ${whName}`}
          meta={
            <>
              <StatusBadge status={g.status} />
              <span>{`Truck ${g.truck} · driver ${g.driver || "—"} · arrived ${S.fmtDate(g.arrival)} · received by ${S.uname(g.by)}`}</span>
            </>
          }
          actions={
            <>
              {canEdit && <Button variant="outline" onClick={onEdit}>{g.status === "Counting" ? "Continue counting" : "Start counting"}</Button>}
              {canApprove && (
                <>
                  <Button variant="destructive-outline" onClick={reject}>Reject receipt</Button>
                  <Button variant="success" onClick={post}>Approve &amp; post</Button>
                </>
              )}
              {posted && (
                <Button variant="outline" onClick={() => setPrint(true)}>
                  <Printer />
                  Goods-received note
                </Button>
              )}
            </>
          }
        />
        <StepTrack steps={steps} />
        {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}
        <Grid min={260}>
          <Fact k="Purchase order" v={<span className="font-mono">{g.po || "None — exception"}</span>} />
          <Fact k="Supplier delivery note" v={<span className="font-mono">{g.dn}</span>} />
          <Fact k="Product lines" v={g.lines.length + " lines · " + new Set(g.lines.map((l) => S.prod(l.sku).brand)).size + " brand(s)"} />
          {costV && <Fact k="Accepted value at receipt cost" v={S.money(g.lines.reduce((a, l) => a + S.valueOf(l.accepted, l.cost4), 0))} />}
        </Grid>
        <Card className="overflow-hidden">
          <CardHeader title="Receipt lines">
            <span className="text-xs text-muted-foreground">{`Accepted ${S.commas(tot("accepted"))} · rejected ${S.commas(tot("rejected"))} · damaged ${S.commas(tot("damaged"))} · short ${S.commas(shortT)} bars`}</span>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH align="right">Expected</TH>
                <TH align="right">Counted</TH>
                <TH align="right">Accepted</TH>
                <TH align="right">Rejected</TH>
                <TH align="right">Damaged</TH>
                <TH align="right">Short</TH>
                <TH>Batch / expiry</TH>
                {costV && <TH align="right">Unit cost</TH>}
                {costV && <TH align="right">Accepted value</TH>}
                {posted && <TH align="right">Sellable now</TH>}
              </tr>
            </THead>
            <TBody>
              {g.lines.map((l) => {
                const sh = l.expected - l.counted;
                return (
                  <TR key={l.sku}>
                    <TD className="min-w-[180px]">
                      <Ref>{l.sku}</Ref>
                      <div className="text-[11px] text-muted-foreground">{S.prod(l.sku).name}</div>
                    </TD>
                    <TD nowrap align="right">{S.qty(l.sku, l.expected)}</TD>
                    <TD nowrap align="right">{g.status === "Arrived" ? "—" : S.qty(l.sku, l.counted)}</TD>
                    <TD nowrap align="right" className="font-semibold text-success">{S.qty(l.sku, l.accepted)}</TD>
                    <TD nowrap align="right" className={l.rejected ? "text-danger" : muted}>{l.rejected ? S.qty(l.sku, l.rejected) : "—"}</TD>
                    <TD nowrap align="right" className={l.damaged ? "text-danger" : muted}>{l.damaged ? S.qty(l.sku, l.damaged) : "—"}</TD>
                    <TD nowrap align="right" className={sh > 0 ? "text-warning" : muted}>{sh > 0 && g.status !== "Arrived" ? S.qty(l.sku, sh) : "—"}</TD>
                    <TD nowrap>
                      {l.batch || (S.prod(l.sku).batch ? "Required" : "Not tracked")}
                      {l.exp && <div className="text-[11px] text-muted-foreground">exp {S.fmtDate(l.exp)}</div>}
                    </TD>
                    {costV && <TD nowrap align="right">{S.cost(l.cost4)}</TD>}
                    {costV && <TD nowrap align="right">{S.money(S.valueOf(l.accepted, l.cost4))}</TD>}
                    {posted && <TD nowrap align="right" className="text-primary">{S.qty(l.sku, S.bal(g.wh, l.sku).sellable)}</TD>}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
        <Grid min={380}>
          <Card>
            <CardHeader title="Discrepancy notes & supplier documents" />
            <CardContent className="flex flex-col gap-3">
              <p className="text-[12.5px] leading-relaxed text-secondary-foreground">{g.notes || "No discrepancy notes."}</p>
              <div className="flex flex-wrap gap-2">
                {docs.map((d) => (
                  <span key={d} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border bg-muted/60 px-2.5 py-1.5 text-xs">
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{d}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="History" />
            <CardContent className="flex flex-col gap-2.5">
              {history.map((h, i) => (
                <div key={i} className="flex gap-2.5 text-[12.5px]">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/40" />
                  <span className="min-w-0">
                    <b className="font-semibold">{h.action}</b> · {h.user} · <span className="text-muted-foreground">{h.when}</span>
                    <div className="text-[11.5px] text-muted-foreground">{h.detail}</div>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </div>
      {print && <GrnPrintDialog g={g} onClose={() => setPrint(false)} />}
    </>
  );
}
