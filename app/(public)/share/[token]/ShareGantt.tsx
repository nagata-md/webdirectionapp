import { SCHEDULE_PHASES, WEEKDAYS } from "@/lib/master/constants";
import { PHASE_COLOR_CLASS } from "@/lib/schedule/phaseColors";
import { buildDateGrid } from "@/lib/schedule/dateGrid";
import type { Holiday } from "@/lib/schedule/businessDay";
import type { PageSchedule } from "@/lib/schedule/types";

type GanttPage = { id: string; name: string };

const DAY_WIDTH = 28;
const LEFT_WIDTH = 208;

function toDayIndex(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

// 外部共有向けの参照専用ガントチャート（spec §4.10）。カレンダー型グリッド表示（Phase 12）。
export function ShareGantt({
  pages,
  pageSchedules,
  projectStartDate,
  weeklyOff,
  holidays,
}: {
  pages: GanttPage[];
  pageSchedules: PageSchedule[];
  projectStartDate: string | null;
  weeklyOff: number[];
  holidays: Holiday[];
}) {
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const allDates = pageSchedules.flatMap((ps) => ps.phases.flatMap((ph) => [ph.start, ph.end]));

  if (allDates.length === 0 || !projectStartDate) {
    return <p className="text-[13px] text-subtle">表示できるスケジュールがありません。</p>;
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
          <div className="flex">
            <div className="sticky left-0 z-10 shrink-0 bg-white" style={{ width: LEFT_WIDTH }} />
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
          <div className="flex">
            <div className="sticky left-0 z-10 shrink-0 bg-white" style={{ width: LEFT_WIDTH }} />
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
          <div className="mb-2 flex">
            <div className="sticky left-0 z-10 shrink-0 bg-white" style={{ width: LEFT_WIDTH }} />
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
                <div key={ps.pageId} className="flex items-start">
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
                      <div
                        key={ph.phase}
                        title={`${ph.phase}: ${ph.start} 〜 ${ph.end}`}
                        style={{ left: leftPx(ph.start), width: widthPx(ph.start, ph.end) }}
                        className={`absolute top-0 h-7 rounded ${PHASE_COLOR_CLASS[ph.phase]}`}
                      />
                    ))}
                  </div>
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
          <span className="inline-block h-3 w-3 rounded bg-subtle" />
          週末・休日
        </span>
      </div>
    </div>
  );
}
