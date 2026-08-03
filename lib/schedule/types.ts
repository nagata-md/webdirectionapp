import type { DateString, Holiday } from "./businessDay";
import type { SchedulePhase } from "@/lib/master/constants";

export type MasterForSchedule = {
  rates: Record<string, Record<string, { days: number; cost: number }>>;
  topRates: Record<string, Record<string, { days: number; cost: number }>>;
  cmsRates: Record<string, { days: number; cost: number }>;
  standards: Record<
    string,
    { checkback: number; buffer: number; secondDraftDays?: number; secondCheckbackDays?: number }
  >;
  weeklyOff: number[];
  holidays: Holiday[];
};

export type SchedulePageInput = {
  id: string;
  type: string;
  complexity: string;
  wireNeeded: boolean;
  copyNeeded: boolean;
  cmsTier: string | null;
  groupId: string | null;
  priority: number;
};

export type ProgressGroupInput = {
  id: string;
  sortOrder: number;
};

// phaseKeyは"構成"等の実工程キーに加え、2校期間のチェックバック1/2の仮想セグメントキー
// （例:"構成チェックバック1"）も取りうるため、SchedulePhaseより広いstring型にする（Phase 12追加要望）。
export type OverrideInput = {
  pageId: string;
  phaseKey: string;
  overrideStart: DateString;
  overrideEnd: DateString;
};

// セグメント種別。production=初稿制作、checkback1/2=チェックバック（手動編集可）、
// revision=2校作業（自動計算のみ、手動編集は現時点で未対応）。
export type PhaseSegmentKind = "production" | "checkback1" | "revision" | "checkback2";

export type PhaseSchedule = {
  phase: string;
  kind: PhaseSegmentKind;
  basePhase: SchedulePhase;
  start: DateString;
  end: DateString;
  isOverridden: boolean;
};

export type PageSchedule = {
  pageId: string;
  phases: PhaseSchedule[];
};

export type ComputeScheduleInput = {
  projectStartDate: DateString;
  pages: SchedulePageInput[];
  groups: ProgressGroupInput[];
  parallelByPhase: Record<string, number>;
  master: MasterForSchedule;
  overrides: OverrideInput[];
};

export type ComputeScheduleResult = {
  pages: PageSchedule[];
  groupStartDates: Record<string, DateString>;
  projectEndDate: DateString | null;
};
