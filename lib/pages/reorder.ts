// ディレクトリマップのドラッグ&ドロップ並び替え（2026-08-07新規要件）。
// 同じ親を持つ兄弟ページの範囲内でのみ順序を変更する（親子階層はセットで移動する仕様のため、
// 子ページは常に親ページの表示の内側に描画され、兄弟の並び替えだけで階層構造ごと動く）。

export type ReorderablePage = { id: string; parent_id: string | null };

// 指定した兄弟グループ（parentIdが一致するページ群）に、orderedIdsの順序で
// 1始まりの新しいpriorityを割り当てる。他の親を持つページのpriorityには影響しない。
// orderedIdsに漏れがある場合は元の兄弟順の末尾に補い、対象外のIDは無視する（安全策）。
export function reorderSiblingPriorities(
  pages: ReorderablePage[],
  parentId: string | null,
  orderedIds: string[],
): Map<string, number> {
  const siblingIds = pages.filter((p) => p.parent_id === parentId).map((p) => p.id);
  const siblingIdSet = new Set(siblingIds);

  const validOrdered = orderedIds.filter((id) => siblingIdSet.has(id));
  const seen = new Set(validOrdered);
  const missing = siblingIds.filter((id) => !seen.has(id));
  const finalOrder = [...validOrdered, ...missing];

  const result = new Map<string, number>();
  finalOrder.forEach((id, index) => {
    result.set(id, index + 1);
  });
  return result;
}
