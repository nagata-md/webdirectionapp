import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button, LinkButton } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { PAGE_STATUSES } from "@/lib/pages/constants";
import { loadProjectSchedule } from "@/lib/schedule/loadProjectSchedule";
import { AiGeneratePanel } from "./AiGeneratePanel";
import { saveMetaTable } from "./actions";

const cellInputClass = "w-full rounded-control border border-border-strong px-2 py-1 text-[12px]";
const cellTextareaClass = `${cellInputClass} resize-y`;

export default async function MetaPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [{ data: pages }, { data: lastLog }, scheduleData] = await Promise.all([
    supabase
      .from("pages")
      .select("id, name, slug, title, description, keywords, due_date, status, priority")
      .eq("project_id", projectId)
      .order("priority"),
    supabase
      .from("ai_meta_generation_logs")
      .select("instruction")
      .eq("project_id", projectId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadProjectSchedule(projectId),
  ]);

  const computedPublishDateByPage = new Map(
    (scheduleData.schedule?.pages ?? []).map((ps) => [
      ps.pageId,
      ps.phases.find((ph) => ph.phase === "公開")?.end ?? null,
    ]),
  );

  return (
    <div>
      <Panel className="mb-4">
        <SectionLabel>AI一括生成</SectionLabel>
        <AiGeneratePanel projectId={projectId} initialInstruction={lastLog?.instruction ?? ""} />
      </Panel>

      <Panel>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>メタ情報・進行管理</SectionLabel>
          <LinkButton href={`/projects/${projectId}/meta/csv`}>
            開発者向けCSVエクスポート
          </LinkButton>
        </div>
        {(pages ?? []).length === 0 && (
          <p className="text-[13px] text-subtle">ページが登録されていません</p>
        )}
        {(pages ?? []).length > 0 && (
          <form action={saveMetaTable}>
            <input type="hidden" name="projectId" value={projectId} readOnly />
            <div className="table-scroll mb-3 overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-[13px]">
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
                    <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                      進捗ステータス
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(pages ?? []).map((page) => {
                    const computedPublishDate = computedPublishDateByPage.get(page.id);
                    return (
                      <tr key={page.id} className="border-b border-border">
                        <td className="px-2 py-1.5 font-semibold">
                          <input type="hidden" name="pageId" value={page.id} />
                          {page.name}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            name={`slug.${page.id}`}
                            defaultValue={page.slug ?? ""}
                            className={cellInputClass}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <textarea
                            name={`title.${page.id}`}
                            defaultValue={page.title ?? ""}
                            rows={1}
                            className={cellTextareaClass}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <textarea
                            name={`description.${page.id}`}
                            defaultValue={page.description ?? ""}
                            rows={1}
                            className={cellTextareaClass}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <textarea
                            name={`keywords.${page.id}`}
                            defaultValue={page.keywords ?? ""}
                            rows={1}
                            className={cellTextareaClass}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            name={`dueDate.${page.id}`}
                            defaultValue={page.due_date ?? ""}
                            className={cellInputClass}
                          />
                          {computedPublishDate && (
                            <div className="mt-0.5 text-[11px] text-subtle">
                              計算上の公開予定日：{computedPublishDate}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            name={`status.${page.id}`}
                            defaultValue={page.status}
                            className={cellInputClass}
                          >
                            {PAGE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="submit" variant="primary">
              保存
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
