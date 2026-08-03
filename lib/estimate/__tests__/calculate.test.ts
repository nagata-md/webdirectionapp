import { describe, expect, it } from "vitest";
import { calendarMonthsBetween, cmsCost, computeEstimate, pageCost } from "../calculate";
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

const topRates: Rates = rates;
const cmsRates = {
  S: { days: 1, cost: 30000 },
  M: { days: 2, cost: 50000 },
  L: { days: 3, cost: 80000 },
};

describe("calendarMonthsBetween", () => {
  it("同一月なら1ヶ月", () => {
    expect(calendarMonthsBetween("2026-01-05", "2026-01-20")).toBe(1);
  });

  it("月をまたぐ場合は暦月数でカウントする", () => {
    expect(calendarMonthsBetween("2026-01-15", "2026-03-03")).toBe(3);
  });

  it("年をまたぐ場合も正しくカウントする", () => {
    expect(calendarMonthsBetween("2026-12-01", "2027-02-01")).toBe(3);
  });
});

describe("pageCost", () => {
  it("ワイヤー・コピーとも必要な場合は全工程のコストを合算する", () => {
    const cost = pageCost(
      {
        id: "p1",
        name: "TOP",
        type: "lower",
        complexity: "M",
        wireNeeded: true,
        copyNeeded: true,
        cmsTier: null,
        mobileMenuNeeded: false,
      },
      rates,
      topRates,
      0,
    );
    expect(cost).toBe(20000 + 25000 + 50000 + 60000 + 8000 + 5000);
  });

  it("ワイヤー・コピーが不要な場合はその分を除く", () => {
    const cost = pageCost(
      {
        id: "p1",
        name: "下層",
        type: "lower",
        complexity: "M",
        wireNeeded: false,
        copyNeeded: false,
        cmsTier: null,
        mobileMenuNeeded: false,
      },
      rates,
      topRates,
      0,
    );
    expect(cost).toBe(50000 + 60000 + 8000 + 5000);
  });

  it("TOPページはtopRatesを参照する", () => {
    const customTopRates: Rates = {
      ...rates,
      M: { ...rates.M, デザイン: { days: 2, cost: 999999 } },
    };
    const cost = pageCost(
      {
        id: "p1",
        name: "TOP",
        type: "top",
        complexity: "M",
        wireNeeded: false,
        copyNeeded: false,
        cmsTier: null,
        mobileMenuNeeded: false,
      },
      rates,
      customTopRates,
      0,
    );
    expect(cost).toBe(999999 + 60000 + 8000 + 5000);
  });

  it("スマホ対応メニューが必要な場合は単価が加算される", () => {
    const cost = pageCost(
      {
        id: "p1",
        name: "TOP",
        type: "top",
        complexity: "M",
        wireNeeded: false,
        copyNeeded: false,
        cmsTier: null,
        mobileMenuNeeded: true,
      },
      rates,
      topRates,
      30000,
    );
    expect(cost).toBe(50000 + 60000 + 8000 + 5000 + 30000);
  });
});

describe("cmsCost", () => {
  it("cmsTierが設定されている場合はマスタの単価を返す", () => {
    expect(cmsCost({ cmsTier: "M" }, cmsRates)).toBe(50000);
  });

  it("cmsTierがnullの場合は0", () => {
    expect(cmsCost({ cmsTier: null }, cmsRates)).toBe(0);
  });
});

describe("computeEstimate", () => {
  it("ディレクション費・ページ別コスト・CMS構築費・追加項目の合計と税込金額を算出する", () => {
    const result = computeEstimate({
      pages: [
        {
          id: "p1",
          name: "TOP",
          type: "top",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: null,
          mobileMenuNeeded: false,
        },
        {
          id: "p2",
          name: "採用情報",
          type: "lower",
          complexity: "M",
          wireNeeded: true,
          copyNeeded: true,
          cmsTier: "M",
          mobileMenuNeeded: false,
        },
      ],
      rates,
      topRates,
      cmsRates,
      mobileMenuRate: 0,
      directionMonthlyRate: 100000,
      scheduleStartDate: "2026-01-05",
      scheduleEndDate: "2026-02-10",
      lineItems: [
        { id: "l1", label: "素材費", amount: 20000 },
        { id: "l2", label: "初回割引", amount: -30000 },
      ],
      taxRate: 0.1,
      remarks: "備考テスト",
    });

    const pageCostSum = (20000 + 25000 + 50000 + 60000 + 8000 + 5000) * 2;
    const expectedCmsCost = 50000;
    const expectedDirectionFee = 100000 * 2; // 1月・2月の2ヶ月
    const expectedLineItems = 20000 - 30000;
    const expectedSubtotal = expectedDirectionFee + pageCostSum + expectedCmsCost + expectedLineItems;

    expect(result.directionFee).toBe(expectedDirectionFee);
    expect(result.cmsCosts).toEqual([{ pageId: "p2", pageName: "採用情報", tier: "M", cost: 50000 }]);
    expect(result.pagesSubtotal).toBe(pageCostSum + expectedCmsCost);
    expect(result.lineItemsSubtotal).toBe(expectedLineItems);
    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.taxAmount).toBe(Math.round(expectedSubtotal * 0.1));
    expect(result.total).toBe(expectedSubtotal + Math.round(expectedSubtotal * 0.1));
    expect(result.remarks).toBe("備考テスト");
  });
});
