// ディレクトリマップのページ種別（spec §4.2）。DB上は英語キーで保持し、表示ラベルのみ日本語にする。
export const PAGE_TYPES = [
  { value: "top", label: "TOP" },
  { value: "lower", label: "下層" },
  { value: "lp", label: "LP" },
  { value: "blog", label: "ブログ" },
  { value: "other", label: "その他" },
] as const;

export type PageType = (typeof PAGE_TYPES)[number]["value"];

export function pageTypeLabel(value: string): string {
  return PAGE_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ページの進捗ステータス（spec §4.8、DBのCHECK制約と同じ日本語ラベルをそのまま使う）
export const PAGE_STATUSES = [
  "未着手",
  "構成中",
  "デザイン中",
  "コーディング中",
  "テスト中",
  "公開済",
] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

// CMS構築費の区分（Phase 12。個別費用の自由入力欄を置き換えるドロップダウン）
export const CMS_TIERS = ["", "S", "M", "L"] as const;
export type CmsTier = "" | "S" | "M" | "L";

export function cmsTierLabel(value: string | null): string {
  if (!value) return "なし";
  return `CMS構築${value}`;
}

export type PageNode = {
  id: string;
  name: string;
  type: string;
  complexity: string;
  parent_id: string | null;
  wire_needed: boolean;
  copy_needed: boolean;
  cms_tier: string | null;
  mobile_menu_needed: boolean;
  group_id: string | null;
  priority: number;
};

export type ProgressGroup = {
  id: string;
  name: string;
  sort_order: number;
};

// pageIdをparentIdにした場合に循環参照(自分自身や自分の子孫を親にする)にならないかを判定する。
export function isDescendant(
  pages: Pick<PageNode, "id" | "parent_id">[],
  ancestorId: string,
  targetId: string,
): boolean {
  const childrenByParent = new Map<string, Pick<PageNode, "id" | "parent_id">[]>();
  for (const p of pages) {
    if (!p.parent_id) continue;
    const list = childrenByParent.get(p.parent_id) ?? [];
    list.push(p);
    childrenByParent.set(p.parent_id, list);
  }

  function walk(currentId: string): boolean {
    const children = childrenByParent.get(currentId) ?? [];
    for (const child of children) {
      if (child.id === targetId) return true;
      if (walk(child.id)) return true;
    }
    return false;
  }

  return walk(ancestorId);
}
