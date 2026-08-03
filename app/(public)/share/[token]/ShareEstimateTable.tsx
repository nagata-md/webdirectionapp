import type { EstimateResult } from "@/lib/estimate/calculate";

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function ShareEstimateTable({ estimate }: { estimate: EstimateResult }) {
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
              項目
            </th>
            <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-right font-label text-[11px] uppercase tracking-wide text-muted">
              金額
            </th>
          </tr>
        </thead>
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
          {estimate.lineItems.map((l) => (
            <tr key={l.id} className="border-b border-border">
              <td className="px-2 py-1.5">③{l.label}</td>
              <td className="px-2 py-1.5 text-right">{yen(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-b border-border">
            <td className="px-2 py-1.5 text-muted">小計（税抜）</td>
            <td className="px-2 py-1.5 text-right text-muted">{yen(estimate.subtotal)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="px-2 py-1.5 text-muted">
              消費税（{Math.round(estimate.taxRate * 100)}%）
            </td>
            <td className="px-2 py-1.5 text-right text-muted">{yen(estimate.taxAmount)}</td>
          </tr>
          <tr>
            <td className="px-2 py-2 text-[15px] font-bold text-navy">合計（税込）</td>
            <td className="px-2 py-2 text-right text-[15px] font-bold text-navy">
              {yen(estimate.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
