"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { useSoap, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DetailHeader, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

/** Draft counted quantities per line, keyed `${countId}-${lineIndex}`. */
export type Entry = { c: string; p: string; b: string };
export type Entries = Record<string, Entry>;

export function CountList({ onOpen }: { onOpen: (id: string) => void }) {
  const S = useSoap();
  const sc = S.scope();
  const counts = S.s.counts.filter((c) => sc.includes(c.wh));
  return (
    <Card className="overflow-hidden">
      {counts.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onOpen(c.id)}
          className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-2">
            <Ref className="text-xs">{c.id}</Ref>
            <span className="font-medium">{S.wh(c.wh).name} · {c.location}</span>
          </span>
          <StatusBadge status={c.status} className="justify-self-end" />
          <span className="text-xs text-muted-foreground">
            {"Started " + S.fmtDate(c.created) + " by " + S.uname(c.by) + (c.blind ? " · blind" : "")}
          </span>
          <span className="justify-self-end text-xs text-muted-foreground tabular">
            {c.lines.filter((l) => l.counted != null).length + " / " + c.lines.length + " counted"}
          </span>
        </button>
      ))}
      {!counts.length && <EmptyState icon={<ClipboardList />} title="No count sessions yet." />}
    </Card>
  );
}

export function CountSession({
  cs,
  entries,
  setEntries,
  onBack,
  onGoAdjustments,
}: {
  cs: Doc;
  entries: Entries;
  setEntries: React.Dispatch<React.SetStateAction<Entries>>;
  onBack: () => void;
  onGoAdjustments: () => void;
}) {
  const S = useSoap();
  const counting = cs.status === "Counting";
  const hide = cs.blind && counting;
  const canCount = S.can("inv.count");
  const editable = counting && canCount;

  const submit = () =>
    S.confirm({
      title: "Submit " + cs.id + "?",
      body: "Variances become adjustment requests for warehouse manager approval. The original counts are preserved.",
      confirmLabel: "Submit count",
      onConfirm: () => S.result(S.countSubmit(cs.id), "Count submitted"),
    });

  return (
    <div className="flex flex-col gap-3">
      <DetailHeader
        backLabel="All count sessions"
        onBack={onBack}
        reference={
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px]">{cs.id}</span>
            <StatusBadge status={cs.status} />
            {cs.blind && <Badge tone="violet">Blind count</Badge>}
          </span>
        }
        title={S.wh(cs.wh).name + " · " + cs.location}
        meta={<>Started {S.fmtDate(cs.created)} by {S.uname(cs.by)} · expected quantities snapshotted at start</>}
        actions={counting && canCount && <Button onClick={submit}>Submit count</Button>}
      />
      {hide && (
        <Alert tone="info">
          Blind count: system quantities are hidden from counters until submission to avoid bias. Enter what is physically on the shelf in cartons, packs and loose bars.
        </Alert>
      )}
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH align="right">Expected</TH>
              <TH>Counted</TH>
              <TH align="right">Variance</TH>
              <TH>Reason</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {cs.lines.map((l, i) => {
              const key = cs.id + "-" + i;
              const p = S.prod(l.sku);
              const bpc = S.bpc(l.sku);
              let e = entries[key];
              if (!e) {
                const v = l.counted as number | null;
                e = v == null ? { c: "", p: "", b: "" } : { c: String(Math.floor(v / bpc)), p: String(Math.floor((v % bpc) / p.packBars)), b: String(v % p.packBars) };
              }
              const toBars = (x: Entry) => (parseInt(x.c, 10) || 0) * bpc + (parseInt(x.p, 10) || 0) * p.packBars + (parseInt(x.b, 10) || 0);
              const bars = toBars(e);
              const anyEntered = e.c !== "" || e.p !== "" || e.b !== "";
              const cur = e;
              const upd = (k: keyof Entry) => (ev: React.ChangeEvent<HTMLInputElement>) => {
                const ne = { ...cur, [k]: ev.target.value.replace(/[^0-9]/g, "") };
                setEntries((x) => ({ ...x, [key]: ne }));
                S.countSet(cs.id, i, ne.c + ne.p + ne.b === "" ? null : toBars(ne));
              };
              const variance = l.counted == null ? null : (l.counted as number) - (l.expected as number);
              const needsReason = counting && (hide ? l.counted != null : !!variance);
              const history = (l.history as { counted: number; by: string }[]) || [];
              const recount = () => {
                setEntries((x) => {
                  const ne = { ...x };
                  delete ne[key];
                  return ne;
                });
                S.result(S.countRecount(cs.id, i), "Recount requested");
              };
              const unitInput = (k: keyof Entry, label: string, unit: string, w: string) => (
                <>
                  <Input value={e[k]} onChange={upd(k)} inputMode="numeric" aria-label={label} className={cn("h-8 px-1.5 text-right", w)} />
                  <span className="text-[11px] text-muted-foreground">{unit}</span>
                </>
              );
              return (
                <TR key={key}>
                  <TD className="min-w-[200px]">
                    <Ref>{l.sku}</Ref>
                    <div>{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{`1 ctn = ${p.cartonPacks} pk × ${p.packBars}`}</div>
                  </TD>
                  <TD nowrap align="right" className={hide ? "text-violet" : ""}>{hide ? "Hidden" : S.qty(l.sku, l.expected as number)}</TD>
                  <TD nowrap>
                    {editable ? (
                      <>
                        <div className="flex items-center gap-1">
                          {unitInput("c", "Cartons", "ctn", "w-14")}
                          {unitInput("p", "Packs", "pk", "w-12")}
                          {unitInput("b", "Bars", "bar", "w-12")}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground tabular">= {anyEntered ? S.commas(bars) : "—"} bars</div>
                      </>
                    ) : l.counted == null ? (
                      "—"
                    ) : (
                      <span className="tabular">{S.qty(l.sku, l.counted as number)}</span>
                    )}
                  </TD>
                  <TD nowrap align="right" className={cn("font-semibold", hide || !variance ? "text-muted-foreground" : variance < 0 ? "text-danger" : "text-success")}>
                    {hide ? (l.counted == null ? "—" : "After submit") : variance == null ? "—" : variance === 0 ? "0" : (variance > 0 ? "+" : "") + S.qty(l.sku, variance)}
                  </TD>
                  <TD className="min-w-[200px]">
                    {needsReason && (
                      <Input
                        value={(l.reason as string) || ""}
                        onChange={(ev) => S.countSet(cs.id, i, undefined, ev.target.value)}
                        placeholder="Reason for variance (required)"
                        className="h-8"
                      />
                    )}
                    {!counting && !!l.reason && <span className="text-secondary-foreground">{l.reason as string}</span>}
                    {history.length > 0 && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Earlier counts: {history.map((h) => S.qty(l.sku, h.counted) + " (" + S.uname(h.by) + ")").join(", ")}
                      </div>
                    )}
                  </TD>
                  <TD nowrap>
                    {counting && l.counted != null && canCount && (
                      <Button size="xs" variant="outline" onClick={recount}>Recount</Button>
                    )}
                    {!!l.adj && <Ref onClick={onGoAdjustments}>{l.adj as string}</Ref>}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
