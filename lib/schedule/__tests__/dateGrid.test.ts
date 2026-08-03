import { describe, expect, it } from "vitest";
import { buildDateGrid } from "../dateGrid";

describe("buildDateGrid", () => {
  it("開始日〜終了日の全日付を1日ずつ生成する", () => {
    const { days } = buildDateGrid("2026-01-30", "2026-02-02", [0, 6], []);
    expect(days.map((d) => d.date)).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("週末・休日カレンダー登録日をisOff=trueにする", () => {
    const { days } = buildDateGrid("2026-01-30", "2026-02-02", [0, 6], [
      { date: "2026-02-02", label: "特別休業日" },
    ]);
    // 2026-01-30は金曜(平日)、01-31は土曜、02-01は日曜、02-02は月曜だが休日登録あり
    expect(days.find((d) => d.date === "2026-01-30")?.isOff).toBe(false);
    expect(days.find((d) => d.date === "2026-01-31")?.isOff).toBe(true);
    expect(days.find((d) => d.date === "2026-02-01")?.isOff).toBe(true);
    expect(days.find((d) => d.date === "2026-02-02")?.isOff).toBe(true);
  });

  it("月をまたぐ場合、月ごとのグループとcolSpanを正しく作る", () => {
    const { months } = buildDateGrid("2026-01-30", "2026-02-02", [0, 6], []);
    expect(months).toEqual([
      { label: "2026年1月", colSpan: 2 },
      { label: "2026年2月", colSpan: 2 },
    ]);
  });
});
