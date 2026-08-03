"use client";

import { useState } from "react";
import { SCHEDULE_PHASES } from "@/lib/master/constants";
import { PHASE_COLOR_CLASS } from "@/lib/schedule/phaseColors";
import type { PageSchedule } from "@/lib/schedule/types";
import { resetPageOverrides } from "./actions";
import { Button } from "@/components/ui/Button";
import { PhaseEditForm } from "./PhaseEditForm";

type GanttPage = { id: string; name: string };

function toDayIndex(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

export function GanttChart({
  projectId,
  pages,
  pageSchedules,
}: {
  projectId: string;
  pages: GanttPage[];
  pageSchedules: PageSchedule[];
}) {
  const [editing, setEditing] = useState<{ pageId: string; phase: string } | null>(null);

  const pageById = new Map(pages.map((p) => [p.id, p]));
  const allDayIndexes = pageSchedules.flatMap((ps) =>
    ps.phases.flatMap((ph) => [toDayIndex(ph.start), toDayIndex(ph.end)]),
  );

  if (allDayIndexes.length === 0) {
    return (
      <p className="text-[13px] text-subtle">
        ページが登録されていないか、着手日が未設定のためスケジュールを表示できません。
      </p>
    );
  }

  const rangeStartIdx = Math.min(...allDayIndexes);
  const rangeEndIdx = Math.max(...allDayIndexes);
  const totalDays = rangeEndIdx - rangeStartIdx + 1;

  function leftPercent(dateStr: string): number {
    return ((toDayIndex(dateStr) - rangeStartIdx) / totalDays) * 100;
  }
  function widthPercent(start: string, end: string): number {
    return ((toDayIndex(end) - toDayIndex(start) + 1) / totalDays) * 100;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-subtle">
        <span>{pageSchedules[0]?.phases[0]?.start ?? ""}</span>
        <span>
          {pageSchedules
            .flatMap((ps) => ps.phases.map((ph) => ph.end))
            .sort()
            .at(-1) ?? ""}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {pageSchedules.map((ps) => {
          const page = pageById.get(ps.pageId);
          if (!page) return null;

          return (
            <div key={ps.pageId}>
              <div className="flex items-center gap-3">
                <div className="w-40 shrink-0 truncate text-[13px] font-semibold">
                  {page.name}
                </div>
                <div className="relative h-7 flex-1 rounded bg-surface">
                  {ps.phases.map((ph) => (
                    <button
                      key={ph.phase}
                      type="button"
                      onClick={() =>
                        setEditing((prev) =>
                          prev?.pageId === ps.pageId && prev.phase === ph.phase
                            ? null
                            : { pageId: ps.pageId, phase: ph.phase },
                        )
                      }
                      title={`${ph.phase}: ${ph.start} 〜 ${ph.end}${ph.isOverridden ? "（手動オーバーライド）" : ""}`}
                      style={{
                        left: `${leftPercent(ph.start)}%`,
                        width: `${widthPercent(ph.start, ph.end)}%`,
                      }}
                      className={`absolute top-0 h-7 rounded ${PHASE_COLOR_CLASS[ph.phase]} ${
                        ph.isOverridden ? "ring-2 ring-accent ring-offset-1" : ""
                      }`}
                    />
                  ))}
                </div>
                <form action={resetPageOverrides}>
                  <input type="hidden" name="projectId" value={projectId} readOnly />
                  <input type="hidden" name="pageId" value={ps.pageId} readOnly />
                  <Button type="submit" className="text-[12px]">
                    全リセット
                  </Button>
                </form>
              </div>

              {editing?.pageId === ps.pageId && (
                <div className="mt-2">
                  <PhaseEditForm
                    projectId={projectId}
                    pageId={ps.pageId}
                    pageName={page.name}
                    phaseSchedule={ps.phases.find((ph) => ph.phase === editing.phase)!}
                    onClose={() => setEditing(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[12px]">
        {SCHEDULE_PHASES.map((phase) => (
          <span key={phase} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded ${PHASE_COLOR_CLASS[phase]}`} />
            {phase}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded ring-2 ring-accent" />
          手動オーバーライド
        </span>
      </div>
    </div>
  );
}
