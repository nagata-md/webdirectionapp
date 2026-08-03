import { Panel, SectionLabel } from "@/components/ui/Panel";
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

  if (link.mode === "estimateVersion" && link.estimateVersionId) {
    const { data: version } = await admin
      .from("estimate_versions")
      .select("quote_number, issued_at, valid_until, estimate_data")
      .eq("id", link.estimateVersionId)
      .maybeSingle();
    if (version) {
      // estimate_dataは{ detailed, aggregated, total }の形（Phase 12）。共有閲覧はページ別内訳の
      // detailedを表示する（liveモードのShareEstimateTableと同じ形に揃える）。
      const snapshot = version.estimate_data as { detailed: EstimateResult };
      estimate = snapshot.detailed;
      versionLabel = `${version.quote_number}（${String(version.issued_at).slice(0, 10)}発行・有効期限${version.valid_until}）`;
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
    </Panel>
  );
}
