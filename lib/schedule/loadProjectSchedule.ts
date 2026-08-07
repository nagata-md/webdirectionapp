import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sortPagesAsTree } from "@/lib/pages/constants";
import { computeSchedule } from "./computeSchedule";
import type {
  ComputeScheduleResult,
  MasterForSchedule,
  OverrideInput,
  ProgressGroupInput,
  SchedulePageInput,
} from "./types";

export type ProjectScheduleData = {
  projectStartDate: string | null;
  pages: SchedulePageInput[];
  groups: ProgressGroupInput[];
  parallelByPhase: Record<string, number>;
  master: MasterForSchedule;
  overrides: OverrideInput[];
  schedule: ComputeScheduleResult | null;
};

// プロジェクトのスケジュール計算に必要な入力を取得し、computeSchedule()を実行する。
// 計算結果はDBに保存しない（都度計算、spec §6の設計方針）。
// supabaseClientを渡すと通常のRLSクライアントの代わりに使う（共有閲覧share_viewでの
// Service Roleクライアント利用のため、spec §4.10）。
export async function loadProjectSchedule(
  projectId: string,
  supabaseClient?: SupabaseClient,
): Promise<ProjectScheduleData> {
  const supabase = supabaseClient ?? (await createClient());

  const [{ data: project }, { data: pagesRaw }, { data: groupsRaw }, { data: masterRaw }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("start_date, parallel_by_phase")
        .eq("id", projectId)
        .single(),
      supabase
        .from("pages")
        .select(
          "id, name, parent_id, type, complexity, wire_needed, copy_needed, design_needed, coding_needed, cms_tier, group_id, priority",
        )
        .eq("project_id", projectId),
      supabase
        .from("progress_groups")
        .select("id, sort_order")
        .eq("project_id", projectId)
        .order("sort_order"),
      supabase
        .from("master")
        .select("rates, top_rates, cms_rates, standards, weekly_off, holidays, default_parallel_by_phase")
        .single(),
    ]);

  // ガントチャートの行順をディレクトリマップの表示順と一致させる（2026-08-07新規要件）。
  // computeSchedule()は入力pagesの順序をそのまま結果に反映するため、ここで並べ替えておけば
  // `schedule.pages`・GanttChartの行順に自動的に伝播する（進行グループはスケジュールの
  // 起点を揃えるための分類であり表示順には使わない、2026-08-07ユーザー確定方針）。
  const pages: SchedulePageInput[] = sortPagesAsTree(pagesRaw ?? []).map((p) => ({
    id: p.id,
    type: p.type,
    complexity: p.complexity,
    wireNeeded: p.wire_needed,
    copyNeeded: p.copy_needed,
    designNeeded: p.design_needed,
    codingNeeded: p.coding_needed,
    cmsTier: p.cms_tier,
    groupId: p.group_id,
    priority: p.priority,
  }));

  const groups: ProgressGroupInput[] = (groupsRaw ?? []).map((g) => ({
    id: g.id,
    sortOrder: g.sort_order,
  }));

  const pageIds = pages.map((p) => p.id);
  const { data: overridesRaw } =
    pageIds.length > 0
      ? await supabase
          .from("schedule_overrides")
          .select(
            "page_id, phase_key, override_start, override_end, cascade_following, edited_by, edited_at",
          )
          .in("page_id", pageIds)
      : { data: [] };

  const overrides: OverrideInput[] = (overridesRaw ?? []).map((o) => ({
    pageId: o.page_id,
    phaseKey: o.phase_key,
    overrideStart: o.override_start,
    overrideEnd: o.override_end,
  }));

  const master: MasterForSchedule = {
    rates: masterRaw?.rates ?? {},
    topRates: masterRaw?.top_rates ?? {},
    cmsRates: masterRaw?.cms_rates ?? {},
    standards: masterRaw?.standards ?? {},
    weeklyOff: masterRaw?.weekly_off ?? [0, 6],
    holidays: masterRaw?.holidays ?? [],
  };

  const parallelByPhase: Record<string, number> = {
    ...(masterRaw?.default_parallel_by_phase ?? {}),
    ...(project?.parallel_by_phase ?? {}),
  };

  const projectStartDate = project?.start_date ?? null;

  const schedule = projectStartDate
    ? computeSchedule({
        projectStartDate,
        pages,
        groups,
        parallelByPhase,
        master,
        overrides,
      })
    : null;

  return {
    projectStartDate,
    pages,
    groups,
    parallelByPhase,
    master,
    overrides,
    schedule,
  };
}
