import type { SchedulePhase } from "@/lib/master/constants";

export const PHASE_COLOR_CLASS: Record<SchedulePhase, string> = {
  構成: "bg-phase-composition",
  デザイン: "bg-phase-design",
  コーディング: "bg-phase-coding",
  CMS構築: "bg-phase-cms",
  テストアップ: "bg-phase-testup",
  公開: "bg-phase-publish",
};
