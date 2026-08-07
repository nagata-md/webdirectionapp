import { Panel, SectionLabel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/server";
import type { PageNode, ProgressGroup } from "@/lib/pages/constants";
import { GroupsEditor } from "./GroupsEditor";
import { PageForm } from "./PageForm";
import { DirectoryMapTree } from "./DirectoryMapTree";

export default async function DirectoryMapPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [{ data: pages }, { data: groups }] = await Promise.all([
    supabase
      .from("pages")
      .select(
        "id, name, type, complexity, parent_id, wire_needed, copy_needed, design_needed, coding_needed, cms_tier, mobile_menu_needed, group_id, priority",
      )
      .eq("project_id", projectId),
    supabase
      .from("progress_groups")
      .select("id, name, sort_order")
      .eq("project_id", projectId)
      .order("sort_order"),
  ]);

  const allPages = (pages ?? []) as PageNode[];
  const allGroups = (groups ?? []) as ProgressGroup[];

  return (
    <div>
      <Panel className="mb-4">
        <SectionLabel>進行グループ</SectionLabel>
        <GroupsEditor projectId={projectId} initialGroups={allGroups} />
      </Panel>

      <Panel className="mb-4">
        <SectionLabel>ページ追加</SectionLabel>
        <PageForm projectId={projectId} pages={allPages} groups={allGroups} />
      </Panel>

      <Panel>
        <SectionLabel>ディレクトリマップ</SectionLabel>
        <DirectoryMapTree projectId={projectId} initialPages={allPages} groups={allGroups} />
      </Panel>
    </div>
  );
}
