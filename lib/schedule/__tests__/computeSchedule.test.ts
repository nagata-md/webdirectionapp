import { describe, expect, it } from "vitest";
import { computeSchedule } from "../computeSchedule";
import type { ComputeScheduleInput, MasterForSchedule } from "../types";

const WEEKEND = [0, 6];

function baseMaster(overrides: Partial<MasterForSchedule> = {}): MasterForSchedule {
  return {
    rates: {
      M: {
        ワイヤー: { days: 1, cost: 0 },
        コピー: { days: 1, cost: 0 },
        デザイン: { days: 2, cost: 0 },
        コーディング: { days: 2, cost: 0 },
        テストアップ: { days: 1, cost: 0 },
        公開: { days: 1, cost: 0 },
      },
    },
    topRates: {},
    cmsRates: {
      M: { days: 1, cost: 0 },
    },
    standards: {
      構成: { checkback: 0, buffer: 0 },
      デザイン: { checkback: 0, buffer: 0 },
      コーディング: { checkback: 0, buffer: 0 },
      "CMS構築": { checkback: 0, buffer: 0 },
      テストアップ: { checkback: 0, buffer: 0 },
      公開: { checkback: 0, buffer: 0 },
    },
    weeklyOff: WEEKEND,
    holidays: [],
    ...overrides,
  };
}

const ALL_LANES_1 = {
  構成: 1,
  デザイン: 1,
  コーディング: 1,
  "CMS構築": 1,
  テストアップ: 1,
  公開: 1,
};

describe("computeSchedule", () => {
  it("単一ページ・待機日数0の場合、工程が連続して積み上がる", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05", // 月
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: null,
          priority: 1,
        },
      ],
      groups: [],
      parallelByPhase: ALL_LANES_1,
      master: baseMaster(),
      overrides: [],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const byPhase = Object.fromEntries(p1.phases.map((ph) => [ph.phase, ph]));

    // 構成: ワイヤー1+コピー1=2営業日 → 01-05(月)〜01-06(火)
    expect(byPhase["構成"]).toMatchObject({ start: "2026-01-05", end: "2026-01-06" });
    // デザイン: 2営業日、待機0なので構成終了の翌営業日(01-07 水)開始 → 01-07〜01-08
    expect(byPhase["デザイン"]).toMatchObject({ start: "2026-01-07", end: "2026-01-08" });
    // コーディング: 2営業日、01-09(金)開始 → 週末をまたいで01-09〜01-12(月)
    expect(byPhase["コーディング"]).toMatchObject({ start: "2026-01-09", end: "2026-01-12" });
    // テストアップ: 1営業日、01-13(火)
    expect(byPhase["テストアップ"]).toMatchObject({ start: "2026-01-13", end: "2026-01-13" });
    // 公開: 1営業日、01-14(水)
    expect(byPhase["公開"]).toMatchObject({ start: "2026-01-14", end: "2026-01-14" });

    expect(result.projectEndDate).toBe("2026-01-14");
  });

  it("進行グループ2以降は前グループの構成完了日を起点にする", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: "g1",
          priority: 1,
        },
        {
          id: "p2",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: "g2",
          priority: 1,
        },
      ],
      groups: [
        { id: "g1", sortOrder: 1 },
        { id: "g2", sortOrder: 2 },
      ],
      // 構成レーンを2にして、グループ間で構成レーンの奪い合いが起きないようにする
      parallelByPhase: { ...ALL_LANES_1, 構成: 2 },
      master: baseMaster(),
      overrides: [],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const p2 = result.pages.find((p) => p.pageId === "p2")!;
    const p1Composition = p1.phases.find((ph) => ph.phase === "構成")!;
    const p2Composition = p2.phases.find((ph) => ph.phase === "構成")!;

    // グループ1の構成完了日(01-06 火)の翌営業日(01-07 水)がグループ2の起点になる
    expect(p1Composition.end).toBe("2026-01-06");
    expect(p2Composition.start).toBe("2026-01-07");
    expect(result.groupStartDates["g2"]).toBe("2026-01-07");
  });

  it("並行作業レーンが1件のみの場合、2件目のページは1件目のレーン解放を待つ", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: false,
          copyNeeded: false,
          cmsTier: null,
          groupId: null,
          priority: 1,
        },
        {
          id: "p2",
          type: "lower",
          complexity: "M",
          wireNeeded: false,
          copyNeeded: false,
          cmsTier: null,
          groupId: null,
          priority: 2,
        },
      ],
      groups: [],
      // 構成は不要(wire/copyともfalseなので1営業日扱い)、デザインのレーンを1に絞って競合させる
      parallelByPhase: ALL_LANES_1,
      master: baseMaster(),
      overrides: [],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const p2 = result.pages.find((p) => p.pageId === "p2")!;
    const p1Design = p1.phases.find((ph) => ph.phase === "デザイン")!;
    const p2Design = p2.phases.find((ph) => ph.phase === "デザイン")!;

    // p1が先にデザインレーンを使うため、p2はp1のデザイン終了を待ってから開始する
    expect(p2Design.start).toBe(p1Design.end);
  });

  it("手動オーバーライドされた構成の実効終了日が次グループの起点に反映される", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: "g1",
          priority: 1,
        },
        {
          id: "p2",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: "g2",
          priority: 1,
        },
      ],
      groups: [
        { id: "g1", sortOrder: 1 },
        { id: "g2", sortOrder: 2 },
      ],
      parallelByPhase: { ...ALL_LANES_1, 構成: 2 },
      master: baseMaster(),
      overrides: [
        // p1の構成完了を手動で01-20まで後ろ倒し
        { pageId: "p1", phaseKey: "構成", overrideStart: "2026-01-05", overrideEnd: "2026-01-20" },
      ],
    };

    const result = computeSchedule(input);
    // グループ2の起点は自動計算値(01-07)ではなく、オーバーライドされた01-20(火)の翌営業日01-21(水)になる
    expect(result.groupStartDates["g2"]).toBe("2026-01-21");
  });

  it("CMS構築はcmsTierが設定されたページのみコーディング後・テストアップ前に挿入される", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: "M",
          groupId: null,
          priority: 1,
        },
        {
          id: "p2",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: null,
          priority: 2,
        },
      ],
      groups: [],
      parallelByPhase: ALL_LANES_1,
      master: baseMaster(),
      overrides: [],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const p2 = result.pages.find((p) => p.pageId === "p2")!;

    const p1Phases = p1.phases.map((ph) => ph.phase);
    expect(p1Phases).toEqual(["構成", "デザイン", "コーディング", "CMS構築", "テストアップ", "公開"]);

    // CMS構築はコーディング直後に開始する
    const p1Coding = p1.phases.find((ph) => ph.phase === "コーディング")!;
    const p1Cms = p1.phases.find((ph) => ph.phase === "CMS構築")!;
    expect(p1Cms.start > p1Coding.end).toBe(true);

    // cmsTierがないページにはCMS構築の工程自体が存在しない
    const p2Phases = p2.phases.map((ph) => ph.phase);
    expect(p2Phases).toEqual(["構成", "デザイン", "コーディング", "テストアップ", "公開"]);
  });

  it("構成工程は並行作業人数の制限に関わらず同一グループの全ページが同日着手する", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: "g1",
          priority: 1,
        },
        {
          id: "p2",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: "g1",
          priority: 2,
        },
        {
          id: "p3",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          groupId: "g1",
          priority: 3,
        },
      ],
      groups: [{ id: "g1", sortOrder: 1 }],
      // 構成のレーンは1のみ。他の工程のレーンも1のままだが、構成は制限を無視する想定
      parallelByPhase: ALL_LANES_1,
      master: baseMaster(),
      overrides: [],
    };

    const result = computeSchedule(input);
    const starts = ["p1", "p2", "p3"].map(
      (id) => result.pages.find((p) => p.pageId === id)!.phases.find((ph) => ph.phase === "構成")!.start,
    );

    // 構成レーンが1でも、3ページとも同じ開始日(プロジェクト開始日)になる
    expect(starts).toEqual(["2026-01-05", "2026-01-05", "2026-01-05"]);
  });
});
