"use client";

import { useState } from "react";
import type { EstimateResult } from "@/lib/estimate/calculate";
import type { AggregatedEstimateResult } from "@/lib/estimate/calculateAggregated";

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function SummaryFoot({
  subtotal,
  taxRate,
  taxAmount,
  total,
}: {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}) {
  return (
    <tfoot>
      <tr className="border-b border-border">
        <td className="px-2 py-1.5 text-muted">小計（税抜）</td>
        <td className="px-2 py-1.5 text-right text-muted">{yen(subtotal)}</td>
      </tr>
      <tr className="border-b border-border">
        <td className="px-2 py-1.5 text-muted">消費税（{Math.round(taxRate * 100)}%）</td>
        <td className="px-2 py-1.5 text-right text-muted">{yen(taxAmount)}</td>
      </tr>
      <tr>
        <td className="px-2 py-2 text-[15px] font-bold text-navy">合計（税込）</td>
        <td className="px-2 py-2 text-right text-[15px] font-bold text-navy">{yen(total)}</td>
      </tr>
    </tfoot>
  );
}

function TableHead({ withQuantity }: { withQuantity?: boolean }) {
  return (
    <thead>
      <tr>
        <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
          項目
        </th>
        {withQuantity && (
          <>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-right font-label text-[11px] uppercase tracking-wide text-muted">
              数量
            </th>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-right font-label text-[11px] uppercase tracking-wide text-muted">
              単価
            </th>
          </>
        )}
        <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-right font-label text-[11px] uppercase tracking-wide text-muted">
          金額
        </th>
      </tr>
    </thead>
  );
}

function DetailedTable({ estimate }: { estimate: EstimateResult }) {
  return (
    <table className="w-full min-w-[480px] border-collapse text-[13px]">
      <TableHead />
      <tbody>
        <tr className="border-b border-border">
          <td className="px-2 py-1.5 font-semibold">①ディレクション費</td>
          <td className="px-2 py-1.5 text-right">{yen(estimate.directionFee)}</td>
        </tr>
        {estimate.pages.map((p) => (
          <tr key={p.pageId} className="border-b border-border">
            <td className="px-2 py-1.5">②{p.pageName}</td>
            <td className="px-2 py-1.5 text-right">{yen(p.cost)}</td>
          </tr>
        ))}
        {estimate.cmsCosts.map((c) => (
          <tr key={`cms-${c.pageId}`} className="border-b border-border">
            <td className="px-2 py-1.5">
              ②{c.pageName} CMS構築{c.tier}
            </td>
            <td className="px-2 py-1.5 text-right">{yen(c.cost)}</td>
          </tr>
        ))}
        {estimate.lineItems.map((l) => (
          <tr key={l.id} className="border-b border-border">
            <td className="px-2 py-1.5">③{l.label}</td>
            <td className="px-2 py-1.5 text-right">{yen(l.amount)}</td>
          </tr>
        ))}
      </tbody>
      <SummaryFoot
        subtotal={estimate.subtotal}
        taxRate={estimate.taxRate}
        taxAmount={estimate.taxAmount}
        total={estimate.total}
      />
    </table>
  );
}

function AggregatedTable({ aggregated }: { aggregated: AggregatedEstimateResult }) {
  return (
    <table className="w-full min-w-[560px] border-collapse text-[13px]">
      <TableHead withQuantity />
      <tbody>
        <tr className="border-b border-border">
          <td className="px-2 py-1.5 font-semibold">①全体ディレクション【進行・管理】</td>
          <td className="px-2 py-1.5 text-right">
            {aggregated.directionMonths} ヶ月
          </td>
          <td className="px-2 py-1.5 text-right">{yen(aggregated.directionMonthlyRate)}</td>
          <td className="px-2 py-1.5 text-right">{yen(aggregated.directionFee)}</td>
        </tr>
        {aggregated.topLines.map((line, i) => (
          <tr key={`top-${i}`} className="border-b border-border">
            <td className="px-2 py-1.5">②{line.label}</td>
            <td className="px-2 py-1.5 text-right">
              {line.quantity} {line.unit}
            </td>
            <td className="px-2 py-1.5 text-right">{yen(line.unitPrice)}</td>
            <td className="px-2 py-1.5 text-right">{yen(line.amount)}</td>
          </tr>
        ))}
        {aggregated.tallyLines.map((line, i) => (
          <tr key={`tally-${i}`} className="border-b border-border">
            <td className="px-2 py-1.5">②{line.label}</td>
            <td className="px-2 py-1.5 text-right">
              {line.quantity} {line.unit}
            </td>
            <td className="px-2 py-1.5 text-right">{yen(line.unitPrice)}</td>
            <td className="px-2 py-1.5 text-right">{yen(line.amount)}</td>
          </tr>
        ))}
        {aggregated.cmsCosts.map((c) => (
          <tr key={`cms-${c.pageId}`} className="border-b border-border">
            <td className="px-2 py-1.5">
              ②{c.pageName} CMS構築{c.tier}
            </td>
            <td className="px-2 py-1.5 text-right">1 式</td>
            <td className="px-2 py-1.5 text-right">{yen(c.cost)}</td>
            <td className="px-2 py-1.5 text-right">{yen(c.cost)}</td>
          </tr>
        ))}
        {aggregated.testVerificationTotal > 0 && (
          <tr className="border-b border-border">
            <td className="px-2 py-1.5">②テスト検証</td>
            <td className="px-2 py-1.5 text-right">1 式</td>
            <td className="px-2 py-1.5 text-right">{yen(aggregated.testVerificationTotal)}</td>
            <td className="px-2 py-1.5 text-right">{yen(aggregated.testVerificationTotal)}</td>
          </tr>
        )}
        {aggregated.lineItems.map((l) => (
          <tr key={l.id} className="border-b border-border">
            <td className="px-2 py-1.5">③{l.label}</td>
            <td className="px-2 py-1.5 text-right" />
            <td className="px-2 py-1.5 text-right" />
            <td className="px-2 py-1.5 text-right">{yen(l.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-b border-border">
          <td colSpan={3} className="px-2 py-1.5 text-muted">
            小計（税抜）
          </td>
          <td className="px-2 py-1.5 text-right text-muted">{yen(aggregated.subtotal)}</td>
        </tr>
        <tr className="border-b border-border">
          <td colSpan={3} className="px-2 py-1.5 text-muted">
            消費税（{Math.round(aggregated.taxRate * 100)}%）
          </td>
          <td className="px-2 py-1.5 text-right text-muted">{yen(aggregated.taxAmount)}</td>
        </tr>
        <tr>
          <td colSpan={3} className="px-2 py-2 text-[15px] font-bold text-navy">
            合計（税込）
          </td>
          <td className="px-2 py-2 text-right text-[15px] font-bold text-navy">
            {yen(aggregated.total)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

export function EstimateTabs({
  estimate,
  aggregated,
}: {
  estimate: EstimateResult;
  aggregated: AggregatedEstimateResult;
}) {
  const [tab, setTab] = useState<"detailed" | "aggregated">("detailed");

  return (
    <div>
      <div className="mb-3 flex gap-1 border-b border-border">
        {(
          [
            { key: "detailed", label: "詳細見積もり" },
            { key: "aggregated", label: "集計見積もり" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-[13px] font-semibold ${
              tab === t.key
                ? "border-accent text-navy"
                : "border-transparent text-muted hover:no-underline"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="table-scroll overflow-x-auto">
        {tab === "detailed" ? (
          <DetailedTable estimate={estimate} />
        ) : (
          <AggregatedTable aggregated={aggregated} />
        )}
      </div>
    </div>
  );
}
