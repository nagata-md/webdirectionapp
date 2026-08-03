import { describe, expect, it } from "vitest";
import { isBusinessDay, maxDate, shiftBusinessDays } from "../businessDay";

const WEEKEND = [0, 6]; // 日・土

describe("isBusinessDay", () => {
  it("平日はtrue", () => {
    expect(isBusinessDay("2026-01-05", WEEKEND, [])).toBe(true); // 月
  });

  it("土日はfalse", () => {
    expect(isBusinessDay("2026-01-10", WEEKEND, [])).toBe(false); // 土
    expect(isBusinessDay("2026-01-11", WEEKEND, [])).toBe(false); // 日
  });

  it("休日カレンダーに含まれる日はfalse", () => {
    expect(isBusinessDay("2026-01-01", WEEKEND, [{ date: "2026-01-01" }])).toBe(false);
  });
});

describe("shiftBusinessDays", () => {
  it("週末をまたぐ場合は正しくスキップする（金曜+1営業日=月曜）", () => {
    expect(shiftBusinessDays("2026-01-09", 1, WEEKEND, [])).toBe("2026-01-12");
  });

  it("休日カレンダーの日もスキップする", () => {
    // 2026-01-12(月)を祝日にすると、金曜+1営業日は火曜になる
    expect(
      shiftBusinessDays("2026-01-09", 1, WEEKEND, [{ date: "2026-01-12" }]),
    ).toBe("2026-01-13");
  });

  it("年末年始をまたぐ場合も正しく計算する", () => {
    // 2026-12-31(木) + 1営業日、2027-01-01(金)が祝日 → 土日もスキップして2027-01-04(月)
    expect(
      shiftBusinessDays("2026-12-31", 1, WEEKEND, [{ date: "2027-01-01" }]),
    ).toBe("2027-01-04");
  });

  it("n=0なら開始日を営業日に正規化するだけ", () => {
    expect(shiftBusinessDays("2026-01-05", 0, WEEKEND, [])).toBe("2026-01-05");
    // 開始日が土曜なら次の営業日（月曜）に正規化される
    expect(shiftBusinessDays("2026-01-10", 0, WEEKEND, [])).toBe("2026-01-12");
  });

  it("複数営業日のシフトも正しく積み上げる", () => {
    // 月曜から3営業日後 = 木曜（火水木の3日を消費）
    expect(shiftBusinessDays("2026-01-05", 3, WEEKEND, [])).toBe("2026-01-08");
  });
});

describe("maxDate", () => {
  it("配列の最大日付を返す", () => {
    expect(maxDate(["2026-01-05", "2026-01-12", "2026-01-09"])).toBe("2026-01-12");
  });

  it("空配列はnull", () => {
    expect(maxDate([])).toBeNull();
  });
});
