// 営業日計算（spec §4.5・§8）。
// 日付はすべて "YYYY-MM-DD" 文字列（タイムゾーンなし）として扱い、
// 内部計算もUTC epoch daysで行うことでJST/UTCのズレを避ける（spec §8）。

export type DateString = string;
export type Holiday = { date: DateString; label?: string };

function parseDate(dateStr: DateString): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function toEpochDay(dateStr: DateString): number {
  const { y, m, d } = parseDate(dateStr);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function fromEpochDay(epochDay: number): DateString {
  const dt = new Date(epochDay * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayOfWeek(dateStr: DateString): number {
  const { y, m, d } = parseDate(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isBusinessDay(
  dateStr: DateString,
  weeklyOff: number[],
  holidays: Holiday[],
): boolean {
  if (weeklyOff.includes(dayOfWeek(dateStr))) return false;
  if (holidays.some((h) => h.date === dateStr)) return false;
  return true;
}

// dateStr自身が営業日ならそのまま、そうでなければ以降最初の営業日を返す。
export function nextBusinessDay(
  dateStr: DateString,
  weeklyOff: number[],
  holidays: Holiday[],
): DateString {
  let epoch = toEpochDay(dateStr);
  while (!isBusinessDay(fromEpochDay(epoch), weeklyOff, holidays)) {
    epoch += 1;
  }
  return fromEpochDay(epoch);
}

// dateStrを営業日に正規化した上で、そこからn営業日後（nが0ならその日自身）を返す。
// n未満の場合は使わない想定（このアプリでは負の方向のシフトは発生しない）。
export function shiftBusinessDays(
  dateStr: DateString,
  n: number,
  weeklyOff: number[],
  holidays: Holiday[],
): DateString {
  const normalized = nextBusinessDay(dateStr, weeklyOff, holidays);
  if (n <= 0) return normalized;

  let epoch = toEpochDay(normalized);
  let count = 0;
  while (count < n) {
    epoch += 1;
    if (isBusinessDay(fromEpochDay(epoch), weeklyOff, holidays)) {
      count += 1;
    }
  }
  return fromEpochDay(epoch);
}

export function compareDates(a: DateString, b: DateString): number {
  return toEpochDay(a) - toEpochDay(b);
}

// 暦日（営業日を考慮しない、単純なカレンダー日数）での差分・シフト。
// 既存の手動オーバーライドを「同じ日数分だけ」平行移動させる用途（cascade_following）で使う。
export function diffCalendarDays(a: DateString, b: DateString): number {
  return toEpochDay(a) - toEpochDay(b);
}

export function shiftCalendarDays(dateStr: DateString, days: number): DateString {
  return fromEpochDay(toEpochDay(dateStr) + days);
}

export function maxDate(dates: DateString[]): DateString | null {
  if (dates.length === 0) return null;
  return dates.reduce((max, d) => (compareDates(d, max) > 0 ? d : max));
}
