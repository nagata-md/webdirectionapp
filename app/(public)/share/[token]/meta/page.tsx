import { Panel, SectionLabel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";
import { ShareMetaTable } from "../ShareMetaTable";

export default async function ShareMetaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);
  if (result.status !== "ok" || !result.link.sections.meta) return null;

  const { data: pagesRaw } = await admin
    .from("pages")
    .select("id, name, slug, title, description, keywords, due_date")
    .eq("project_id", result.link.projectId);

  return (
    <Panel>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <SectionLabel>ページ情報</SectionLabel>
        <LinkButton href={`/share/${token}/meta/csv`}>開発者向けCSVダウンロード</LinkButton>
      </div>
      <ShareMetaTable pages={pagesRaw ?? []} />
    </Panel>
  );
}
