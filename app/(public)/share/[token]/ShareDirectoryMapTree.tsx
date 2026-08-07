import { Tag } from "@/components/ui/Tag";
import { cmsTierLabel, comparePageSiblings, pageDepthPrefix, pageTypeLabel } from "@/lib/pages/constants";

type SharePageNode = {
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
  priority: number;
};

// ページ名とタグを列として揃えるグリッド（社内ディレクトリマップと同じ考え方、2026-08-07新規要件）。
// 共有閲覧画面では優先度・進行グループ等の内部運用項目は表示しないため列数は少ない（spec §4.10）。
const SHARE_ROW_GRID_CLASS =
  "grid grid-cols-[minmax(170px,1.6fr)_60px_44px_70px_70px_70px_78px_84px_104px] items-center gap-x-2 gap-y-1";

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
  const children = allPages.filter((p) => p.parent_id === page.id).sort(comparePageSiblings);

  return (
    <div>
      <div className={`${SHARE_ROW_GRID_CLASS} border-b border-border py-2 text-[13px]`}>
        <span style={{ paddingLeft: depth * 10 }} className="truncate font-semibold" title={page.name}>
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
      </div>
      {children.map((child) => (
        <ShareDirectoryMapRow key={child.id} page={child} depth={depth + 1} allPages={allPages} />
      ))}
    </div>
  );
}

export function ShareDirectoryMapTree({ pages }: { pages: SharePageNode[] }) {
  const rootPages = pages.filter((p) => !p.parent_id).sort(comparePageSiblings);

  if (rootPages.length === 0) {
    return <p className="text-[13px] text-subtle">ページが登録されていません</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {rootPages.map((page) => (
          <ShareDirectoryMapRow key={page.id} page={page} depth={0} allPages={pages} />
        ))}
      </div>
    </div>
  );
}
