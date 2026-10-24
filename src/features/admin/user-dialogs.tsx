"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { useSoap, type RoleKey, type User } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, Label } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Toggle a warehouse in an access list; "ALL" is exclusive of individual warehouses. */
const toggleWh = (cur: string[], w: string) => {
  if (w === "ALL") return cur.includes("ALL") ? [] : ["ALL"];
  const wh = cur.filter((x) => x !== "ALL");
  return wh.includes(w) ? wh.filter((x) => x !== w) : [...wh, w];
};

function WarehouseChecks({ value, onChange }: { value: string[]; onChange: (wh: string[]) => void }) {
  const S = useSoap();
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
      {["ALL", ...S.WH].map((w) => (
        <CheckboxField key={w} label={w === "ALL" ? "All warehouses" : S.wh(w).name} checked={value.includes(w)} onCheckedChange={() => onChange(toggleWh(value, w))} />
      ))}
    </div>
  );
}

const useRoleOpts = () => {
  const S = useSoap();
  return (Object.keys(S.ROLES) as RoleKey[]).map((k) => ({ value: k, label: S.ROLES[k].name }));
};

export function EditUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const S = useSoap();
  const roleOpts = useRoleOpts();
  const [ed, setEd] = React.useState<{ role: RoleKey; wh: string[]; status: string }>(() => ({ role: user.role, wh: user.wh.slice(), status: user.status }));
  const [err, setErr] = React.useState("");

  const save = () => {
    const r = S.userSave(user.id, { role: ed.role, wh: ed.wh, status: ed.status });
    if (!r.ok) return setErr(r.error);
    onClose();
    S.result(r, "User updated");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title={user.name} description={user.email + " · last sign-in " + user.last} />
        <DialogBody>
          {err && <Alert tone="danger">{err}</Alert>}
          <Field label="Role">
            <Select value={ed.role} onValueChange={(v) => setEd((x) => ({ ...x, role: v as RoleKey }))} options={roleOpts} />
          </Field>
          <div className="flex flex-col gap-2">
            <Label>Warehouse access</Label>
            <WarehouseChecks value={ed.wh} onChange={(wh) => setEd((x) => ({ ...x, wh }))} />
          </div>
          <Field label="Account status">
            <Select value={ed.status} onValueChange={(v) => setEd((x) => ({ ...x, status: v }))} options={["Active", "Suspended", "Invited"]} />
          </Field>
          <div className="flex flex-col gap-2">
            <Label>Permission summary for this role</Label>
            <div className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs min-[420px]:grid-cols-2">
              {S.PERMS.map((p) => {
                const has = S.ROLES[ed.role].perms.includes(p);
                return (
                  <span key={p} className={cn("flex items-center gap-1.5", has ? "text-success" : "text-subtle-foreground")}>
                    {has ? <Check className="size-3.5 shrink-0" /> : <Minus className="size-3.5 shrink-0" />}
                    {S.PERM_LABELS[p]}
                  </span>
                );
              })}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InviteUserDialog({ onClose }: { onClose: () => void }) {
  const S = useSoap();
  const roleOpts = useRoleOpts();
  const [inv, setInv] = React.useState<{ name: string; email: string; role: string; wh: string[] }>({ name: "", email: "", role: "", wh: [] });
  const [err, setErr] = React.useState("");

  const send = () => {
    const r = S.userCreate({ name: inv.name.trim(), email: inv.email.trim(), role: inv.role, wh: inv.wh });
    if (!r.ok) return setErr(r.error);
    onClose();
    S.result(r, "User invited");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader title="Invite user" />
        <DialogBody>
          {err && <Alert tone="danger">{err}</Alert>}
          <Field label="Full name">
            <Input value={inv.name} onChange={(e) => setInv((x) => ({ ...x, name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <Input type="email" value={inv.email} onChange={(e) => setInv((x) => ({ ...x, email: e.target.value }))} />
          </Field>
          <Field label="Role">
            <Select value={inv.role} onValueChange={(v) => setInv((x) => ({ ...x, role: v }))} placeholder="Select…" options={roleOpts} />
          </Field>
          <WarehouseChecks value={inv.wh} onChange={(wh) => setInv((x) => ({ ...x, wh }))} />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send}>Send invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
