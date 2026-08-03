import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { SavedBanner } from "@/components/ui/SavedBanner";
import { createClient } from "@/lib/supabase/server";
import { createProject, deleteProject, copyProject } from "./actions";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  const { q, archived } = await searchParams;
  const showArchived = archived === "1";

  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("id, project_name, client_name, start_date, archived_at")
    .order("created_at", { ascending: true });

  if (!showArchived) {
    query = query.is("archived_at", null);
  }
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[%,]/g, "");
    query = query.or(`project_name.ilike.%${escaped}%,client_name.ilike.%${escaped}%`);
  }

  const { data: projects } = await query;
  const projectIds = (projects ?? []).map((p) => p.id);

  const { data: ownersRaw } =
    projectIds.length > 0
      ? await supabase
          .from("project_owners")
          .select("project_id, role, name")
          .in("project_id", projectIds)
      : { data: [] };

  const primaryOwnerByProject = new Map<string, string>();
  for (const projectId of projectIds) {
    const owners = (ownersRaw ?? []).filter((o) => o.project_id === projectId);
    const director = owners.find((o) => o.role === "ディレクター");
    const primary = director ?? owners[0];
    if (primary) primaryOwnerByProject.set(projectId, primary.name);
  }

  const { count: totalCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  const canDelete = (totalCount ?? 0) > 1;

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
        <form method="GET" className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted">
              フリーワード検索
            </label>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="プロジェクト名・クライアント名"
              className="w-64 rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-[13px]">
            <input type="checkbox" name="archived" value="1" defaultChecked={showArchived} />
            完了プロジェクトも表示
          </label>
          <Button type="submit">検索</Button>
        </form>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-[13px]">
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
                <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                  担当者
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
                    {project.archived_at && (
                      <span className="ml-2 rounded bg-surface-subtle px-1.5 py-0.5 text-[11px] text-subtle">
                        完了
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">{project.client_name ?? "-"}</td>
                  <td className="px-2 py-2">{project.start_date ?? "-"}</td>
                  <td className="px-2 py-2">{primaryOwnerByProject.get(project.id) ?? "-"}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <form action={copyProject}>
                        <input type="hidden" name="projectId" value={project.id} readOnly />
                        <Button type="submit">コピー</Button>
                      </form>
                      <form action={deleteProject}>
                        <input type="hidden" name="projectId" value={project.id} readOnly />
                        <Button type="submit" variant="danger" disabled={!canDelete}>
                          削除
                        </Button>
                      </form>
                    </div>
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
