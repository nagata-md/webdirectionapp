// 集計見積もり（Phase 12、新規要件）。
// 構造（確定）：①ディレクション費 ②TOP関連（複雑度で括らずページ単位で1式個別表示）
// ③それ以外のページ（コスト工程×複雑度で集計し「n頁×単価」表示）
// ④CMS構築費（詳細と同じくページ名＋CMS構築費の個別行）
// ⑤テスト検証（テストアップ＋公開の全ページ合計を1行に集約、0円ならUI側で非表示）
// ⑥追加項目（③、詳細と共通）
//
// 設計上の不変条件：directionFee + topLinesTotal + tallyLinesTotal + cmsCostsTotal
// + testVerificationTotal + lineItemsSubtotal は、詳細見積もり（calculate.ts）の
// subtotalと必ず一致する（同じ入力から計算しているため。表示のグルーピングが違うだけ）。
import { calendarMonthsBetween, cmsCost } from "./calculate";
import type {
  EstimateCmsCost,
  EstimateCmsRates,
  EstimateLineItemInput,
  EstimatePageInput,
  EstimateRates,
} from "./calculate";

export type AggregatedLine = {
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

export type AggregatedEstimateResult = {
  directionFee: number;
  directionMonths: number;
  directionMonthlyRate: number;
  topLines: AggregatedLine[];
  tallyLines: AggregatedLine[];
  cmsCosts: EstimateCmsCost[];
  testVerificationTotal: number;
  lineItems: EstimateLineItemInput[];
  lineItemsSubtotal: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  remarks: string | null;
};

const TALLY_COST_PHASES = ["ワイヤー", "コピー", "デザイン", "コーディング"] as const;

const TOP_PHASE_LABELS: Record<string, string> = {
  ワイヤー: "ワイヤーフレーム作成",
  コピー: "コピーライティング",
  デザイン: "デザイン",
  コーディング: "コーディング",
};

function isPhaseNeeded(page: EstimatePageInput, phase: string): boolean {
  if (phase === "ワイヤー") return page.wireNeeded;
  if (phase === "コピー") return page.copyNeeded;
  return true;
}

export function computeAggregatedEstimate(input: {
  pages: EstimatePageInput[];
  rates: EstimateRates;
  topRates: EstimateRates;
  cmsRates: EstimateCmsRates;
  mobileMenuRate: number;
  directionMonthlyRate: number;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  lineItems: EstimateLineItemInput[];
  taxRate: number;
  remarks: string | null;
}): AggregatedEstimateResult {
  const {
    pages,
    rates,
    topRates,
    cmsRates,
    mobileMenuRate,
    directionMonthlyRate,
    scheduleStartDate,
    scheduleEndDate,
    lineItems,
    taxRate,
    remarks,
  } = input;

  const months =
    scheduleStartDate && scheduleEndDate
      ? calendarMonthsBetween(scheduleStartDate, scheduleEndDate)
      : 0;
  const directionFee = directionMonthlyRate * months;

  const topPages = pages.filter((p) => p.type === "top");
  const otherPages = pages.filter((p) => p.type !== "top");

  const topLines: AggregatedLine[] = [];
  for (const page of topPages) {
    const complexityRates = topRates[page.complexity] ?? {};
    for (const phase of TALLY_COST_PHASES) {
      if (!isPhaseNeeded(page, phase)) continue;
      const cost = complexityRates[phase]?.cost ?? 0;
      if (cost <= 0) continue;
      topLines.push({
        label: `${page.name}${TOP_PHASE_LABELS[phase]}`,
        quantity: 1,
        unit: "式",
        unitPrice: cost,
        amount: cost,
      });
    }
    if (page.mobileMenuNeeded && mobileMenuRate > 0) {
      topLines.push({
        label: `${page.name}スマホ対応メニュー制作`,
        quantity: 1,
        unit: "式",
        unitPrice: mobileMenuRate,
        amount: mobileMenuRate,
      });
    }
  }

  const tallyMap = new Map<
    string,
    { phase: string; complexity: string; count: number; unitPrice: number }
  >();
  for (const page of otherPages) {
    const complexityRates = rates[page.complexity] ?? {};
    for (const phase of TALLY_COST_PHASES) {
      if (!isPhaseNeeded(page, phase)) continue;
      const unitPrice = complexityRates[phase]?.cost ?? 0;
      if (unitPrice <= 0) continue;
      const key = `${phase}:${page.complexity}`;
      const existing = tallyMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        tallyMap.set(key, { phase, complexity: page.complexity, count: 1, unitPrice });
      }
    }
  }
  const tallyLines: AggregatedLine[] = [...tallyMap.values()].map((t) => ({
    label: `${t.phase}（${t.complexity}）`,
    quantity: t.count,
    unit: "頁",
    unitPrice: t.unitPrice,
    amount: t.count * t.unitPrice,
  }));

  const cmsCosts: EstimateCmsCost[] = pages
    .filter((p) => p.cmsTier)
    .map((p) => ({
      pageId: p.id,
      pageName: p.name,
      tier: p.cmsTier as string,
      cost: cmsCost(p, cmsRates),
    }));

  let testVerificationTotal = 0;
  for (const page of pages) {
    const complexityRates = (page.type === "top" ? topRates : rates)[page.complexity] ?? {};
    testVerificationTotal +=
      (complexityRates["テストアップ"]?.cost ?? 0) + (complexityRates["公開"]?.cost ?? 0);
  }

  const lineItemsSubtotal = lineItems.reduce((sum, l) => sum + l.amount, 0);

  const topLinesTotal = topLines.reduce((sum, l) => sum + l.amount, 0);
  const tallyLinesTotal = tallyLines.reduce((sum, l) => sum + l.amount, 0);
  const cmsCostsTotal = cmsCosts.reduce((sum, c) => sum + c.cost, 0);

  const subtotal =
    directionFee +
    topLinesTotal +
    tallyLinesTotal +
    cmsCostsTotal +
    testVerificationTotal +
    lineItemsSubtotal;
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  return {
    directionFee,
    directionMonths: months,
    directionMonthlyRate,
    topLines,
    tallyLines,
    cmsCosts,
    testVerificationTotal,
    lineItems,
    lineItemsSubtotal,
    subtotal,
    taxRate,
    taxAmount,
    total,
    remarks,
  };
}
