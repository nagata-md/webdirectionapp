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

// 子ページの階層を、字下げだけでなく「ー」の連続でも視認しやすくする（2026-08-07新規要件）。
// depth=1で「ー」、depth=2で「ーー」…をページ名の前に付ける（ルートページはdepth=0で付けない）。
export function pageDepthPrefix(depth: number): string {
  return depth > 0 ? `${"ー".repeat(depth)} ` : "";
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
  design_needed: boolean;
  coding_needed: boolean;
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

// 兄弟ページ(同じparent_id)の表示順の比較関数（2026-08-07再改訂）。
// 進行グループはスケジュールの起点を揃えるための分類であり、表示順とは無関係（ユーザー確定方針）。
// 表示順は純粋にpriority（ドラッグ&ドロップでのみ変化する内部値）の昇順、同値ならページ名で
// 安定させる。ディレクトリマップのツリー表示・ドラッグ&ドロップ後の並び替え結果・見積もり／
// ガントチャートの項目順序で共通して使う。
export function comparePageSiblings<T extends { priority: number; name: string }>(a: T, b: T): number {
  return a.priority - b.priority || a.name.localeCompare(b.name);
}

// ディレクトリマップのツリー表示順（親→子を辿るDFS順）でページをフラットに並べ替える。
// 見積もり・ガントチャートの項目順序をディレクトリマップの表示順と一致させるために使う
// （2026-08-07新規要件）。
export function sortPagesAsTree<
  T extends { id: string; parent_id: string | null; priority: number; name: string },
>(pages: T[]): T[] {
  const childrenByParent = new Map<string | null, T[]>();
  for (const page of pages) {
    const key = page.parent_id;
    const list = childrenByParent.get(key) ?? [];
    list.push(page);
    childrenByParent.set(key, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort(comparePageSiblings);
  }

  const result: T[] = [];
  function walk(parentId: string | null) {
    for (const page of childrenByParent.get(parentId) ?? []) {
      result.push(page);
      walk(page.id);
    }
  }
  walk(null);
  return result;
}

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
