import { notFound } from "next/navigation";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { unarchiveProject, updateProjectBasicInfo } from "../actions";
import { OwnersEditor } from "./OwnersEditor";
import { ProjectLinksEditor } from "./ProjectLinksEditor";
import { ArchiveProjectForm } from "./ArchiveProjectForm";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, client_name, project_name, start_date, archived_at")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  const [{ data: owners }, { data: links }] = await Promise.all([
    supabase
      .from("project_owners")
      .select("role, name")
      .eq("project_id", projectId),
    supabase
      .from("project_links")
      .select("category, label, url")
      .eq("project_id", projectId)
      .order("sort_order"),
  ]);

  const serverLinks = (links ?? []).filter((l) => l.category === "server");
  const figmaLinks = (links ?? []).filter((l) => l.category === "figma");

  return (
    <div>
      <Panel className="mb-4">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>基本情報</SectionLabel>
          {project.archived_at ? (
            <form action={unarchiveProject}>
              <input type="hidden" name="projectId" value={project.id} readOnly />
              <Button type="submit">完了を取り消す</Button>
            </form>
          ) : (
            <ArchiveProjectForm projectId={project.id} />
          )}
        </div>
        <form action={updateProjectBasicInfo}>
          <input type="hidden" name="projectId" value={project.id} readOnly />
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
            <FormRow label="プロジェクト名（必須）" htmlFor="projectName">
              <input
                id="projectName"
                type="text"
                name="projectName"
                required
                defaultValue={project.project_name}
                className="w-full rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
              />
            </FormRow>
            <FormRow label="クライアント名" htmlFor="clientName">
              <input
                id="clientName"
                type="text"
                name="clientName"
                defaultValue={project.client_name ?? ""}
                className="w-full rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
              />
            </FormRow>
            <FormRow label="着手日" htmlFor="startDate">
              <input
                id="startDate"
                type="date"
                name="startDate"
                defaultValue={project.start_date ?? ""}
                className="w-full rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
              />
            </FormRow>
          </div>
          <Button type="submit" variant="primary">
            保存
          </Button>
        </form>
      </Panel>

      <Panel className="mb-4">
        <SectionLabel>自社担当者</SectionLabel>
        <OwnersEditor projectId={project.id} initialOwners={owners ?? []} />
      </Panel>

      <Panel className="mb-4">
        <SectionLabel>サーバー情報リンク</SectionLabel>
        <ProjectLinksEditor
          projectId={project.id}
          category="server"
          initialLinks={serverLinks}
        />
      </Panel>

      <Panel>
        <SectionLabel>Figmaリンク</SectionLabel>
        <ProjectLinksEditor
          projectId={project.id}
          category="figma"
          initialLinks={figmaLinks}
        />
      </Panel>
    </div>
  );
}
