type SharePageMeta = {
  id: string;
  name: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  keywords: string | null;
  due_date: string | null;
};

// 外部共有では進捗ステータス（社内管理用の詳細）は表示しない（spec §4.10）
export function ShareMetaTable({ pages }: { pages: SharePageMeta[] }) {
  if (pages.length === 0) {
    return <p className="text-[13px] text-subtle">ページが登録されていません</p>;
  }

  return (
    <div className="table-scroll overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
              ページ
            </th>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
              スラッグ
            </th>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
              TITLE
            </th>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
              ディスクリプション
            </th>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
              キーワード
            </th>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
              納品予定日
            </th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id} className="border-b border-border">
              <td className="px-2 py-1.5 font-semibold">{page.name}</td>
              <td className="px-2 py-1.5">{page.slug ?? "-"}</td>
              <td className="px-2 py-1.5">{page.title ?? "-"}</td>
              <td className="px-2 py-1.5">{page.description ?? "-"}</td>
              <td className="px-2 py-1.5">{page.keywords ?? "-"}</td>
              <td className="px-2 py-1.5">{page.due_date ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
