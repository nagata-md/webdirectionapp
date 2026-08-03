import { compareDates, isBusinessDay, shiftCalendarDays, type DateString, type Holiday } from "./businessDay";

export type DayCell = {
  date: DateString;
  dayOfMonth: number;
  weekday: number; // 0=日曜 ... 6=土曜（JSのDate#getDay()と同じ並び）
  isOff: boolean; // 週末または休日カレンダー登録日（カレンダー型ガントで濃いグレー表示する対象）
};

export type MonthGroup = {
  label: string; // 例: "2026年2月"
  colSpan: number;
};

// ガントチャートのカレンダー型グリッド（Phase 12、新規要件）：日付を1日ずつ列にし、
// 週末・休日を判定する。startDate〜endDateの範囲で全日付を生成する。
export function buildDateGrid(
  startDate: DateString,
  endDate: DateString,
  weeklyOff: number[],
  holidays: Holiday[],
): { days: DayCell[]; months: MonthGroup[] } {
  const days: DayCell[] = [];
  let current = startDate;

  while (compareDates(current, endDate) <= 0) {
    const day = Number(current.split("-")[2]);
    const weekday = new Date(`${current}T00:00:00Z`).getUTCDay();
    days.push({
      date: current,
      dayOfMonth: day,
      weekday,
      isOff: !isBusinessDay(current, weeklyOff, holidays),
    });
    current = shiftCalendarDays(current, 1);
  }

  const months: MonthGroup[] = [];
  for (const d of days) {
    const [y, m] = d.date.split("-");
    const label = `${y}年${Number(m)}月`;
    const last = months[months.length - 1];
    if (last && last.label === label) {
      last.colSpan += 1;
    } else {
      months.push({ label, colSpan: 1 });
    }
  }

  return { days, months };
}
