"use client";

import { useState } from "react";
import { SCHEDULE_PHASES, WEEKDAYS, schedulePhaseLabel } from "@/lib/master/constants";
import { PHASE_COLOR_CLASS } from "@/lib/schedule/phaseColors";
import { buildDateGrid } from "@/lib/schedule/dateGrid";
import { compareDates, shiftCalendarDays, type Holiday } from "@/lib/schedule/businessDay";
import type { PageSchedule } from "@/lib/schedule/types";
import { resetPageOverrides } from "./actions";
import { Button } from "@/components/ui/Button";
import { PhaseEditForm } from "./PhaseEditForm";

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

// 工程バー・待機バーを、非稼働日を除いた連続稼働日の区間ごとに描画する。
// 最終日（end）だけは常に濃い色のセルを重ねて強調する（endは工程エンジンにより必ず稼働日になる）。
function BarSegments({
  start,
  end,
  leftPx,
  colorClass,
  ringClass,
  title,
  onClick,
  isOffByDate,
}: {
  start: string;
  end: string;
  leftPx: (date: string) => number;
  colorClass: string;
  ringClass?: string;
  title: string;
  onClick?: () => void;
  isOffByDate: Map<string, boolean>;
}) {
  const runs = getBusinessDayRuns(start, end, isOffByDate);

  return (
    <>
      {runs.map((run, i) => (
        <button
          key={i}
          type="button"
          onClick={onClick}
          title={title}
          style={{
            left: leftPx(run.start),
            width: (toDayIndex(run.end) - toDayIndex(run.start) + 1) * DAY_WIDTH,
          }}
          className={`absolute top-0 h-7 rounded ${colorClass} ${ringClass ?? ""}`}
        />
      ))}
      <button
        type="button"
        onClick={onClick}
        title={title}
        style={{ left: leftPx(end), width: DAY_WIDTH, filter: DARK_FILTER }}
        className={`absolute top-0 h-7 rounded ${colorClass} ${ringClass ?? ""}`}
      />
    </>
  );
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
  const isOffByDate = new Map(days.map((d) => [d.date, d.isOff]));
  const totalWidth = days.length * DAY_WIDTH;

  function leftPx(dateStr: string): number {
    return (dayIndexByDate.get(dateStr) ?? 0) * DAY_WIDTH;
  }

  // サイト全体の公開予定日＝全ページの最終工程（公開＝作業完了）の完了日のうち最大値。
  // サイトは全ページが揃って初めて公開されるため、この1日だけを全ページ共通の「公開日」として扱う。
  const launchDate =
    pageSchedules
      .map((ps) => ps.phases.find((ph) => ph.phase === "公開")?.end)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  const overallWorkDays = launchDate
    ? days.filter((d) => !d.isOff && d.date >= projectStartDate && d.date <= launchDate).length
    : null;

  const editingPage = editing ? pageById.get(editing.pageId) : null;
  const editingPhaseSchedule = editing
    ? pageSchedules
        .find((ps) => ps.pageId === editing.pageId)
        ?.phases.find((ph) => ph.phase === editing.phase)
    : undefined;

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
          {/* 月ヘッダー */}
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
          {/* 日付ヘッダー */}
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
          {/* 曜日ヘッダー */}
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

          {/* ページ行（縦罫線は全行を貫通する1枚のオーバーレイとして描画する） */}
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

                // 工程間の待機期間（チェックバック・バッファ）をカレンダー日ベースで算出する
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
                      <form action={resetPageOverrides} className="mt-1">
                        <input type="hidden" name="projectId" value={projectId} readOnly />
                        <input type="hidden" name="pageId" value={ps.pageId} readOnly />
                        <Button type="submit" className="text-[11px]">
                          全リセット
                        </Button>
                      </form>
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
                          ringClass={ph.isOverridden ? "ring-2 ring-accent ring-offset-1" : ""}
                          title={`${schedulePhaseLabel(ph.phase)}: ${ph.start} 〜 ${ph.end}${ph.isOverridden ? "（手動オーバーライド）" : ""}`}
                          onClick={() =>
                            setEditing((prev) =>
                              prev?.pageId === ps.pageId && prev.phase === ph.phase
                                ? null
                                : { pageId: ps.pageId, phase: ph.phase },
                            )
                          }
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

      {editing && editingPage && editingPhaseSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-panel bg-white p-4 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <PhaseEditForm
              projectId={projectId}
              pageId={editing.pageId}
              pageName={editingPage.name}
              phaseSchedule={editingPhaseSchedule}
              onClose={() => setEditing(null)}
            />
          </div>
        </div>
      )}

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
