"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProjectSchedule } from "@/lib/schedule/loadProjectSchedule";
import { buildGroupBuckets } from "@/lib/schedule/groupSequencer";
import { diffCalendarDays, shiftCalendarDays } from "@/lib/schedule/businessDay";
import { SCHEDULE_PHASES, type SchedulePhase } from "@/lib/master/constants";

function isRealSchedulePhase(value: string): value is SchedulePhase {
  return (SCHEDULE_PHASES as readonly string[]).includes(value);
}

async function currentUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function overridePhase(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  // phaseKeyは実工程キー("構成"等)に加え、2校期間のチェックバック1/2の仮想セグメントキー
  // （例:"構成チェックバック1"）も取りうる（Phase 12追加要望）。
  const phaseKey = String(formData.get("phaseKey") ?? "");
  const overrideStart = String(formData.get("overrideStart") ?? "");
  const overrideEnd = String(formData.get("overrideEnd") ?? "");
  const cascadeFollowing = formData.get("cascadeFollowing") === "on";
  const applyToGroup = formData.get("applyToGroup") === "on";
  const groupCascadeChoice = String(formData.get("groupCascadeChoice") ?? "recalculate");

  if (!projectId || !pageId || !phaseKey || !overrideStart || !overrideEnd) {
    throw new Error("入力が不足しています");
  }

  const supabase = await createClient();
  const user = await currentUser(supabase);

  const before = await loadProjectSchedule(projectId);
  if (!before.schedule) {
    throw new Error("プロジェクトの着手日が未設定のため、スケジュールを編集できません");
  }

  const beforePageSchedule = before.schedule.pages.find((p) => p.pageId === pageId);
  const beforePhase = beforePageSchedule?.phases.find((ph) => ph.phase === phaseKey);

  // グループ起点への連鎖（spec §4.3）：構成工程の変更で「次グループ以降は据え置く」を選んだ場合、
  // 次グループ以降の非オーバーライド区間を、変更前の計算値で凍結（override化）する。
  if (phaseKey === "構成" && groupCascadeChoice === "freeze") {
    const buckets = buildGroupBuckets(before.groups, before.pages);
    const currentBucketIndex = buckets.findIndex((b) => b.pageIds.includes(pageId));

    if (currentBucketIndex >= 0) {
      const laterPageIds = new Set(
        buckets.slice(currentBucketIndex + 1).flatMap((b) => b.pageIds),
      );
      const alreadyOverridden = new Set(
        before.overrides.map((o) => `${o.pageId}:${o.phaseKey}`),
      );

      const freezeRows = before.schedule.pages
        .filter((ps) => laterPageIds.has(ps.pageId))
        .flatMap((ps) =>
          ps.phases
            .filter((ph) => !alreadyOverridden.has(`${ps.pageId}:${ph.phase}`))
            .map((ph) => ({
              page_id: ps.pageId,
              phase_key: ph.phase,
              override_start: ph.start,
              override_end: ph.end,
              cascade_following: false,
              edited_by: user?.id ?? null,
              edited_by_email: user?.email ?? null,
            })),
        );

      if (freezeRows.length > 0) {
        const { error } = await supabase.from("schedule_overrides").insert(freezeRows);
        if (error) throw new Error(error.message);
      }
    }
  }

  const { data: existing } = await supabase
    .from("schedule_overrides")
    .select("id")
    .eq("page_id", pageId)
    .eq("phase_key", phaseKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("schedule_overrides")
      .update({
        override_start: overrideStart,
        override_end: overrideEnd,
        cascade_following: cascadeFollowing,
        edited_by: user?.id ?? null,
        edited_by_email: user?.email ?? null,
        edited_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("schedule_overrides").insert({
      page_id: pageId,
      phase_key: phaseKey,
      override_start: overrideStart,
      override_end: overrideEnd,
      cascade_following: cascadeFollowing,
      edited_by: user?.id ?? null,
      edited_by_email: user?.email ?? null,
    });
    if (error) throw new Error(error.message);
  }

  // 後続工程への追従（spec §4.6）：この工程の終了日が変わった分だけ、
  // 同一ページの「既にオーバーライドされている」後続工程を平行移動する。
  // オーバーライドされていない後続工程は、fresh計算のため自動的に追従する（何もしなくてよい）。
  // ※2校期間のチェックバック1/2等の仮想セグメントキーはSCHEDULE_PHASESに含まれないため対象外
  // （後続への追従は実工程の編集時のみ有効。仮想セグメントの後続は常にfresh計算で追従する）。
  if (cascadeFollowing && beforePhase && isRealSchedulePhase(phaseKey)) {
    const deltaDays = diffCalendarDays(overrideEnd, beforePhase.end);
    if (deltaDays !== 0) {
      const phaseIndex = SCHEDULE_PHASES.indexOf(phaseKey);
      const laterPhases = SCHEDULE_PHASES.slice(phaseIndex + 1);

      for (const laterPhase of laterPhases) {
        const laterOverride = before.overrides.find(
          (o) => o.pageId === pageId && o.phaseKey === laterPhase,
        );
        if (!laterOverride) continue;

        const { error } = await supabase
          .from("schedule_overrides")
          .update({
            override_start: shiftCalendarDays(laterOverride.overrideStart, deltaDays),
            override_end: shiftCalendarDays(laterOverride.overrideEnd, deltaDays),
            edited_by: user?.id ?? null,
            edited_by_email: user?.email ?? null,
            edited_at: new Date().toISOString(),
          })
          .eq("page_id", pageId)
          .eq("phase_key", laterPhase);
        if (error) throw new Error(error.message);
      }
    }
  }

  // 同じグループの他ページにも同様の修正を反映する（2026-08-03新規要望）。
  // このページのこのセグメントの変更前後の日数差分（デルタ）を、同じ進行グループに属する
  // 他の全ページの「同じセグメント」（同一phaseKey）に、その日付ぶんだけ平行移動して適用する。
  if (applyToGroup && beforePhase) {
    const deltaDays = diffCalendarDays(overrideEnd, beforePhase.end);
    if (deltaDays !== 0) {
      const buckets = buildGroupBuckets(before.groups, before.pages);
      const targetBucket = buckets.find((b) => b.pageIds.includes(pageId));
      const otherPageIds = (targetBucket?.pageIds ?? []).filter((id) => id !== pageId);

      for (const otherPageId of otherPageIds) {
        const otherPageSchedule = before.schedule.pages.find((p) => p.pageId === otherPageId);
        const otherPhase = otherPageSchedule?.phases.find((ph) => ph.phase === phaseKey);
        // このセグメントが存在しないページはスキップ（例：CMS構築セグメントを持たないページ等）
        if (!otherPhase) continue;

        const newStart = shiftCalendarDays(otherPhase.start, deltaDays);
        const newEnd = shiftCalendarDays(otherPhase.end, deltaDays);

        const { data: existingOther } = await supabase
          .from("schedule_overrides")
          .select("id")
          .eq("page_id", otherPageId)
          .eq("phase_key", phaseKey)
          .maybeSingle();

        if (existingOther) {
          const { error } = await supabase
            .from("schedule_overrides")
            .update({
              override_start: newStart,
              override_end: newEnd,
              edited_by: user?.id ?? null,
              edited_by_email: user?.email ?? null,
              edited_at: new Date().toISOString(),
            })
            .eq("id", existingOther.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from("schedule_overrides").insert({
            page_id: otherPageId,
            phase_key: phaseKey,
            override_start: newStart,
            override_end: newEnd,
            cascade_following: false,
            edited_by: user?.id ?? null,
            edited_by_email: user?.email ?? null,
          });
          if (error) throw new Error(error.message);
        }
      }
    }
  }

  redirect(`/projects/${projectId}/schedule?saved=1`);
}

export async function resetPhaseOverride(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const phaseKey = String(formData.get("phaseKey") ?? "");
  if (!projectId || !pageId || !phaseKey) throw new Error("入力が不足しています");

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_overrides")
    .delete()
    .eq("page_id", pageId)
    .eq("phase_key", phaseKey);
  if (error) throw new Error(error.message);

  redirect(`/projects/${projectId}/schedule?saved=1`);
}

export async function resetPageOverrides(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  if (!projectId || !pageId) throw new Error("入力が不足しています");

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_overrides").delete().eq("page_id", pageId);
  if (error) throw new Error(error.message);

  redirect(`/projects/${projectId}/schedule?saved=1`);
}
