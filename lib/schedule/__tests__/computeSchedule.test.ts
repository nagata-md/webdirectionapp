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

  it("結果のページ順序は入力pages配列の順序をそのまま保つ（ガントチャートの行順に利用、2026-08-07）", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        { id: "c", type: "lower", complexity: "M", wireNeeded: false, copyNeeded: false, cmsTier: null, groupId: null, priority: 1 },
        { id: "a", type: "lower", complexity: "M", wireNeeded: false, copyNeeded: false, cmsTier: null, groupId: null, priority: 2 },
        { id: "b", type: "lower", complexity: "M", wireNeeded: false, copyNeeded: false, cmsTier: null, groupId: null, priority: 3 },
      ],
      groups: [],
      parallelByPhase: ALL_LANES_1,
      master: baseMaster(),
      overrides: [],
    };

    const result = computeSchedule(input);
    // priorityでの並び替えは行われず、呼び出し側が渡した順序（c, a, b）のまま返る
    expect(result.pages.map((p) => p.pageId)).toEqual(["c", "a", "b"]);
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

  it("2校期間(2校作業日数+2校チェックバック日数)が構成→デザインの待機に加算される", () => {
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
      master: baseMaster({
        standards: {
          構成: { checkback: 2, buffer: 1, secondDraftDays: 3, secondCheckbackDays: 3 },
          デザイン: { checkback: 0, buffer: 0 },
          コーディング: { checkback: 0, buffer: 0 },
          "CMS構築": { checkback: 0, buffer: 0 },
          テストアップ: { checkback: 0, buffer: 0 },
          公開: { checkback: 0, buffer: 0 },
        },
      }),
      overrides: [],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const composition = p1.phases.find((ph) => ph.phase === "構成")!;
    const design = p1.phases.find((ph) => ph.phase === "デザイン")!;

    // 構成: 01-05(月)〜01-06(火)の2営業日
    expect(composition.end).toBe("2026-01-06");
    // 待機 = checkback(2)+secondDraft(3)+secondCheckback(3)+buffer(1) = 9営業日 → +1でデザイン開始
    expect(design.start).toBe("2026-01-20");
  });

  it("2校期間はCMS構築工程には適用されない", () => {
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
      ],
      groups: [],
      parallelByPhase: ALL_LANES_1,
      master: baseMaster({
        standards: {
          構成: { checkback: 0, buffer: 0 },
          デザイン: { checkback: 0, buffer: 0 },
          コーディング: { checkback: 0, buffer: 0 },
          "CMS構築": { checkback: 0, buffer: 0, secondDraftDays: 5, secondCheckbackDays: 5 },
          テストアップ: { checkback: 0, buffer: 0 },
          公開: { checkback: 0, buffer: 0 },
        },
      }),
      overrides: [],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const cms = p1.phases.find((ph) => ph.phase === "CMS構築")!;
    const testup = p1.phases.find((ph) => ph.phase === "テストアップ")!;

    // CMS構築にsecondDraftDays/secondCheckbackDaysを設定しても無視され（checkback/bufferが
    // ともに0のため）、テストアップはCMS構築完了の翌営業日にそのまま始まる。
    // 5+5営業日分の待機が加算されていれば、この日付より大きくズレるはずである。
    const cmsEndIdx = Math.floor(new Date(`${cms.end}T00:00:00Z`).getTime() / 86400000);
    const testupStartIdx = Math.floor(new Date(`${testup.start}T00:00:00Z`).getTime() / 86400000);
    expect(testupStartIdx - cmsEndIdx).toBeLessThanOrEqual(3); // 週末を挟んでも最大3暦日以内
  });

  it("2校期間はチェックバック1・2校作業・チェックバック2の3つの独立したセグメントとして積まれる", () => {
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
          groupId: null,
          priority: 1,
        },
      ],
      groups: [],
      parallelByPhase: ALL_LANES_1,
      master: baseMaster({
        standards: {
          構成: { checkback: 2, buffer: 1, secondDraftDays: 3, secondCheckbackDays: 3 },
          デザイン: { checkback: 0, buffer: 0 },
          コーディング: { checkback: 0, buffer: 0 },
          "CMS構築": { checkback: 0, buffer: 0 },
          テストアップ: { checkback: 0, buffer: 0 },
          公開: { checkback: 0, buffer: 0 },
        },
      }),
      overrides: [],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;

    const cb1 = p1.phases.find((ph) => ph.phase === "構成チェックバック1")!;
    const revision = p1.phases.find((ph) => ph.phase === "構成2校作業")!;
    const cb2 = p1.phases.find((ph) => ph.phase === "構成チェックバック2")!;

    expect(cb1.kind).toBe("checkback1");
    expect(cb1.basePhase).toBe("構成");
    expect(revision.kind).toBe("revision");
    expect(revision.basePhase).toBe("構成");
    expect(cb2.kind).toBe("checkback2");
    expect(cb2.basePhase).toBe("構成");

    // 順序どおりに並んでいる: 構成完了 < CB1 < 2校作業 < CB2 < デザイン開始
    const composition = p1.phases.find((ph) => ph.phase === "構成")!;
    const design = p1.phases.find((ph) => ph.phase === "デザイン")!;
    expect(composition.end < cb1.start).toBe(true);
    expect(cb1.end < revision.start).toBe(true);
    expect(revision.end < cb2.start).toBe(true);
    expect(cb2.end < design.start).toBe(true);
  });

  it("チェックバック1を手動オーバーライドすると、2校作業・チェックバック2・次工程が自動的に追従する", () => {
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
          groupId: null,
          priority: 1,
        },
      ],
      groups: [],
      parallelByPhase: ALL_LANES_1,
      master: baseMaster({
        standards: {
          構成: { checkback: 2, buffer: 1, secondDraftDays: 3, secondCheckbackDays: 3 },
          デザイン: { checkback: 0, buffer: 0 },
          コーディング: { checkback: 0, buffer: 0 },
          "CMS構築": { checkback: 0, buffer: 0 },
          テストアップ: { checkback: 0, buffer: 0 },
          公開: { checkback: 0, buffer: 0 },
        },
      }),
      overrides: [
        // チェックバック1を大幅に後ろ倒し
        {
          pageId: "p1",
          phaseKey: "構成チェックバック1",
          overrideStart: "2026-01-07",
          overrideEnd: "2026-01-30",
        },
      ],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const cb1 = p1.phases.find((ph) => ph.phase === "構成チェックバック1")!;
    const revision = p1.phases.find((ph) => ph.phase === "構成2校作業")!;
    const cb2 = p1.phases.find((ph) => ph.phase === "構成チェックバック2")!;
    const design = p1.phases.find((ph) => ph.phase === "デザイン")!;

    expect(cb1.end).toBe("2026-01-30");
    expect(cb1.isOverridden).toBe(true);
    // オーバーライドされたCB1の終了日を起点に、後続のセグメントはfresh計算で自動的に追従する
    expect(revision.start > cb1.end).toBe(true);
    expect(cb2.start > revision.end).toBe(true);
    expect(design.start > cb2.end).toBe(true);
  });

  it("2校作業(revision)セグメントはオーバーライド対象外で、指定しても無視される", () => {
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
          groupId: null,
          priority: 1,
        },
      ],
      groups: [],
      parallelByPhase: ALL_LANES_1,
      master: baseMaster({
        standards: {
          構成: { checkback: 2, buffer: 1, secondDraftDays: 3, secondCheckbackDays: 3 },
          デザイン: { checkback: 0, buffer: 0 },
          コーディング: { checkback: 0, buffer: 0 },
          "CMS構築": { checkback: 0, buffer: 0 },
          テストアップ: { checkback: 0, buffer: 0 },
          公開: { checkback: 0, buffer: 0 },
        },
      }),
      overrides: [
        {
          pageId: "p1",
          phaseKey: "構成2校作業",
          overrideStart: "2099-01-01",
          overrideEnd: "2099-01-01",
        },
      ],
    };

    const result = computeSchedule(input);
    const p1 = result.pages.find((p) => p.pageId === "p1")!;
    const revision = p1.phases.find((ph) => ph.phase === "構成2校作業")!;

    expect(revision.isOverridden).toBe(false);
    expect(revision.start).not.toBe("2099-01-01");
  });

  it("designNeeded=falseのページはデザイン工程自体がスケジュールから除外される", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          designNeeded: false,
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
    const phaseNames = p1.phases.filter((ph) => ph.kind === "production").map((ph) => ph.phase);

    expect(phaseNames).toEqual(["構成", "コーディング", "テストアップ", "公開"]);
  });

  it("codingNeeded=falseのページはコーディング工程自体がスケジュールから除外される", () => {
    const input: ComputeScheduleInput = {
      projectStartDate: "2026-01-05",
      pages: [
        {
          id: "p1",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          codingNeeded: false,
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
    const phaseNames = p1.phases.filter((ph) => ph.kind === "production").map((ph) => ph.phase);

    expect(phaseNames).toEqual(["構成", "デザイン", "テストアップ", "公開"]);
  });
});
