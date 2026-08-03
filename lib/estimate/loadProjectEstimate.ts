import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadProjectSchedule } from "@/lib/schedule/loadProjectSchedule";
import { computeEstimate, type EstimateResult } from "./calculate";

export type ProjectEstimateData = {
  clientName: string | null;
  projectName: string;
  estimate: EstimateResult;
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
      supabase.from("projects").select("client_name, project_name").eq("id", projectId).single(),
      supabase
        .from("pages")
        .select("id, name, complexity, wire_needed, copy_needed, extra_cost")
        .eq("project_id", projectId),
      supabase
        .from("estimate_line_items")
        .select("id, label, amount")
        .eq("project_id", projectId)
        .order("sort_order"),
      supabase.from("master").select("rates, direction_monthly_rate, tax_rate").single(),
      loadProjectSchedule(projectId, supabase),
    ]);

  const pages = (pagesRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    complexity: p.complexity,
    wireNeeded: p.wire_needed,
    copyNeeded: p.copy_needed,
    extraCost: p.extra_cost,
  }));
  const lineItems = (lineItemsRaw ?? []).map((l) => ({ id: l.id, label: l.label, amount: l.amount }));

  const estimate = computeEstimate({
    pages,
    rates: master?.rates ?? {},
    directionMonthlyRate: master?.direction_monthly_rate ?? 0,
    scheduleStartDate: scheduleData.projectStartDate,
    scheduleEndDate: scheduleData.schedule?.projectEndDate ?? null,
    lineItems,
    taxRate: master?.tax_rate ?? 0.1,
  });

  return {
    clientName: project?.client_name ?? null,
    projectName: project?.project_name ?? "",
    estimate,
  };
}
