"use client";

import { useState } from "react";
import { saveOwners } from "../actions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { onEnterKey } from "@/lib/ui/onEnterKey";

type Owner = { role: string; name: string };

export function OwnersEditor({
  projectId,
  initialOwners,
}: {
  projectId: string;
  initialOwners: Owner[];
}) {
  const [owners, setOwners] = useState<Owner[]>(initialOwners);
  const [role, setRole] = useState("");
  const [name, setName] = useState("");

  const addOwner = () => {
    if (!role.trim() || !name.trim()) return;
    setOwners((prev) => [...prev, { role: role.trim(), name: name.trim() }]);
    setRole("");
    setName("");
  };

  const removeOwner = (index: number) => {
    setOwners((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={saveOwners}>
      <input type="hidden" name="projectId" value={projectId} readOnly />
      <input type="hidden" name="owners" value={JSON.stringify(owners)} readOnly />

      <div className="mb-2 flex flex-wrap gap-2">
        {owners.length === 0 && (
          <span className="text-[13px] text-subtle">担当者が登録されていません</span>
        )}
        {owners.map((o, i) => (
          <Tag key={`${o.role}-${o.name}-${i}`} onRemove={() => removeOwner(i)}>
            {o.role}：{o.name}
          </Tag>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="役割（例: ディレクター）"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={onEnterKey(addOwner)}
          className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <input
          type="text"
          placeholder="氏名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onEnterKey(addOwner)}
          className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <Button type="button" onClick={addOwner}>
          + 追加
        </Button>
      </div>

      <Button type="submit" variant="primary">
        保存
      </Button>
    </form>
  );
}
