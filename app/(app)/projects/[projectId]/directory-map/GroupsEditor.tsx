"use client";

import { useState } from "react";
import { saveGroups } from "./actions";
import { Button } from "@/components/ui/Button";
import { onEnterKey } from "@/lib/ui/onEnterKey";
import type { ProgressGroup } from "@/lib/pages/constants";

type GroupItem = { id: string | null; name: string };

export function GroupsEditor({
  projectId,
  initialGroups,
}: {
  projectId: string;
  initialGroups: ProgressGroup[];
}) {
  const [groups, setGroups] = useState<GroupItem[]>(
    initialGroups
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => ({ id: g.id, name: g.name })),
  );
  const [newName, setNewName] = useState("");

  const addGroup = () => {
    if (!newName.trim()) return;
    setGroups((prev) => [...prev, { id: null, name: newName.trim() }]);
    setNewName("");
  };

  const removeGroup = (index: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const moveGroup = (index: number, direction: -1 | 1) => {
    setGroups((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <form action={saveGroups}>
      <input type="hidden" name="projectId" value={projectId} readOnly />
      <input type="hidden" name="groups" value={JSON.stringify(groups)} readOnly />

      <div className="mb-3 flex flex-col gap-1.5">
        {groups.length === 0 && (
          <span className="text-[13px] text-subtle">
            進行グループが未設定です（未設定ページはデフォルトグループ扱いになります）
          </span>
        )}
        {groups.map((g, i) => (
          <div key={g.id ?? `new-${i}`} className="flex items-center gap-2">
            <span className="w-6 text-[12px] text-subtle">{i + 1}</span>
            <span className="text-[13px]">{g.name}</span>
            <div className="ml-auto flex gap-1">
              <Button type="button" onClick={() => moveGroup(i, -1)} disabled={i === 0}>
                ↑
              </Button>
              <Button type="button" onClick={() => moveGroup(i, 1)} disabled={i === groups.length - 1}>
                ↓
              </Button>
              <Button type="button" variant="danger" onClick={() => removeGroup(i)}>
                削除
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="グループ名（例: グループ1）"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={onEnterKey(addGroup)}
          className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <Button type="button" onClick={addGroup}>
          + 追加
        </Button>
      </div>

      <Button type="submit" variant="primary">
        保存
      </Button>
    </form>
  );
}
