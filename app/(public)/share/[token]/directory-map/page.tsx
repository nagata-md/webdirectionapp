import { Panel, SectionLabel } from "@/components/ui/Panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";
import { ShareDirectoryMapTree } from "../ShareDirectoryMapTree";

export default async function ShareDirectoryMapPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);
  if (result.status !== "ok" || !result.link.sections.directoryMap) return null;

  const { data: pagesRaw } = await admin
    .from("pages")
    .select(
      "id, name, type, complexity, parent_id, wire_needed, copy_needed, cms_tier, mobile_menu_needed, priority",
    )
    .eq("project_id", result.link.projectId);

  return (
    <Panel>
      <SectionLabel>ディレクトリマップ</SectionLabel>
      <ShareDirectoryMapTree pages={pagesRaw ?? []} />
    </Panel>
  );
}
