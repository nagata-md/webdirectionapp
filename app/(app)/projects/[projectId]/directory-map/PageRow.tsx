"use client";

import { useEffect, useState, type DragEventHandler } from "react";
import { deletePage, updatePage } from "./actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tag } from "@/components/ui/Tag";
import {
  CMS_TIERS,
  PAGE_TYPES,
  cmsTierLabel,
  pageDepthPrefix,
  pageTypeLabel,
  type PageNode,
  type ProgressGroup,
} from "@/lib/pages/constants";
import { COMPLEXITIES } from "@/lib/master/constants";
import { ROW_GRID_CLASS } from "./gridLayout";

const inputClass = "rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]";

export function PageRow({
  page,
  depth,
  allPages,
  groups,
  projectId,
  isDragging,
  dragHandleProps,
}: {
  page: PageNode;
  depth: number;
  allPages: PageNode[];
  groups: ProgressGroup[];
  projectId: string;
  isDragging?: boolean;
  dragHandleProps?: {
    draggable: boolean;
    onDragStart: DragEventHandler<HTMLSpanElement>;
    onDragEnd: DragEventHandler<HTMLSpanElement>;
  };
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingType, setEditingType] = useState(page.type);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  useEffect(() => {
    if (!showSavedModal) return;
    const timer = setTimeout(() => setShowSavedModal(false), 1500);
    return () => clearTimeout(timer);
  }, [showSavedModal]);

  async function handleSave(formData: FormData) {
    setIsSaving(true);
    try {
      await updatePage(formData);
      setIsEditing(false);
      setShowSavedModal(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  const groupName = groups.find((g) => g.id === page.group_id)?.name;
  const selectableParents = allPages.filter((p) => p.id !== page.id);

  return (
    <div>
      {!isEditing && (
        <div
          className={`${ROW_GRID_CLASS} border-b border-border py-2 text-[13px] ${isDragging ? "opacity-40" : ""}`}
        >
          <span
            {...dragHandleProps}
            title="ドラッグして並び替え"
            aria-label="ドラッグして並び替え"
            className="cursor-grab select-none text-center text-subtle hover:text-ink"
          >
            ⠿
          </span>
          <span
            style={{ paddingLeft: depth * 10 }}
            className="truncate font-semibold"
            title={page.name}
          >
            {pageDepthPrefix(depth)}
            {page.name}
          </span>
          <span className="text-[12px] text-muted">{pageTypeLabel(page.type)}</span>
          <span className="text-[12px] text-muted">{page.complexity}</span>
          <span>
            <Tag>{page.wire_needed ? "ワイヤー" : "不要"}</Tag>
          </span>
          <span>
            <Tag>{page.copy_needed ? "コピー" : "不要"}</Tag>
          </span>
          <span>
            <Tag>{page.design_needed ? "デザイン" : "なし"}</Tag>
          </span>
          <span>
            <Tag>{page.coding_needed ? "コーディング" : "なし"}</Tag>
          </span>
          <span>{page.cms_tier && <Tag>{cmsTierLabel(page.cms_tier)}</Tag>}</span>
          <span>{page.mobile_menu_needed && <Tag>スマホ対応</Tag>}</span>
          <span className="truncate">{groupName && <Tag>{groupName}</Tag>}</span>
          <div className="flex justify-end gap-1.5">
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
          action={handleSave}
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
            <select
              name="type"
              value={editingType}
              onChange={(e) => setEditingType(e.target.value)}
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
            <label className="mb-1 block text-[12px] font-semibold text-muted">CMS構築費</label>
            <select name="cmsTier" defaultValue={page.cms_tier ?? ""} className={inputClass}>
              {CMS_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier ? `CMS構築${tier}` : "なし"}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 pb-2 text-[13px]">
            <input type="checkbox" name="wireNeeded" defaultChecked={page.wire_needed} />
            ワイヤー要
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-[13px]">
            <input type="checkbox" name="copyNeeded" defaultChecked={page.copy_needed} />
            コピー要
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-[13px]">
            <input type="checkbox" name="designSkip" defaultChecked={!page.design_needed} />
            デザインなし
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-[13px]">
            <input type="checkbox" name="codingSkip" defaultChecked={!page.coding_needed} />
            コーディングなし
          </label>
          {editingType === "top" && (
            <label className="flex items-center gap-1.5 pb-2 text-[13px]">
              <input
                type="checkbox"
                name="mobileMenuNeeded"
                defaultChecked={page.mobile_menu_needed}
              />
              スマホ対応メニュー（メガメニュー）を含める
            </label>
          )}

          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
          <Button type="button" onClick={() => setIsEditing(false)} disabled={isSaving}>
            キャンセル
          </Button>
        </form>
      )}

      <Modal open={showSavedModal} onClose={() => setShowSavedModal(false)}>
        <p className="text-center text-[14px] font-semibold text-accent">✓ 保存しました</p>
      </Modal>
    </div>
  );
}
