import { compareDates, shiftBusinessDays, type DateString, type Holiday } from "./businessDay";
import type { SchedulePhase } from "@/lib/master/constants";

export type LaneState = Record<string, DateString[]>;

export function createLaneState(
  parallelByPhase: Record<string, number>,
  schedulePhases: readonly SchedulePhase[],
  projectStartDate: DateString,
): LaneState {
  const state: LaneState = {};
  for (const phase of schedulePhases) {
    const count = Math.max(1, Math.floor(parallelByPhase[phase] ?? 1));
    state[phase] = Array.from({ length: count }, () => projectStartDate);
  }
  return state;
}

// 指定フェーズの並行作業レーンのうち、readyTime以降で最も早く着手できるレーンを選び、
// そのレーンの空き時刻を更新した上で実際の開始日・終了日を返す（spec §4.5）。
export function reserveLane(
  laneState: LaneState,
  phase: SchedulePhase,
  readyTime: DateString,
  durationDays: number,
  weeklyOff: number[],
  holidays: Holiday[],
): { start: DateString; end: DateString } {
  const lanes = laneState[phase];

  let bestLaneIndex = 0;
  let bestStart: DateString = compareDates(lanes[0], readyTime) > 0 ? lanes[0] : readyTime;

  for (let i = 1; i < lanes.length; i += 1) {
    const candidateStart = compareDates(lanes[i], readyTime) > 0 ? lanes[i] : readyTime;
    if (compareDates(candidateStart, bestStart) < 0) {
      bestStart = candidateStart;
      bestLaneIndex = i;
    }
  }

  const start = shiftBusinessDays(bestStart, 0, weeklyOff, holidays);
  const end = shiftBusinessDays(start, durationDays - 1, weeklyOff, holidays);
  lanes[bestLaneIndex] = end;

  return { start, end };
}
