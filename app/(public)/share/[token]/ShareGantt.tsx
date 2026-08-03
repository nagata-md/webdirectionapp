import { SCHEDULE_PHASES } from "@/lib/master/constants";
import { PHASE_COLOR_CLASS } from "@/lib/schedule/phaseColors";
import type { PageSchedule } from "@/lib/schedule/types";

type GanttPage = { id: string; name: string };

function toDayIndex(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

// 外部共有向けの参照専用ガントチャート（spec §4.10）。編集操作・変更履歴は含めない。
export function ShareGantt({
  pages,
  pageSchedules,
}: {
  pages: GanttPage[];
  pageSchedules: PageSchedule[];
}) {
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const allDayIndexes = pageSchedules.flatMap((ps) =>
    ps.phases.flatMap((ph) => [toDayIndex(ph.start), toDayIndex(ph.end)]),
  );

  if (allDayIndexes.length === 0) {
    return <p className="text-[13px] text-subtle">表示できるスケジュールがありません。</p>;
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
      <div className="flex flex-col gap-3">
        {pageSchedules.map((ps) => {
          const page = pageById.get(ps.pageId);
          if (!page) return null;

          return (
            <div key={ps.pageId} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-[13px] font-semibold">{page.name}</div>
              <div className="relative h-7 flex-1 rounded bg-surface">
                {ps.phases.map((ph) => (
                  <div
                    key={ph.phase}
                    title={`${ph.phase}: ${ph.start} 〜 ${ph.end}`}
                    style={{
                      left: `${leftPercent(ph.start)}%`,
                      width: `${widthPercent(ph.start, ph.end)}%`,
                    }}
                    className={`absolute top-0 h-7 rounded ${PHASE_COLOR_CLASS[ph.phase]}`}
                  />
                ))}
              </div>
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
      </div>
    </div>
  );
}
