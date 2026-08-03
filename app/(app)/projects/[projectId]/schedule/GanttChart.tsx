"use client";

import { useState } from "react";
import { SCHEDULE_PHASES, WEEKDAYS } from "@/lib/master/constants";
import { PHASE_COLOR_CLASS } from "@/lib/schedule/phaseColors";
import { buildDateGrid } from "@/lib/schedule/dateGrid";
import type { Holiday } from "@/lib/schedule/businessDay";
import type { PageSchedule } from "@/lib/schedule/types";
import { resetPageOverrides } from "./actions";
import { Button } from "@/components/ui/Button";
import { PhaseEditForm } from "./PhaseEditForm";

type GanttPage = { id: string; name: string };

const DAY_WIDTH = 28;
const LEFT_WIDTH = 208;

function toDayIndex(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

export function GanttChart({
  projectId,
  pages,
  pageSchedules,
  projectStartDate,
  weeklyOff,
  holidays,
}: {
  projectId: string;
  pages: GanttPage[];
  pageSchedules: PageSchedule[];
  projectStartDate: string | null;
  weeklyOff: number[];
  holidays: Holiday[];
}) {
  const [editing, setEditing] = useState<{ pageId: string; phase: string } | null>(null);

  const pageById = new Map(pages.map((p) => [p.id, p]));
  const allDates = pageSchedules.flatMap((ps) => ps.phases.flatMap((ph) => [ph.start, ph.end]));

  if (allDates.length === 0 || !projectStartDate) {
    return (
      <p className="text-[13px] text-subtle">
        ページが登録されていないか、着手日が未設定のためスケジュールを表示できません。
      </p>
    );
  }

  const rangeStart = [...allDates, projectStartDate].sort()[0];
  const rangeEnd = [...allDates].sort().at(-1)!;
  const { days, months } = buildDateGrid(rangeStart, rangeEnd, weeklyOff, holidays);
  const dayIndexByDate = new Map(days.map((d, i) => [d.date, i]));
  const totalWidth = days.length * DAY_WIDTH;

  function leftPx(dateStr: string): number {
    return (dayIndexByDate.get(dateStr) ?? 0) * DAY_WIDTH;
  }
  function widthPx(start: string, end: string): number {
    return (toDayIndex(end) - toDayIndex(start) + 1) * DAY_WIDTH;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <div style={{ width: LEFT_WIDTH + totalWidth }}>
          {/* 月ヘッダー */}
          <div className="flex">
            <div
              className="sticky left-0 z-10 shrink-0 bg-white"
              style={{ width: LEFT_WIDTH }}
            />
            {months.map((m, i) => (
              <div
                key={i}
                className="shrink-0 border-b border-l border-border bg-surface-subtle py-1 text-center text-[11px] text-muted"
                style={{ width: m.colSpan * DAY_WIDTH }}
              >
                {m.label}
              </div>
            ))}
          </div>
          {/* 日付ヘッダー */}
          <div className="flex">
            <div
              className="sticky left-0 z-10 shrink-0 bg-white"
              style={{ width: LEFT_WIDTH }}
            />
            {days.map((d) => (
              <div
                key={d.date}
                className={`shrink-0 border-b border-l border-border py-0.5 text-center text-[10px] ${
                  d.isOff ? "bg-subtle text-white" : "text-muted"
                }`}
                style={{ width: DAY_WIDTH }}
              >
                {d.dayOfMonth}
              </div>
            ))}
          </div>
          {/* 曜日ヘッダー */}
          <div className="mb-2 flex">
            <div
              className="sticky left-0 z-10 shrink-0 bg-white"
              style={{ width: LEFT_WIDTH }}
            />
            {days.map((d) => (
              <div
                key={d.date}
                className={`shrink-0 border-b-2 border-l border-navy py-0.5 text-center text-[10px] ${
                  d.isOff ? "bg-subtle text-white" : "text-muted"
                }`}
                style={{ width: DAY_WIDTH }}
              >
                {WEEKDAYS[d.weekday]}
              </div>
            ))}
          </div>

          {/* ページ行 */}
          <div className="flex flex-col gap-3">
            {pageSchedules.map((ps) => {
              const page = pageById.get(ps.pageId);
              if (!page) return null;

              const publishPhase = ps.phases.find((ph) => ph.phase === "公開");
              const workDays =
                publishPhase &&
                days.filter(
                  (d) => !d.isOff && d.date >= projectStartDate && d.date <= publishPhase.end,
                ).length;

              return (
                <div key={ps.pageId}>
                  <div className="flex items-start">
                    <div
                      className="sticky left-0 z-10 shrink-0 bg-white pr-3"
                      style={{ width: LEFT_WIDTH }}
                    >
                      <div className="truncate text-[13px] font-semibold">{page.name}</div>
                      <div className="mt-1 flex gap-4">
                        <div>
                          <div className="text-[10px] text-subtle">公開予定日</div>
                          <div className="text-[15px] font-bold text-navy">
                            {publishPhase?.end ?? "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-subtle">作業日数</div>
                          <div className="text-[15px] font-bold text-navy">
                            {workDays != null ? `${workDays}日` : "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-7" style={{ width: totalWidth }}>
                      {days.map((d) => (
                        <div
                          key={d.date}
                          className={`absolute top-0 h-7 ${d.isOff ? "bg-subtle/30" : ""}`}
                          style={{ left: leftPx(d.date), width: DAY_WIDTH }}
                        />
                      ))}
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
                            left: leftPx(ph.start),
                            width: widthPx(ph.start, ph.end),
                          }}
                          className={`absolute top-0 h-7 rounded ${PHASE_COLOR_CLASS[ph.phase]} ${
                            ph.isOverridden ? "ring-2 ring-accent ring-offset-1" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <form action={resetPageOverrides} className="ml-0 mt-1" style={{ paddingLeft: LEFT_WIDTH }}>
                    <input type="hidden" name="projectId" value={projectId} readOnly />
                    <input type="hidden" name="pageId" value={ps.pageId} readOnly />
                    <Button type="submit" className="text-[12px]">
                      全リセット
                    </Button>
                  </form>

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
        </div>
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
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-subtle" />
          週末・休日
        </span>
      </div>
    </div>
  );
}
