import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadProjectSchedule } from "@/lib/schedule/loadProjectSchedule";
import { computeEstimate, type EstimateResult } from "./calculate";
import { computeAggregatedEstimate, type AggregatedEstimateResult } from "./calculateAggregated";
import { sortPagesAsTree } from "@/lib/pages/constants";

export type ProjectEstimateData = {
  clientName: string | null;
  projectName: string;
  estimate: EstimateResult;
  aggregated: AggregatedEstimateResult;
};

// supabaseClientを渡すと通常のRLSクライアントの代わりに使う（共有閲覧share_viewでの
// Service Roleクライアント利用のため、spec §4.10）。
export async function loadProjectEstimate(
  projectId: string,
  supabaseClient?: SupabaseClient,
): Promise<ProjectEstimateData> {
  const supabase = supabaseClient ?? (await createClient());

  const [{ data: project }, { data: pagesRaw }, { data: lineItemsRaw }, { data: master }, scheduleData] =
    await Promise.all([
      supabase
        .from("projects")
        .select("client_name, project_name, estimate_remarks")
        .eq("id", projectId)
        .single(),
      supabase
        .from("pages")
        .select(
          "id, name, type, complexity, parent_id, priority, wire_needed, copy_needed, design_needed, coding_needed, cms_tier, mobile_menu_needed",
        )
        .eq("project_id", projectId),
      supabase
        .from("estimate_line_items")
        .select("id, label, amount")
        .eq("project_id", projectId)
        .order("sort_order"),
      supabase
        .from("master")
        .select("rates, top_rates, cms_rates, mobile_menu_rate, direction_monthly_rate, tax_rate")
        .single(),
      loadProjectSchedule(projectId, supabase),
    ]);

  // 見積もりの項目順序をディレクトリマップのツリー表示順と一致させる（2026-08-07新規要件）。
  const pages = sortPagesAsTree(pagesRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    complexity: p.complexity,
    wireNeeded: p.wire_needed,
    copyNeeded: p.copy_needed,
    designNeeded: p.design_needed,
    codingNeeded: p.coding_needed,
    cmsTier: p.cms_tier,
    mobileMenuNeeded: p.mobile_menu_needed,
  }));
  const lineItems = (lineItemsRaw ?? []).map((l) => ({ id: l.id, label: l.label, amount: l.amount }));

  const sharedInput = {
    pages,
    rates: master?.rates ?? {},
    topRates: master?.top_rates ?? {},
    cmsRates: master?.cms_rates ?? {},
    mobileMenuRate: master?.mobile_menu_rate ?? 0,
    directionMonthlyRate: master?.direction_monthly_rate ?? 0,
    scheduleStartDate: scheduleData.projectStartDate,
    scheduleEndDate: scheduleData.schedule?.projectEndDate ?? null,
    lineItems,
    taxRate: master?.tax_rate ?? 0.1,
    remarks: project?.estimate_remarks ?? null,
  };

  const estimate = computeEstimate(sharedInput);
  const aggregated = computeAggregatedEstimate(sharedInput);

  return {
    clientName: project?.client_name ?? null,
    projectName: project?.project_name ?? "",
    estimate,
    aggregated,
  };
}
