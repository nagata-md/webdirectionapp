import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";
import { ShareBasicInfoView } from "../ShareBasicInfoView";

export default async function ShareBasicInfoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);
  if (result.status !== "ok") return null;

  const { sections, projectId } = result.link;
  const full = sections.basicInfoFull;
  if (!sections.basicInfoPublic && !full) return null;

  const { data: project } = await admin
    .from("projects")
    .select("project_name, client_name, start_date")
    .eq("id", projectId)
    .single();

  let owners: { role: string; name: string }[] = [];
  let serverLinks: { category: string; label: string; url: string }[] = [];
  let figmaLinks: { category: string; label: string; url: string }[] = [];

  if (full) {
    const [{ data: ownersRaw }, { data: linksRaw }] = await Promise.all([
      admin.from("project_owners").select("role, name").eq("project_id", projectId),
      admin
        .from("project_links")
        .select("category, label, url")
        .eq("project_id", projectId)
        .order("sort_order"),
    ]);
    owners = ownersRaw ?? [];
    serverLinks = (linksRaw ?? []).filter((l) => l.category === "server");
    figmaLinks = (linksRaw ?? []).filter((l) => l.category === "figma");
  }

  return (
    <ShareBasicInfoView
      projectName={project?.project_name ?? ""}
      clientName={project?.client_name ?? null}
      startDate={project?.start_date ?? null}
      full={full}
      owners={owners}
      serverLinks={serverLinks}
      figmaLinks={figmaLinks}
    />
  );
}
