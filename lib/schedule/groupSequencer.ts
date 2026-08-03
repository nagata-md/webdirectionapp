import type { ProgressGroupInput, SchedulePageInput } from "./types";

export type GroupBucket = {
  groupId: string | null;
  sortOrder: number;
  pageIds: string[];
};

// 進行グループごとにページをバケット分けする（spec §4.3）。
// - 未設定（group_id=null）のページは表示順1のグループ扱いになる。
// - 進行グループが1件も無いプロジェクトは、全ページを1つの暗黙グループ（groupId=null）として扱う。
export function buildGroupBuckets(
  groups: ProgressGroupInput[],
  pages: SchedulePageInput[],
): GroupBucket[] {
  if (groups.length === 0) {
    return [
      {
        groupId: null,
        sortOrder: 1,
        pageIds: pages.map((p) => p.id),
      },
    ];
  }

  const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const firstGroupId = sortedGroups[0].id;

  const buckets = new Map<string, GroupBucket>();
  for (const g of sortedGroups) {
    buckets.set(g.id, { groupId: g.id, sortOrder: g.sortOrder, pageIds: [] });
  }

  for (const page of pages) {
    const targetGroupId = page.groupId && buckets.has(page.groupId) ? page.groupId : firstGroupId;
    buckets.get(targetGroupId)!.pageIds.push(page.id);
  }

  return sortedGroups.map((g) => buckets.get(g.id)!);
}
