import { SCHEDULE_PHASES, type SchedulePhase } from "@/lib/master/constants";
import { maxDate, shiftBusinessDays, type DateString } from "./businessDay";
import { buildGroupBuckets } from "./groupSequencer";
import { createLaneState, reserveLane } from "./laneAllocator";
import type {
  ComputeScheduleInput,
  ComputeScheduleResult,
  OverrideInput,
  PageSchedule,
  PhaseSchedule,
  SchedulePageInput,
} from "./types";

// 構成は「ワイヤー＋コピー」を先に合算してから切り上げ、他の工程は単体で切り上げる
// （確定方針：工程ごとに合計して切り上げ）。
function phaseDurationDays(
  page: SchedulePageInput,
  phase: SchedulePhase,
  rates: ComputeScheduleInput["master"]["rates"],
): number {
  const complexityRates = rates[page.complexity] ?? {};
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
  phase: SchedulePhase,
): OverrideInput | undefined {
  return overrides.find((o) => o.pageId === pageId && o.phaseKey === phase);
}

export function computeSchedule(input: ComputeScheduleInput): ComputeScheduleResult {
  const { projectStartDate, pages, groups, parallelByPhase, master, overrides } = input;
  const { weeklyOff, holidays, standards, rates } = master;

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
        const override = findOverride(overrides, page.id, phase);
        let start: DateString;
        let end: DateString;

        if (override) {
          start = override.overrideStart;
          end = override.overrideEnd;
        } else {
          const duration = phaseDurationDays(page, phase, rates);
          const reserved = reserveLane(laneState, phase, readyTime, duration, weeklyOff, holidays);
          start = reserved.start;
          end = reserved.end;
        }

        phases.push({ phase, start, end, isOverridden: Boolean(override) });

        if (phase === "構成") {
          compositionEnds.push(end);
        }

        const standard = standards[phase] ?? { checkback: 0, buffer: 0 };
        const wait = (standard.checkback ?? 0) + (standard.buffer ?? 0);
        readyTime = shiftBusinessDays(end, wait + 1, weeklyOff, holidays);
      }

      pageSchedules.set(page.id, { pageId: page.id, phases });
    }

    nextGroupStart = maxDate(compositionEnds) ?? nextGroupStart;
  }

  const allPublishEnds = pages
    .map((p) => pageSchedules.get(p.id)?.phases.find((ph) => ph.phase === "公開")?.end)
    .filter((d): d is DateString => Boolean(d));

  return {
    pages: pages
      .map((p) => pageSchedules.get(p.id))
      .filter((s): s is PageSchedule => Boolean(s)),
    groupStartDates,
    projectEndDate: maxDate(allPublishEnds),
  };
}
