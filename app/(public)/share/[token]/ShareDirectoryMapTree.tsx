import { Tag } from "@/components/ui/Tag";
import { cmsTierLabel, pageTypeLabel } from "@/lib/pages/constants";

type SharePageNode = {
  id: string;
  name: string;
  type: string;
  complexity: string;
  parent_id: string | null;
  wire_needed: boolean;
  copy_needed: boolean;
  cms_tier: string | null;
  priority: number;
};

// 外部共有では優先度・進行グループの並行作業人数設定など内部運用項目は表示しない（spec §4.10）
function ShareDirectoryMapRow({
  page,
  depth,
  allPages,
}: {
  page: SharePageNode;
  depth: number;
  allPages: SharePageNode[];
}) {
  const children = allPages
    .filter((p) => p.parent_id === page.id)
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border py-2">
        <span className="font-semibold">{page.name}</span>
        <Tag>{pageTypeLabel(page.type)}</Tag>
        <Tag>{page.complexity}</Tag>
        <Tag>{page.wire_needed ? "ワイヤー" : "ワイヤー不要"}</Tag>
        <Tag>{page.copy_needed ? "コピー" : "コピー不要"}</Tag>
        {page.cms_tier && <Tag>{cmsTierLabel(page.cms_tier)}</Tag>}
      </div>
      {children.map((child) => (
        <ShareDirectoryMapRow key={child.id} page={child} depth={depth + 1} allPages={allPages} />
      ))}
    </div>
  );
}

export function ShareDirectoryMapTree({ pages }: { pages: SharePageNode[] }) {
  const rootPages = pages
    .filter((p) => !p.parent_id)
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  if (rootPages.length === 0) {
    return <p className="text-[13px] text-subtle">ページが登録されていません</p>;
  }

  return (
    <div>
      {rootPages.map((page) => (
        <ShareDirectoryMapRow key={page.id} page={page} depth={0} allPages={pages} />
      ))}
    </div>
  );
}
