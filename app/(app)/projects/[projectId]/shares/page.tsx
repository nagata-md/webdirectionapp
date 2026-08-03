import { headers } from "next/headers";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { isShareLinkExpired } from "@/lib/share/expiry";
import { ShareCreateForm } from "./ShareCreateForm";
import { CopyLinkButton } from "./CopyLinkButton";
import { revokeShareLink } from "./actions";

const SECTION_LABELS: Record<string, string> = {
  estimate: "見積もり",
  directoryMap: "ディレクトリマップ",
  schedule: "スケジュール",
  meta: "メタ情報",
};

export default async function SharesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;

  const [{ data: versionsRaw }, { data: linksRaw }] = await Promise.all([
    supabase
      .from("estimate_versions")
      .select("id, quote_number, issued_at")
      .eq("project_id", projectId)
      .order("issued_at", { ascending: false }),
    supabase
      .from("share_links")
      .select(
        "id, token, mode, estimate_version_id, include_sections, password_hash, expires_at, revoked, created_by_email, created_at, view_count, last_viewed_at, estimate_versions(quote_number)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  const estimateVersions = (versionsRaw ?? []).map((v) => ({
    id: v.id,
    quoteNumber: v.quote_number,
    issuedAt: v.issued_at,
  }));

  return (
    <div>
      <Panel className="mb-4">
        <SectionLabel>共有リンクを発行</SectionLabel>
        <ShareCreateForm projectId={projectId} estimateVersions={estimateVersions} />
      </Panel>

      <Panel>
        <SectionLabel>発行済みの共有リンク</SectionLabel>
        {(linksRaw ?? []).length === 0 && (
          <p className="text-[13px] text-subtle">まだ共有リンクは発行されていません</p>
        )}
        <div className="flex flex-col gap-3">
          {(linksRaw ?? []).map((link) => {
            const isExpired = isShareLinkExpired(link.expires_at);
            const isActive = !link.revoked && !isExpired;
            const sections = (link.include_sections as Record<string, boolean>) ?? {};
            const versionLabel = (link.estimate_versions as unknown as { quote_number: string } | null)
              ?.quote_number;
            const url = `${origin}/share/${link.token}`;

            return (
              <div
                key={link.id}
                className="rounded-panel border border-border-strong p-3.5 text-[13px]"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-control border px-2 py-0.5 text-[11px] font-semibold ${
                      isActive
                        ? "border-accent text-navy"
                        : "border-danger text-danger"
                    }`}
                  >
                    {link.revoked ? "失効済み" : isExpired ? "期限切れ" : "有効"}
                  </span>
                  {Object.entries(sections)
                    .filter(([, v]) => v)
                    .map(([key]) => (
                      <span key={key} className="rounded-control bg-surface-subtle px-2 py-0.5 text-[11px]">
                        {SECTION_LABELS[key] ?? key}
                      </span>
                    ))}
                  {sections.estimate && (
                    <span className="text-[12px] text-subtle">
                      見積もり:{" "}
                      {link.mode === "estimateVersion" ? `${versionLabel ?? "バージョン固定"}` : "ライブ"}
                    </span>
                  )}
                </div>

                <div className="mb-2 break-all font-mono text-[12px] text-muted">{url}</div>

                <div className="flex flex-wrap items-center gap-3 text-[12px] text-subtle">
                  <span>{link.password_hash ? "パスワード: あり" : "パスワード: なし"}</span>
                  <span>有効期限: {link.expires_at ? link.expires_at.slice(0, 10) : "無期限"}</span>
                  <span>閲覧回数: {link.view_count}</span>
                  <span>
                    最終閲覧: {link.last_viewed_at ? new Date(link.last_viewed_at).toLocaleString("ja-JP") : "-"}
                  </span>
                  <span>発行者: {link.created_by_email ?? "-"}</span>
                </div>

                <div className="mt-2 flex gap-2">
                  <CopyLinkButton url={url} />
                  {isActive && (
                    <form
                      action={revokeShareLink}
                      onSubmit={(e) => {
                        if (!confirm("この共有リンクを失効させますか？")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="projectId" value={projectId} readOnly />
                      <input type="hidden" name="shareId" value={link.id} readOnly />
                      <Button type="submit" variant="danger">
                        失効させる
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
