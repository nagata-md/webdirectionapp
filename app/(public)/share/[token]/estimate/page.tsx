import { Panel, SectionLabel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";
import { loadProjectEstimate } from "@/lib/estimate/loadProjectEstimate";
import type { EstimateResult } from "@/lib/estimate/calculate";
import { ShareEstimateTable } from "../ShareEstimateTable";

export default async function ShareEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);
  if (result.status !== "ok" || !result.link.sections.estimate) return null;

  const { link } = result;

  let estimate: EstimateResult | null = null;
  let versionLabel: string | null = null;
  let pdfSignedUrl: string | null = null;

  if (link.mode === "estimateVersion" && link.estimateVersionId) {
    const { data: version } = await admin
      .from("estimate_versions")
      .select("quote_number, issued_at, valid_until, estimate_data, pdf_url")
      .eq("id", link.estimateVersionId)
      .maybeSingle();
    if (version) {
      // estimate_dataは{ detailed, aggregated, total }の形（Phase 12）。共有閲覧はページ別内訳の
      // detailedを表示する（liveモードのShareEstimateTableと同じ形に揃える）。
      const snapshot = version.estimate_data as { detailed: EstimateResult };
      estimate = snapshot.detailed;
      versionLabel = `${version.quote_number}（${String(version.issued_at).slice(0, 10)}発行・有効期限${version.valid_until}）`;

      // 見積もりPDFのダウンロードはestimateVersionモード（発行済みPDFがある場合）のみ提供する。
      // liveモードは都度生成の仕組みがないため対象外（Phase 12、spec §4.11の仕様変更）。
      if (version.pdf_url) {
        const { data: signed } = await admin.storage
          .from("estimate-pdfs")
          .createSignedUrl(version.pdf_url, 60 * 10);
        pdfSignedUrl = signed?.signedUrl ?? null;
      }
    }
  } else {
    const loaded = await loadProjectEstimate(link.projectId, admin);
    estimate = loaded.estimate;
  }

  if (!estimate) return null;

  return (
    <Panel>
      <SectionLabel>見積もり</SectionLabel>
      {versionLabel && <p className="mb-3 text-[12px] text-subtle">見積書番号: {versionLabel}</p>}
      <ShareEstimateTable estimate={estimate} />
      {pdfSignedUrl && (
        <div className="mt-4">
          <LinkButton href={pdfSignedUrl} target="_blank" rel="noopener noreferrer" variant="primary">
            見積書PDFをダウンロード
          </LinkButton>
        </div>
      )}
    </Panel>
  );
}
