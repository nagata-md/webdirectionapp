import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { SavedBanner } from "@/components/ui/SavedBanner";
import { createClient } from "@/lib/supabase/server";
import { createProject, deleteProject } from "./actions";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_name, client_name, start_date")
    .order("created_at", { ascending: true });

  const canDelete = (projects?.length ?? 0) > 1;

  return (
    <div>
      <PageHeader title="プロジェクト" eyebrow="PROJECTS" />
      <Suspense fallback={null}>
        <SavedBanner />
      </Suspense>

      <Panel className="mb-4">
        <SectionLabel>新規プロジェクト</SectionLabel>
        <form action={createProject} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">
              プロジェクト名（必須）
            </label>
            <input
              type="text"
              name="projectName"
              required
              className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">
              クライアント名
            </label>
            <input
              type="text"
              name="clientName"
              className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <Button type="submit" variant="primary">
            ＋ 作成
          </Button>
        </form>
      </Panel>

      <Panel>
        <SectionLabel>プロジェクト一覧</SectionLabel>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                  プロジェクト名
                </th>
                <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                  クライアント名
                </th>
                <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                  着手日
                </th>
                <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted" />
              </tr>
            </thead>
            <tbody>
              {(projects ?? []).map((project) => (
                <tr key={project.id} className="border-b border-border">
                  <td className="px-2 py-2">
                    <Link href={`/projects/${project.id}`} className="font-semibold">
                      {project.project_name}
                    </Link>
                  </td>
                  <td className="px-2 py-2">{project.client_name ?? "-"}</td>
                  <td className="px-2 py-2">{project.start_date ?? "-"}</td>
                  <td className="px-2 py-2 text-right">
                    <form action={deleteProject}>
                      <input type="hidden" name="projectId" value={project.id} readOnly />
                      <Button type="submit" variant="danger" disabled={!canDelete}>
                        削除
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
