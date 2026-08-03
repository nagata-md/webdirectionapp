import { Panel, SectionLabel } from "@/components/ui/Panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";
import { loadProjectSchedule } from "@/lib/schedule/loadProjectSchedule";
import { ShareGantt } from "../ShareGantt";

export default async function ShareSchedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);
  if (result.status !== "ok" || !result.link.sections.schedule) return null;

  const [scheduleData, { data: pagesRaw }] = await Promise.all([
    loadProjectSchedule(result.link.projectId, admin),
    admin.from("pages").select("id, name").eq("project_id", result.link.projectId),
  ]);

  return (
    <Panel>
      <SectionLabel>スケジュール</SectionLabel>
      <ShareGantt
        pages={pagesRaw ?? []}
        pageSchedules={scheduleData.schedule?.pages ?? []}
        projectStartDate={scheduleData.projectStartDate}
        weeklyOff={scheduleData.master.weeklyOff}
        holidays={scheduleData.master.holidays}
      />
    </Panel>
  );
}
