"use client";

import * as React from "react";
import { UserCog, UserPlus } from "lucide-react";
import { useSoap, type RoleKey, type User } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { EditUserDialog, InviteUserDialog } from "./user-dialogs";

const KEY: [string, string][] = [
  ["inv.view", "Stock"], ["inv.adjust.request", "Req. adj."], ["inv.adjust.approve", "Appr. adj."], ["rcv.create", "Receive"], ["rcv.approve", "Post GRN"],
  ["trf.approve", "Appr. trf"], ["po.create", "Create PO"], ["po.approve", "Appr. PO"], ["so.create", "Sell"], ["so.approve", "Credit appr."],
  ["dsp.process", "Dispatch"], ["dsp.deliver", "Deliver"], ["fin.record", "Payments"], ["fin.verify", "Verify"], ["exp.approve", "Appr. exp."],
  ["rpt.fin", "Fin. reports"], ["cost.view", "Costs"], ["usr.manage", "Users"],
];

export function UsersView() {
  const S = useSoap();
  const s = S.s;
  const [edit, setEdit] = React.useState<User | null>(null);
  const [invite, setInvite] = React.useState(false);

  const whName = (u: User) => (u.wh.includes("ALL") ? "All warehouses" : u.wh.map((w) => S.wh(w).name).join(", "));
  const roleKeys = Object.keys(S.ROLES) as RoleKey[];
  const editing = edit && s.users.find((u) => u.id === edit.id);

  return (
    <>
      <PageHeader
        icon={UserCog}
        title="User management"
        description="Roles define permissions; warehouse access is assigned per user. Both are enforced by the API."
        actions={<Button onClick={() => setInvite(true)}><UserPlus />Invite user</Button>}
      />
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>{["User", "Role", "Warehouse access", "Status", "Last sign-in", "Permissions"].map((c) => <TH key={c}>{c}</TH>)}</tr>
          </THead>
          <TBody>
            {s.users.map((u) => {
              const r = S.ROLES[u.role];
              return (
                <TR key={u.id} onClick={() => setEdit(u)} className={cn(u.id === s.currentUser && "bg-primary-soft/40")}>
                  <TD nowrap>
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                        {u.name.split(" ").map((x) => x[0]).join("")}
                      </span>
                      <span>
                        <span className="font-medium">{u.name}</span>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </span>
                    </div>
                  </TD>
                  <TD nowrap>{r.name}</TD>
                  <TD className="min-w-[160px]">{whName(u)}</TD>
                  <TD nowrap>
                    <Badge tone={S.STATUS_TONE[u.status === "Invited" ? "Pending Approval" : u.status] ?? "gray"} dot>{u.status}</Badge>
                  </TD>
                  <TD nowrap className="text-muted-foreground">{u.last}</TD>
                  <TD className="min-w-[140px] text-xs text-muted-foreground">{r.readonly ? "Read-only · " + r.perms.length + " view rights" : r.perms.length + " permissions"}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Role permission matrix" description="● allowed · ○ view only · blank = no access" />
        <Table className="text-xs">
          <THead>
            <tr>
              <TH className="sticky left-0 z-[1] bg-muted normal-case tracking-normal">Role</TH>
              {KEY.map(([p, h]) => <TH key={p} align="center" className="px-1.5 text-[10.5px] normal-case tracking-normal">{h}</TH>)}
            </tr>
          </THead>
          <TBody>
            {roleKeys.map((k) => {
              const r = S.ROLES[k];
              return (
                <tr key={k}>
                  <TD nowrap className="sticky left-0 z-[1] bg-card py-1.5 font-medium">{r.name}</TD>
                  {KEY.map(([p]) => {
                    const has = r.perms.includes(p);
                    const viewOnly = r.readonly && (p.endsWith(".view") || p.startsWith("rpt") || p === "cost.view");
                    const v = has && !r.readonly ? "●" : viewOnly && has ? "○" : r.readonly && p === "inv.view" ? "○" : "";
                    return <TD key={p} align="center" className={cn("px-1.5 py-1.5", has && !r.readonly ? "text-primary" : "text-subtle-foreground")}>{v}</TD>;
                  })}
                </tr>
              );
            })}
          </TBody>
        </Table>
      </Card>

      {editing && <EditUserDialog key={editing.id} user={editing} onClose={() => setEdit(null)} />}
      {invite && <InviteUserDialog onClose={() => setInvite(false)} />}
    </>
  );
}
