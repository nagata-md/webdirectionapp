"use client";

import { useState } from "react";
import { saveLineItems } from "./actions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { onEnterKey } from "@/lib/ui/onEnterKey";

type LineItem = { label: string; amount: number };

export function LineItemsEditor({
  projectId,
  initialItems,
}: {
  projectId: string;
  initialItems: LineItem[];
}) {
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const addItem = () => {
    const parsed = Number(amount);
    if (!label.trim() || !Number.isFinite(parsed) || parsed === 0) return;
    setItems((prev) => [...prev, { label: label.trim(), amount: parsed }]);
    setLabel("");
    setAmount("");
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={saveLineItems}>
      <input type="hidden" name="projectId" value={projectId} readOnly />
      <input type="hidden" name="lineItems" value={JSON.stringify(items)} readOnly />

      <div className="mb-2 flex flex-wrap gap-2">
        {items.length === 0 && (
          <span className="text-[13px] text-subtle">追加項目は登録されていません</span>
        )}
        {items.map((item, i) => (
          <Tag key={`${item.label}-${i}`} onRemove={() => removeItem(i)}>
            {item.label}：{item.amount >= 0 ? "+" : ""}
            {item.amount.toLocaleString("ja-JP")}円
          </Tag>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="項目名（例: 素材費、初回割引）"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={onEnterKey(addItem)}
          className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <input
          type="number"
          placeholder="金額（値引きは負の値）"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={onEnterKey(addItem)}
          className="w-48 rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <Button type="button" onClick={addItem}>
          + 追加
        </Button>
      </div>

      <Button type="submit" variant="primary">
        保存
      </Button>
    </form>
  );
}
