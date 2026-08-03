import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSharePasswordVerified, sharePasswordCookieName } from "@/lib/share/passwordCookie";
import { isShareLinkExpired } from "@/lib/share/expiry";
import { loadProjectEstimate } from "@/lib/estimate/loadProjectEstimate";
import { loadProjectSchedule } from "@/lib/schedule/loadProjectSchedule";
import type { EstimateResult } from "@/lib/estimate/calculate";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ShareDirectoryMapTree } from "./ShareDirectoryMapTree";
import { ShareGantt } from "./ShareGantt";
import { ShareEstimateTable } from "./ShareEstimateTable";
import { ShareMetaTable } from "./ShareMetaTable";
import { verifyShareLinkPassword } from "./actions";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 border-l-4 border-accent pl-2.5 text-xl">共有ビュー</h1>
      {children}
    </div>
  );
}

function InvalidLinkMessage({ message }: { message: string }) {
  return (
    <Shell>
      <Panel>
        <p className="text-[13px] text-danger">{message}</p>
      </Panel>
    </Shell>
  );
}

function PasswordGate({ token, hasError }: { token: string; hasError: boolean }) {
  return (
    <Shell>
      <Panel>
        <SectionLabel>パスワードが必要です</SectionLabel>
        <form action={verifyShareLinkPassword} className="flex flex-col gap-3">
          <input type="hidden" name="token" value={token} readOnly />
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            autoFocus
            className="w-full max-w-xs rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
          />
          {hasError && <p className="text-[13px] text-danger">パスワードが違います。</p>}
          <div>
            <Button type="submit" variant="primary">
              表示する
            </Button>
          </div>
        </form>
      </Panel>
    </Shell>
  );
}

export default async function ShareViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("share_links")
    .select(
      "id, project_id, mode, estimate_version_id, include_sections, password_hash, expires_at, revoked, view_count",
    )
    .eq("token", token)
    .maybeSingle();

  if (!link) {
    return <InvalidLinkMessage message="このリンクは存在しません。URLをご確認ください。" />;
  }
  if (link.revoked) {
    return <InvalidLinkMessage message="このリンクは発行者により失効されています。" />;
  }
  if (isShareLinkExpired(link.expires_at)) {
    return <InvalidLinkMessage message="このリンクの有効期限が切れています。" />;
  }

  if (link.password_hash) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(sharePasswordCookieName(token))?.value;
    if (!isSharePasswordVerified(token, cookieValue)) {
      return <PasswordGate token={token} hasError={error === "1"} />;
    }
  }

  await admin
    .from("share_links")
    .update({ view_count: link.view_count + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", link.id);

  const { data: project } = await admin
    .from("projects")
    .select("project_name, client_name")
    .eq("id", link.project_id)
    .single();

  const sections = (link.include_sections as Record<string, boolean>) ?? {};

  const { data: pagesRaw } = await admin
    .from("pages")
    .select(
      "id, name, type, complexity, parent_id, wire_needed, copy_needed, priority, slug, title, description, keywords, due_date",
    )
    .eq("project_id", link.project_id);
  const allPages = pagesRaw ?? [];

  let scheduleView: { pages: { id: string; name: string }[]; pageSchedules: import("@/lib/schedule/types").PageSchedule[] } | null = null;
  if (sections.schedule) {
    const scheduleData = await loadProjectSchedule(link.project_id, admin);
    scheduleView = {
      pages: allPages.map((p) => ({ id: p.id, name: p.name })),
      pageSchedules: scheduleData.schedule?.pages ?? [],
    };
  }

  let estimateView: { estimate: EstimateResult; versionLabel: string | null } | null = null;
  if (sections.estimate) {
    if (link.mode === "estimateVersion" && link.estimate_version_id) {
      const { data: version } = await admin
        .from("estimate_versions")
        .select("quote_number, issued_at, valid_until, estimate_data")
        .eq("id", link.estimate_version_id)
        .maybeSingle();
      if (version) {
        estimateView = {
          estimate: version.estimate_data as EstimateResult,
          versionLabel: `${version.quote_number}（${String(version.issued_at).slice(0, 10)}発行・有効期限${version.valid_until}）`,
        };
      }
    } else {
      const { estimate } = await loadProjectEstimate(link.project_id, admin);
      estimateView = { estimate, versionLabel: null };
    }
  }

  return (
    <Shell>
      <p className="mb-4 text-[13px] text-subtle">
        {project?.client_name ? `${project.client_name} 様　` : ""}
        {project?.project_name}
      </p>

      {sections.directoryMap && (
        <Panel className="mb-4">
          <SectionLabel>ディレクトリマップ</SectionLabel>
          <ShareDirectoryMapTree pages={allPages} />
        </Panel>
      )}

      {sections.schedule && scheduleView && (
        <Panel className="mb-4">
          <SectionLabel>スケジュール</SectionLabel>
          <ShareGantt pages={scheduleView.pages} pageSchedules={scheduleView.pageSchedules} />
        </Panel>
      )}

      {sections.estimate && estimateView && (
        <Panel className="mb-4">
          <SectionLabel>見積もり</SectionLabel>
          {estimateView.versionLabel && (
            <p className="mb-3 text-[12px] text-subtle">見積書番号: {estimateView.versionLabel}</p>
          )}
          <ShareEstimateTable estimate={estimateView.estimate} />
        </Panel>
      )}

      {sections.meta && (
        <Panel>
          <SectionLabel>ページ情報</SectionLabel>
          <ShareMetaTable pages={allPages} />
        </Panel>
      )}
    </Shell>
  );
}
