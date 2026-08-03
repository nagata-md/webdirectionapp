// 見積もり計算（詳細見積もり、spec §4.7）。
// 表示順（確定）：①ディレクション費 → ②ページ別コスト（CMS構築費は個別行） → ③追加項目。

// マスタ未設定（rates=`{}`）でも壊れないよう、DBから読んだ緩い形をそのまま受け取れる型にする
// （lib/master/constants.tsの厳密なRates型はUIの入力フォーム側で使う）。
export type EstimateRates = Record<string, Record<string, { days: number; cost: number }>>;
export type EstimateCmsRates = Record<string, { days: number; cost: number }>;

export type EstimatePageInput = {
  id: string;
  name: string;
  type: string;
  complexity: string;
  wireNeeded: boolean;
  copyNeeded: boolean;
  cmsTier: string | null;
  mobileMenuNeeded: boolean;
};

export type EstimateLineItemInput = {
  id: string;
  label: string;
  amount: number;
};

export type EstimatePageCost = {
  pageId: string;
  pageName: string;
  cost: number;
};

export type EstimateCmsCost = {
  pageId: string;
  pageName: string;
  tier: string;
  cost: number;
};

export type EstimateResult = {
  directionFee: number;
  pages: EstimatePageCost[];
  cmsCosts: EstimateCmsCost[];
  pagesSubtotal: number; // pages + cmsCosts の合計
  lineItems: EstimateLineItemInput[];
  lineItemsSubtotal: number;
  subtotal: number; // ①+②+③（税抜）
  taxRate: number;
  taxAmount: number;
  total: number; // 税込合計
  remarks: string | null;
};

// プロジェクト開始月〜完了月の暦月数（要件定義書の暦月カウント方針）。
// 例：1/15開始〜3/3完了 = 1月・2月・3月の3ヶ月。
export function calendarMonthsBetween(startDate: string, endDate: string): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ey, em] = endDate.split("-").map(Number);
  return Math.max(1, (ey * 12 + em) - (sy * 12 + sm) + 1);
}

// TOPページはtopRates（別建てマスタ）を参照する（Phase 12）。CMS構築費はここでは扱わず、
// cmsCost()で個別行として算出する（詳細見積もりでも「ページ名＋CMS構築費」として分離表示するため）。
export function pageCost(
  page: EstimatePageInput,
  rates: EstimateRates,
  topRates: EstimateRates,
  mobileMenuRate: number,
): number {
  const rateTable = page.type === "top" ? topRates : rates;
  const complexityRates = rateTable[page.complexity];
  const mobileMenu = page.mobileMenuNeeded ? mobileMenuRate : 0;
  if (!complexityRates) return mobileMenu;

  const wire = page.wireNeeded ? (complexityRates["ワイヤー"]?.cost ?? 0) : 0;
  const copy = page.copyNeeded ? (complexityRates["コピー"]?.cost ?? 0) : 0;
  const design = complexityRates["デザイン"]?.cost ?? 0;
  const coding = complexityRates["コーディング"]?.cost ?? 0;
  const testup = complexityRates["テストアップ"]?.cost ?? 0;
  const publish = complexityRates["公開"]?.cost ?? 0;

  return wire + copy + design + coding + testup + publish + mobileMenu;
}

export function cmsCost(page: Pick<EstimatePageInput, "cmsTier">, cmsRates: EstimateCmsRates): number {
  if (!page.cmsTier) return 0;
  return cmsRates[page.cmsTier]?.cost ?? 0;
}

export function computeEstimate(input: {
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
}): EstimateResult {
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

  const pageCosts: EstimatePageCost[] = pages.map((p) => ({
    pageId: p.id,
    pageName: p.name,
    cost: pageCost(p, rates, topRates, mobileMenuRate),
  }));

  const cmsCosts: EstimateCmsCost[] = pages
    .filter((p) => p.cmsTier)
    .map((p) => ({
      pageId: p.id,
      pageName: p.name,
      tier: p.cmsTier as string,
      cost: cmsCost(p, cmsRates),
    }));

  const pagesSubtotal =
    pageCosts.reduce((sum, p) => sum + p.cost, 0) + cmsCosts.reduce((sum, c) => sum + c.cost, 0);

  const lineItemsSubtotal = lineItems.reduce((sum, l) => sum + l.amount, 0);

  const subtotal = directionFee + pagesSubtotal + lineItemsSubtotal;
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  return {
    directionFee,
    pages: pageCosts,
    cmsCosts,
    pagesSubtotal,
    lineItems,
    lineItemsSubtotal,
    subtotal,
    taxRate,
    taxAmount,
    total,
    remarks,
  };
}
