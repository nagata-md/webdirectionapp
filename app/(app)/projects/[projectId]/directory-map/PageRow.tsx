"use client";

import { useState } from "react";
import { deletePage, updatePage } from "./actions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { PAGE_TYPES, pageTypeLabel, type PageNode, type ProgressGroup } from "@/lib/pages/constants";
import { COMPLEXITIES } from "@/lib/master/constants";

const inputClass = "rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]";

export function PageRow({
  page,
  depth,
  allPages,
  groups,
  projectId,
}: {
  page: PageNode;
  depth: number;
  allPages: PageNode[];
  groups: ProgressGroup[];
  projectId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const children = allPages
    .filter((p) => p.parent_id === page.id)
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  const groupName = groups.find((g) => g.id === page.group_id)?.name;

  const selectableParents = allPages.filter((p) => p.id !== page.id);

  return (
    <div style={{ paddingLeft: depth * 20 }}>
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border py-2">
          <span className="font-semibold">{page.name}</span>
          <Tag>{pageTypeLabel(page.type)}</Tag>
          <Tag>{page.complexity}</Tag>
          {!page.wire_needed && <Tag>ワイヤー不要</Tag>}
          {!page.copy_needed && <Tag>コピー不要</Tag>}
          {groupName && <Tag>{groupName}</Tag>}
          <span className="text-[12px] text-subtle">優先度 {page.priority}</span>
          {page.extra_cost > 0 && (
            <span className="text-[12px] text-subtle">
              個別費用 {page.extra_cost.toLocaleString()}円
            </span>
          )}
          <div className="ml-auto flex gap-1.5">
            <Button type="button" onClick={() => setIsEditing(true)}>
              編集
            </Button>
            <form
              action={deletePage}
              onSubmit={(e) => {
                if (!confirm(`「${page.name}」を削除しますか？`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="projectId" value={projectId} readOnly />
              <input type="hidden" name="pageId" value={page.id} readOnly />
              <Button type="submit" variant="danger">
                削除
              </Button>
            </form>
          </div>
        </div>
      )}

      {isEditing && (
        <form
          action={updatePage}
          className="mb-2 flex flex-wrap items-end gap-3 rounded-panel border border-border-strong bg-surface-subtle p-3"
        >
          <input type="hidden" name="projectId" value={projectId} readOnly />
          <input type="hidden" name="pageId" value={page.id} readOnly />

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">ページ名</label>
            <input type="text" name="name" defaultValue={page.name} required className={inputClass} />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">種別</label>
            <select name="type" defaultValue={page.type} className={inputClass}>
              {PAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">複雑度</label>
            <select name="complexity" defaultValue={page.complexity} className={inputClass}>
              {COMPLEXITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">親ページ</label>
            <select name="parentId" defaultValue={page.parent_id ?? ""} className={inputClass}>
              <option value="">（なし）</option>
              {selectableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">進行グループ</label>
            <select name="groupId" defaultValue={page.group_id ?? ""} className={inputClass}>
              <option value="">（デフォルト）</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">優先度</label>
            <input
              type="number"
              name="priority"
              defaultValue={page.priority}
              className={`${inputClass} w-20`}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">個別費用（円）</label>
            <input
              type="number"
              name="extraCost"
              defaultValue={page.extra_cost}
              className={`${inputClass} w-28`}
            />
          </div>

          <label className="flex items-center gap-1.5 pb-2 text-[13px]">
            <input type="checkbox" name="wireNeeded" defaultChecked={page.wire_needed} />
            ワイヤー要
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-[13px]">
            <input type="checkbox" name="copyNeeded" defaultChecked={page.copy_needed} />
            コピー要
          </label>

          <Button type="submit" variant="primary">
            保存
          </Button>
          <Button type="button" onClick={() => setIsEditing(false)}>
            キャンセル
          </Button>
        </form>
      )}

      {children.map((child) => (
        <PageRow
          key={child.id}
          page={child}
          depth={depth + 1}
          allPages={allPages}
          groups={groups}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
