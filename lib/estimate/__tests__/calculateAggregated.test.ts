import { describe, expect, it } from "vitest";
import { computeEstimate, type EstimatePageInput } from "../calculate";
import { computeAggregatedEstimate } from "../calculateAggregated";
import type { Rates } from "@/lib/master/constants";

const rates: Rates = {
  S: {
    ワイヤー: { days: 1, cost: 10000 },
    コピー: { days: 1, cost: 15000 },
    デザイン: { days: 2, cost: 30000 },
    コーディング: { days: 2, cost: 40000 },
    テストアップ: { days: 1, cost: 5000 },
    公開: { days: 1, cost: 3000 },
  },
  M: {
    ワイヤー: { days: 1, cost: 20000 },
    コピー: { days: 1, cost: 25000 },
    デザイン: { days: 2, cost: 50000 },
    コーディング: { days: 2, cost: 60000 },
    テストアップ: { days: 1, cost: 8000 },
    公開: { days: 1, cost: 5000 },
  },
  L: {
    ワイヤー: { days: 2, cost: 40000 },
    コピー: { days: 2, cost: 45000 },
    デザイン: { days: 3, cost: 90000 },
    コーディング: { days: 3, cost: 100000 },
    テストアップ: { days: 2, cost: 12000 },
    公開: { days: 1, cost: 8000 },
  },
};

const topRates: Rates = {
  ...rates,
  M: { ...rates.M, デザイン: { days: 2, cost: 180000 }, コーディング: { days: 2, cost: 150000 } },
};

const cmsRates = {
  S: { days: 1, cost: 30000 },
  M: { days: 2, cost: 50000 },
  L: { days: 3, cost: 80000 },
};

const pages: EstimatePageInput[] = [
  {
    id: "top1",
    name: "TOP",
    type: "top",
    complexity: "M",
    wireNeeded: true,
    copyNeeded: false,
    cmsTier: null,
    mobileMenuNeeded: true,
  },
  {
    id: "p1",
    name: "会社概要",
    type: "lower",
    complexity: "M",
    wireNeeded: true,
    copyNeeded: true,
    cmsTier: null,
    mobileMenuNeeded: false,
  },
  {
    id: "p2",
    name: "サービス紹介",
    type: "lower",
    complexity: "M",
    wireNeeded: true,
    copyNeeded: true,
    cmsTier: null,
    mobileMenuNeeded: false,
  },
  {
    id: "p3",
    name: "採用情報管理",
    type: "lower",
    complexity: "L",
    wireNeeded: false,
    copyNeeded: false,
    cmsTier: "L",
    mobileMenuNeeded: false,
  },
];

const sharedInput = {
  pages,
  rates,
  topRates,
  cmsRates,
  mobileMenuRate: 30000,
  directionMonthlyRate: 100000,
  scheduleStartDate: "2026-01-05",
  scheduleEndDate: "2026-03-10",
  lineItems: [
    { id: "l1", label: "素材費", amount: 20000 },
    { id: "l2", label: "初回割引", amount: -10000 },
  ],
  taxRate: 0.1,
  remarks: null,
};

describe("computeAggregatedEstimate", () => {
  it("詳細見積もりと集計見積もりの税抜合計(subtotal)が一致する", () => {
    const detailed = computeEstimate(sharedInput);
    const aggregated = computeAggregatedEstimate(sharedInput);
    expect(aggregated.subtotal).toBe(detailed.subtotal);
    expect(aggregated.total).toBe(detailed.total);
  });

  it("TOP関連はページ単位で1式の個別行になる（複雑度で括らない）", () => {
    const aggregated = computeAggregatedEstimate(sharedInput);
    const labels = aggregated.topLines.map((l) => l.label);
    expect(labels).toContain("TOPワイヤーフレーム作成");
    expect(labels).toContain("TOPデザイン");
    expect(labels).toContain("TOPコーディング");
    expect(labels).toContain("TOPスマホ対応メニュー制作");
    // コピー不要なので含まれない
    expect(labels).not.toContain("TOPコピーライティング");
  });

  it("TOP以外のページはコスト工程×複雑度で集計される", () => {
    const aggregated = computeAggregatedEstimate(sharedInput);
    const designM = aggregated.tallyLines.find((l) => l.label === "デザイン（M）");
    expect(designM).toMatchObject({ quantity: 2, unitPrice: 50000, amount: 100000 });
  });

  it("CMS構築費はページ名+CMS構築費として個別行になる", () => {
    const aggregated = computeAggregatedEstimate(sharedInput);
    expect(aggregated.cmsCosts).toEqual([
      { pageId: "p3", pageName: "採用情報管理", tier: "L", cost: 80000 },
    ]);
  });

  it("テスト検証はテストアップ+公開の全ページ合計を1行にまとめる", () => {
    const aggregated = computeAggregatedEstimate(sharedInput);
    // TOP(M): 8000+5000, p1(M): 8000+5000, p2(M): 8000+5000, p3(L): 12000+8000
    const expected = (8000 + 5000) * 3 + (12000 + 8000);
    expect(aggregated.testVerificationTotal).toBe(expected);
  });

  it("designNeeded=false/codingNeeded=falseのページは集計の該当行から除外される", () => {
    const pagesWithSkips: EstimatePageInput[] = [
      ...pages,
      {
        id: "p4",
        name: "デザインなしページ",
        type: "lower",
        complexity: "M",
        wireNeeded: true,
        copyNeeded: true,
        designNeeded: false,
        cmsTier: null,
        mobileMenuNeeded: false,
      },
    ];
    const input = { ...sharedInput, pages: pagesWithSkips };
    const detailed = computeEstimate(input);
    const aggregated = computeAggregatedEstimate(input);

    // 詳細・集計の合計は引き続き一致する
    expect(aggregated.subtotal).toBe(detailed.subtotal);

    // デザイン（M）の集計行の数量は、デザインなしページを含めた3ページ分ではなく
    // 既存の2ページ分のまま（p4はデザイン不要のためカウントされない）
    const designM = aggregated.tallyLines.find((l) => l.label === "デザイン（M）");
    expect(designM).toMatchObject({ quantity: 2 });
    // 一方コーディング（M）は3ページ分に増える
    const codingM = aggregated.tallyLines.find((l) => l.label === "コーディング（M）");
    expect(codingM).toMatchObject({ quantity: 3 });
  });
});
