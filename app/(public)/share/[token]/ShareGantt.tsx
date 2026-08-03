import { SCHEDULE_PHASES, WEEKDAYS, schedulePhaseLabel } from "@/lib/master/constants";
import { PHASE_COLOR_CLASS } from "@/lib/schedule/phaseColors";
import { buildDateGrid } from "@/lib/schedule/dateGrid";
import { compareDates, shiftCalendarDays, type Holiday } from "@/lib/schedule/businessDay";
import type { PageSchedule } from "@/lib/schedule/types";

type GanttPage = { id: string; name: string };

const DAY_WIDTH = 28;
const LEFT_WIDTH = 208;
const DARK_FILTER = "brightness(0.7)";

function toDayIndex(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000);
}

// [start, end]の範囲を、非稼働日（週末・休日）で分断された「連続稼働日の区間」に分割する。
// 土日・休日にカラーバーが被って作業しているように見えないようにするための処理。
function getBusinessDayRuns(
  start: string,
  end: string,
  isOffByDate: Map<string, boolean>,
): { start: string; end: string }[] {
  const runs: { start: string; end: string }[] = [];
  let runStart: string | null = null;
  let cursor = start;

  while (compareDates(cursor, end) <= 0) {
    const off = isOffByDate.get(cursor) ?? false;
    if (!off && runStart === null) runStart = cursor;
    if (off && runStart !== null) {
      runs.push({ start: runStart, end: shiftCalendarDays(cursor, -1) });
      runStart = null;
    }
    cursor = shiftCalendarDays(cursor, 1);
  }
  if (runStart !== null) {
    runs.push({ start: runStart, end: shiftCalendarDays(cursor, -1) });
  }
  return runs;
}

// 区間を、非稼働日を除いた連続稼働日の区間ごとに描画する（参照専用のためbuttonではなくdiv）。
// 最終日（end）だけは常に濃い色のセルを重ねて強調する。
function BarSegments({
  start,
  end,
  leftPx,
  colorClass,
  title,
  isOffByDate,
}: {
  start: string;
  end: string;
  leftPx: (date: string) => number;
  colorClass: string;
  title: string;
  isOffByDate: Map<string, boolean>;
}) {
  const runs = getBusinessDayRuns(start, end, isOffByDate);

  return (
    <>
      {runs.map((run, i) => (
        <div
          key={i}
          title={title}
          style={{
            left: leftPx(run.start),
            width: (toDayIndex(run.end) - toDayIndex(run.start) + 1) * DAY_WIDTH,
          }}
          className={`absolute top-0 h-7 rounded ${colorClass}`}
        />
      ))}
      <div
        title={title}
        style={{ left: leftPx(end), width: DAY_WIDTH, filter: DARK_FILTER }}
        className={`absolute top-0 h-7 rounded ${colorClass}`}
      />
    </>
  );
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
  const isOffByDate = new Map(days.map((d) => [d.date, d.isOff]));
  const totalWidth = days.length * DAY_WIDTH;

  function leftPx(dateStr: string): number {
    return (dayIndexByDate.get(dateStr) ?? 0) * DAY_WIDTH;
  }

  const launchDate =
    pageSchedules
      .map((ps) => ps.phases.find((ph) => ph.phase === "公開")?.end)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  const overallWorkDays = launchDate
    ? days.filter((d) => !d.isOff && d.date >= projectStartDate && d.date <= launchDate).length
    : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-8 rounded-panel border border-border-strong bg-surface-subtle p-4">
        <div>
          <div className="text-[11px] text-subtle">公開予定日（最終ページ完了日）</div>
          <div className="text-2xl font-bold text-navy">{launchDate ?? "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-subtle">作業日数（プロジェクト開始〜公開予定日）</div>
          <div className="text-2xl font-bold text-navy">
            {overallWorkDays != null ? `${overallWorkDays}日` : "-"}
          </div>
        </div>
      </div>

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
          <div className="flex">
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

          <div className="relative">
            <div className="pointer-events-none absolute inset-0" style={{ left: LEFT_WIDTH }}>
              {days.map((d) => (
                <div
                  key={d.date}
                  className={`absolute top-0 bottom-0 border-l border-border/60 ${
                    d.isOff ? "bg-subtle/30" : ""
                  }`}
                  style={{ left: leftPx(d.date), width: DAY_WIDTH }}
                />
              ))}
            </div>

            <div className="relative flex flex-col gap-3 pt-2">
              {pageSchedules.map((ps) => {
                const page = pageById.get(ps.pageId);
                if (!page) return null;

                const waitSegments: { start: string; end: string }[] = [];
                for (let i = 0; i < ps.phases.length - 1; i += 1) {
                  const cur = ps.phases[i];
                  const next = ps.phases[i + 1];
                  const waitStart = shiftCalendarDays(cur.end, 1);
                  const waitEnd = shiftCalendarDays(next.start, -1);
                  if (compareDates(waitStart, waitEnd) <= 0) {
                    waitSegments.push({ start: waitStart, end: waitEnd });
                  }
                }

                return (
                  <div key={ps.pageId} className="flex items-start">
                    <div
                      className="sticky left-0 z-10 shrink-0 bg-white pr-3"
                      style={{ width: LEFT_WIDTH }}
                    >
                      <div className="truncate text-[13px] font-semibold">{page.name}</div>
                    </div>
                    <div className="relative h-7" style={{ width: totalWidth }}>
                      {waitSegments.map((seg, i) => (
                        <BarSegments
                          key={`wait-${i}`}
                          start={seg.start}
                          end={seg.end}
                          leftPx={leftPx}
                          colorClass="bg-phase-wait"
                          title={`チェックバック・バッファ待ち: ${seg.start} 〜 ${seg.end}`}
                          isOffByDate={isOffByDate}
                        />
                      ))}
                      {ps.phases.map((ph) => (
                        <BarSegments
                          key={ph.phase}
                          start={ph.start}
                          end={ph.end}
                          leftPx={leftPx}
                          colorClass={PHASE_COLOR_CLASS[ph.phase]}
                          title={`${schedulePhaseLabel(ph.phase)}: ${ph.start} 〜 ${ph.end}`}
                          isOffByDate={isOffByDate}
                        />
                      ))}
                      {launchDate && (
                        <div
                          title={`公開（全ページ共通）: ${launchDate}`}
                          style={{ left: leftPx(launchDate), width: DAY_WIDTH }}
                          className="absolute top-0 h-7 rounded bg-black"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[12px]">
        {SCHEDULE_PHASES.map((phase) => (
          <span key={phase} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded ${PHASE_COLOR_CLASS[phase]}`} />
            {schedulePhaseLabel(phase)}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-black" />
          公開（全ページ共通）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-phase-wait" />
          チェックバック・バッファ待ち
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-subtle" />
          週末・休日
        </span>
      </div>
    </div>
  );
}
