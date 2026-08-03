import { Panel, SectionLabel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/server";
import { loadProjectSchedule } from "@/lib/schedule/loadProjectSchedule";
import { GanttChart } from "./GanttChart";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [scheduleData, { data: pages }] = await Promise.all([
    loadProjectSchedule(projectId),
    supabase.from("pages").select("id, name").eq("project_id", projectId),
  ]);

  const pageIds = (pages ?? []).map((p) => p.id);
  const { data: historyRaw } =
    pageIds.length > 0
      ? await supabase
          .from("schedule_overrides")
          .select("page_id, phase_key, override_start, override_end, edited_by_email, edited_at")
          .in("page_id", pageIds)
          .order("edited_at", { ascending: false })
      : { data: [] };

  const pageNameById = new Map((pages ?? []).map((p) => [p.id, p.name]));

  return (
    <div>
      {!scheduleData.projectStartDate && (
        <Panel className="mb-4">
          <p className="text-[13px] text-danger">
            このプロジェクトの着手日が未設定です。基本情報画面で着手日を設定するとスケジュールが計算されます。
          </p>
        </Panel>
      )}

      <Panel className="mb-4">
        <SectionLabel>ガントチャート</SectionLabel>
        <GanttChart
          projectId={projectId}
          pages={pages ?? []}
          pageSchedules={scheduleData.schedule?.pages ?? []}
          projectStartDate={scheduleData.projectStartDate}
          weeklyOff={scheduleData.master.weeklyOff}
          holidays={scheduleData.master.holidays}
        />
      </Panel>

      <Panel>
        <SectionLabel>変更履歴</SectionLabel>
        {(historyRaw ?? []).length === 0 && (
          <p className="text-[13px] text-subtle">手動編集の履歴はまだありません</p>
        )}
        {(historyRaw ?? []).length > 0 && (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    ページ
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    工程
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    変更後の期間
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    変更者
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    変更日時
                  </th>
                </tr>
              </thead>
              <tbody>
                {(historyRaw ?? []).map((h, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-2 py-1.5">{pageNameById.get(h.page_id) ?? h.page_id}</td>
                    <td className="px-2 py-1.5">{h.phase_key}</td>
                    <td className="px-2 py-1.5">
                      {h.override_start} 〜 {h.override_end}
                    </td>
                    <td className="px-2 py-1.5">{h.edited_by_email ?? "-"}</td>
                    <td className="px-2 py-1.5">
                      {h.edited_at ? new Date(h.edited_at).toLocaleString("ja-JP") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
