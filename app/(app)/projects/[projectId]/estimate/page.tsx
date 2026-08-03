import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button, LinkButton } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProjectEstimate } from "@/lib/estimate/loadProjectEstimate";
import { LineItemsEditor } from "./LineItemsEditor";
import { issueEstimatePdf } from "./actions";

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export default async function EstimatePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [{ estimate }, { data: versionsRaw }] = await Promise.all([
    loadProjectEstimate(projectId),
    supabase
      .from("estimate_versions")
      .select("id, quote_number, issued_at, valid_until, estimate_data, pdf_url, created_by_email")
      .eq("project_id", projectId)
      .order("issued_at", { ascending: false }),
  ]);

  const admin = createAdminClient();
  const versions = await Promise.all(
    (versionsRaw ?? []).map(async (v) => {
      let signedUrl: string | null = null;
      if (v.pdf_url) {
        const { data } = await admin.storage
          .from("estimate-pdfs")
          .createSignedUrl(v.pdf_url, 60 * 10);
        signedUrl = data?.signedUrl ?? null;
      }
      const total = (v.estimate_data as { total?: number } | null)?.total ?? 0;
      return {
        id: v.id,
        quoteNumber: v.quote_number,
        issuedAt: v.issued_at,
        validUntil: v.valid_until,
        total,
        createdByEmail: v.created_by_email,
        signedUrl,
      };
    }),
  );

  return (
    <div>
      <Panel className="mb-4">
        <SectionLabel>見積もり</SectionLabel>
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

        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href={`/projects/${projectId}/estimate/csv`}>CSVエクスポート</LinkButton>
          <form action={issueEstimatePdf}>
            <input type="hidden" name="projectId" value={projectId} readOnly />
            <Button type="submit" variant="primary">
              確定してPDF発行
            </Button>
          </form>
        </div>
      </Panel>

      <Panel className="mb-4">
        <SectionLabel>③追加項目（素材費・値引き等）</SectionLabel>
        <LineItemsEditor
          projectId={projectId}
          initialItems={estimate.lineItems.map((l) => ({ label: l.label, amount: l.amount }))}
        />
      </Panel>

      <Panel>
        <SectionLabel>発行済み見積書</SectionLabel>
        {versions.length === 0 && (
          <p className="text-[13px] text-subtle">まだ見積書は発行されていません</p>
        )}
        {versions.length > 0 && (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    見積番号
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    発行日
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    有効期限
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-right font-label text-[11px] uppercase tracking-wide text-muted">
                    合計金額
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    発行者
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted" />
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} className="border-b border-border">
                    <td className="px-2 py-1.5">{v.quoteNumber}</td>
                    <td className="px-2 py-1.5">{v.issuedAt?.slice(0, 10)}</td>
                    <td className="px-2 py-1.5">{v.validUntil}</td>
                    <td className="px-2 py-1.5 text-right">{yen(v.total)}</td>
                    <td className="px-2 py-1.5">{v.createdByEmail ?? "-"}</td>
                    <td className="px-2 py-1.5">
                      {v.signedUrl && (
                        <LinkButton href={v.signedUrl} target="_blank" rel="noopener noreferrer">
                          PDFダウンロード
                        </LinkButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
