"use client";

import { useState } from "react";
import { createPage } from "./actions";
import { Button } from "@/components/ui/Button";
import { CMS_TIERS, PAGE_TYPES, type PageNode, type ProgressGroup } from "@/lib/pages/constants";
import { COMPLEXITIES } from "@/lib/master/constants";

const inputClass = "rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]";

export function PageForm({
  projectId,
  pages,
  groups,
}: {
  projectId: string;
  pages: PageNode[];
  groups: ProgressGroup[];
}) {
  const [type, setType] = useState("other");

  return (
    <form action={createPage} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="projectId" value={projectId} readOnly />

      <div>
        <label className="mb-1 block text-[12px] font-semibold text-muted">
          ページ名（必須）
        </label>
        <input type="text" name="name" required className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold text-muted">種別</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputClass}
        >
          {PAGE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold text-muted">複雑度</label>
        <select name="complexity" defaultValue="M" className={inputClass}>
          {COMPLEXITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold text-muted">親ページ</label>
        <select name="parentId" defaultValue="" className={inputClass}>
          <option value="">（なし）</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold text-muted">進行グループ</label>
        <select name="groupId" defaultValue="" className={inputClass}>
          <option value="">（デフォルト）</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold text-muted">CMS構築費</label>
        <select name="cmsTier" defaultValue="" className={inputClass}>
          {CMS_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier ? `CMS構築${tier}` : "なし"}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 pb-2 text-[13px]">
        <input type="checkbox" name="wireNeeded" defaultChecked />
        ワイヤー要
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-[13px]">
        <input type="checkbox" name="copyNeeded" defaultChecked />
        コピー要
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-[13px]">
        <input type="checkbox" name="designSkip" />
        デザインなし
      </label>
      <label className="flex items-center gap-1.5 pb-2 text-[13px]">
        <input type="checkbox" name="codingSkip" />
        コーディングなし
      </label>
      {type === "top" && (
        <label className="flex items-center gap-1.5 pb-2 text-[13px]">
          <input type="checkbox" name="mobileMenuNeeded" />
          スマホ対応メニュー（メガメニュー）を含める
        </label>
      )}

      <Button type="submit" variant="primary">
        ＋ ページ追加
      </Button>
    </form>
  );
}
