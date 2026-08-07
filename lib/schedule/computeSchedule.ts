import { SCHEDULE_PHASES, SECOND_DRAFT_PHASES, type SchedulePhase } from "@/lib/master/constants";
import { maxDate, shiftBusinessDays, type DateString } from "./businessDay";
import { buildGroupBuckets } from "./groupSequencer";
import { createLaneState, reserveLane } from "./laneAllocator";
import type {
  ComputeScheduleInput,
  OverrideInput,
  PageSchedule,
  PhaseSchedule,
  PhaseSegmentKind,
  SchedulePageInput,
  ComputeScheduleResult,
} from "./types";

// 構成は「ワイヤー＋コピー」を先に合算してから切り上げ、他の工程は単体で切り上げる
// （確定方針：工程ごとに合計して切り上げ）。
// TOPページは通常のratesではなくtopRates（別建てマスタ）を参照する（Phase 12）。
// CMS構築はcmsTierが設定されているページのみ対象で、複雑度ごとのcmsRatesから日数を取る。
function phaseDurationDays(
  page: SchedulePageInput,
  phase: SchedulePhase,
  master: Pick<ComputeScheduleInput["master"], "rates" | "topRates" | "cmsRates">,
): number {
  if (phase === "CMS構築") {
    const cms = page.cmsTier ? master.cmsRates[page.cmsTier] : undefined;
    return Math.max(1, Math.ceil(cms?.days ?? 0));
  }

  const complexityRates = (page.type === "top" ? master.topRates : master.rates)[page.complexity] ?? {};
  if (phase === "構成") {
    const wire = page.wireNeeded ? (complexityRates["ワイヤー"]?.days ?? 0) : 0;
    const copy = page.copyNeeded ? (complexityRates["コピー"]?.days ?? 0) : 0;
    return Math.max(1, Math.ceil(wire + copy));
  }
  const raw = complexityRates[phase]?.days ?? 0;
  return Math.max(1, Math.ceil(raw));
}

function findOverride(
  overrides: OverrideInput[],
  pageId: string,
  phaseKey: string,
): OverrideInput | undefined {
  return overrides.find((o) => o.pageId === pageId && o.phaseKey === phaseKey);
}

// 2校期間のサブセグメント（チェックバック1・2校作業・チェックバック2）を1つ積む。
// durationDaysが0以下の場合は何も積まず、cursorをそのまま返す（該当なしとして扱う）。
// allowOverride=falseの場合（2校作業）は手動編集の対象にしない（Phase 12追加要望のスコープ）。
function pushSubSegment(
  phases: PhaseSchedule[],
  cursor: DateString,
  phaseKey: string,
  kind: PhaseSegmentKind,
  basePhase: SchedulePhase,
  durationDays: number,
  overrides: OverrideInput[],
  pageId: string,
  weeklyOff: number[],
  holidays: ComputeScheduleInput["master"]["holidays"],
  allowOverride: boolean,
): DateString {
  const override = allowOverride ? findOverride(overrides, pageId, phaseKey) : undefined;

  if (!override && durationDays <= 0) return cursor;

  let start: DateString;
  let end: DateString;
  if (override) {
    start = override.overrideStart;
    end = override.overrideEnd;
  } else {
    start = shiftBusinessDays(cursor, 1, weeklyOff, holidays);
    end = shiftBusinessDays(start, durationDays - 1, weeklyOff, holidays);
  }

  phases.push({ phase: phaseKey, kind, basePhase, start, end, isOverridden: Boolean(override) });
  return end;
}

export function computeSchedule(input: ComputeScheduleInput): ComputeScheduleResult {
  const { projectStartDate, pages, groups, parallelByPhase, master, overrides } = input;
  const { weeklyOff, holidays, standards } = master;

  const buckets = buildGroupBuckets(groups, pages);
  const pageById = new Map(pages.map((p) => [p.id, p]));

  const laneState = createLaneState(parallelByPhase, SCHEDULE_PHASES, projectStartDate);
  const groupStartDates: Record<string, DateString> = {};
  const pageSchedules = new Map<string, PageSchedule>();

  let nextGroupStart = projectStartDate;

  for (const bucket of buckets) {
    const groupKey = bucket.groupId ?? "__default__";
    groupStartDates[groupKey] = nextGroupStart;

    const bucketPages = bucket.pageIds
      .map((id) => pageById.get(id))
      .filter((p): p is SchedulePageInput => Boolean(p))
      .sort((a, b) => a.priority - b.priority);

    const compositionEnds: DateString[] = [];

    for (const page of bucketPages) {
      const phases: PhaseSchedule[] = [];
      let readyTime = nextGroupStart;

      for (const phase of SCHEDULE_PHASES) {
        // CMS構築はcms_tierが設定されているページのみ対象（Phase 12）。
        // 対象外のページはこの工程自体をスキップする（readyTimeも進めない）。
        if (phase === "CMS構築" && !page.cmsTier) continue;
        // デザイン・コーディングは個別に「なし」に設定されたページで工程自体をスキップする
        // （2026-08-07新規要件。CMS構築と同じスキップ方式）。
        if (phase === "デザイン" && page.designNeeded === false) continue;
        if (phase === "コーディング" && page.codingNeeded === false) continue;

        const override = findOverride(overrides, page.id, phase);
        let start: DateString;
        let end: DateString;

        if (override) {
          start = override.overrideStart;
          end = override.overrideEnd;
        } else if (phase === "構成") {
          // 構成工程は並行作業人数の制限を適用せず、グループ内の全ページが常に同日着手する
          // （2026-08-03改訂：レーン待ちによる開始日のズレを構成工程では発生させない）。
          const duration = phaseDurationDays(page, phase, master);
          start = shiftBusinessDays(readyTime, 0, weeklyOff, holidays);
          end = shiftBusinessDays(start, duration - 1, weeklyOff, holidays);
        } else {
          const duration = phaseDurationDays(page, phase, master);
          const reserved = reserveLane(laneState, phase, readyTime, duration, weeklyOff, holidays);
          start = reserved.start;
          end = reserved.end;
        }

        phases.push({
          phase,
          kind: "production",
          basePhase: phase,
          start,
          end,
          isOverridden: Boolean(override),
        });

        if (phase === "構成") {
          compositionEnds.push(end);
        }

        const standard = standards[phase] ?? {
          checkback: 0,
          buffer: 0,
          secondDraftDays: 0,
          secondCheckbackDays: 0,
        };

        if (SECOND_DRAFT_PHASES.includes(phase)) {
          // 2校期間（2026-08-03新規要件）：初稿提出→チェックバック1→2校作業→チェックバック2→
          // バッファ→次工程。チェックバック1・2はガント上で個別に手動編集できる仮想セグメントとして
          // 積む（2校作業は自動計算のみ、手動編集は現時点では対象外）。
          let cursor = end;
          cursor = pushSubSegment(
            phases,
            cursor,
            `${phase}チェックバック1`,
            "checkback1",
            phase,
            standard.checkback ?? 0,
            overrides,
            page.id,
            weeklyOff,
            holidays,
            true,
          );
          cursor = pushSubSegment(
            phases,
            cursor,
            `${phase}2校作業`,
            "revision",
            phase,
            standard.secondDraftDays ?? 0,
            overrides,
            page.id,
            weeklyOff,
            holidays,
            false,
          );
          cursor = pushSubSegment(
            phases,
            cursor,
            `${phase}チェックバック2`,
            "checkback2",
            phase,
            standard.secondCheckbackDays ?? 0,
            overrides,
            page.id,
            weeklyOff,
            holidays,
            true,
          );
          readyTime = shiftBusinessDays(cursor, (standard.buffer ?? 0) + 1, weeklyOff, holidays);
        } else {
          // CMS構築・公開は従来通り、チェックバック＋バッファをまとめた待機期間のみ（個別編集は対象外）
          const wait = (standard.checkback ?? 0) + (standard.buffer ?? 0);
          readyTime = shiftBusinessDays(end, wait + 1, weeklyOff, holidays);
        }
      }

      pageSchedules.set(page.id, { pageId: page.id, phases });
    }

    // 次グループの起点は、このグループの構成完了日そのものではなく、その翌営業日とする
    // （2026-08-03改訂：提出日と同日ではなく提出翌営業日から次工程に入る）。
    const groupCompositionEnd = maxDate(compositionEnds);
    nextGroupStart = groupCompositionEnd
      ? shiftBusinessDays(groupCompositionEnd, 1, weeklyOff, holidays)
      : nextGroupStart;
  }

  const allPublishEnds = pages
    .map((p) =>
      pageSchedules
        .get(p.id)
        ?.phases.find((ph) => ph.kind === "production" && ph.basePhase === "公開")?.end,
    )
    .filter((d): d is DateString => Boolean(d));

  return {
    pages: pages
      .map((p) => pageSchedules.get(p.id))
      .filter((s): s is PageSchedule => Boolean(s)),
    groupStartDates,
    projectEndDate: maxDate(allPublishEnds),
  };
}
