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

export type OverrideInput = {
  pageId: string;
  phaseKey: SchedulePhase;
  overrideStart: DateString;
  overrideEnd: DateString;
};

export type PhaseSchedule = {
  phase: SchedulePhase;
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
