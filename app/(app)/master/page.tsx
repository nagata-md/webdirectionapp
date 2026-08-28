import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { SavedBanner } from "@/components/ui/SavedBanner";
import { COMPLEXITIES, COST_PHASES, SCHEDULE_PHASES, SECOND_DRAFT_PHASES } from "@/lib/master/constants";
import { getAiKeyStatus, getMasterSettings, getStampSignedUrl } from "@/lib/master/data";
import { HolidaysEditor } from "./HolidaysEditor";
import { ImpactAwareSubmitButton } from "./ImpactAwareSubmitButton";
import {
  saveAiSettings,
  saveDirectionAndTax,
  saveIssuerInfo,
  saveScheduleMaster,
  syncPublicHolidays,
} from "./actions";

const numberInputClass =
  "w-20 rounded-control border border-border-strong px-1.5 py-1 text-[13px]";

export default async function MasterPage() {
  const master = await getMasterSettings();
  const aiStatus = await getAiKeyStatus();
  const stampUrl = master.issuer_stamp_image_url
    ? await getStampSignedUrl(master.issuer_stamp_image_url)
    : null;

  return (
    <div>
      <PageHeader title="マスタ設定" eyebrow="MASTER" />
      <Suspense fallback={null}>
        <SavedBanner />
      </Suspense>

      <Panel className="mb-4">
        <SectionLabel>単価・工数マスタ</SectionLabel>
        <form action={saveScheduleMaster}>
          <div className="mb-5 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    複雑度
                  </th>
                  {COST_PHASES.map((phase) => (
                    <th
                      key={phase}
                      colSpan={2}
                      className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted"
                    >
                      {phase}（日数/単価）
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPLEXITIES.map((complexity) => (
                  <tr key={complexity} className="border-b border-border">
                    <td className="px-2 py-1.5 font-semibold">{complexity}</td>
                    {COST_PHASES.map((phase) => {
                      const entry = master.rates?.[complexity]?.[phase];
                      return (
                        <td key={phase} colSpan={2} className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.5"
                              name={`rates.${complexity}.${phase}.days`}
                              defaultValue={entry?.days ?? 0}
                              className={numberInputClass}
                              aria-label={`${complexity} ${phase} 日数`}
                            />
                            <input
                              type="number"
                              step="1"
                              name={`rates.${complexity}.${phase}.cost`}
                              defaultValue={entry?.cost ?? 0}
                              className={numberInputClass}
                              aria-label={`${complexity} ${phase} 単価`}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionLabel>TOP専用単価・工数マスタ</SectionLabel>
          <div className="mb-5 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    複雑度
                  </th>
                  {COST_PHASES.map((phase) => (
                    <th
                      key={phase}
                      colSpan={2}
                      className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted"
                    >
                      {phase}（日数/単価）
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPLEXITIES.map((complexity) => (
                  <tr key={complexity} className="border-b border-border">
                    <td className="px-2 py-1.5 font-semibold">{complexity}</td>
                    {COST_PHASES.map((phase) => {
                      const entry = master.top_rates?.[complexity]?.[phase];
                      return (
                        <td key={phase} colSpan={2} className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.5"
                              name={`topRates.${complexity}.${phase}.days`}
                              defaultValue={entry?.days ?? 0}
                              className={numberInputClass}
                              aria-label={`TOP ${complexity} ${phase} 日数`}
                            />
                            <input
                              type="number"
                              step="1"
                              name={`topRates.${complexity}.${phase}.cost`}
                              defaultValue={entry?.cost ?? 0}
                              className={numberInputClass}
                              aria-label={`TOP ${complexity} ${phase} 単価`}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionLabel>CMS構築費マスタ</SectionLabel>
          <div className="mb-5 overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    複雑度
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    日数
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    単価
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPLEXITIES.map((complexity) => {
                  const entry = master.cms_rates?.[complexity];
                  return (
                    <tr key={complexity} className="border-b border-border">
                      <td className="px-2 py-1.5 font-semibold">CMS構築{complexity}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.5"
                          name={`cmsRates.${complexity}.days`}
                          defaultValue={entry?.days ?? 0}
                          className={numberInputClass}
                          aria-label={`CMS構築${complexity} 日数`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="1"
                          name={`cmsRates.${complexity}.cost`}
                          defaultValue={entry?.cost ?? 0}
                          className={numberInputClass}
                          aria-label={`CMS構築${complexity} 単価`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <SectionLabel>標準待機日数</SectionLabel>
          <div className="mb-5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    スケジュール工程
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    チェックバック日数
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    2校作業日数
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    2校チェックバック日数
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    バッファ日数
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCHEDULE_PHASES.map((phase) => {
                  const standard = master.standards?.[phase];
                  const hasSecondDraft = (SECOND_DRAFT_PHASES as readonly string[]).includes(phase);
                  return (
                    <tr key={phase} className="border-b border-border">
                      <td className="px-2 py-1.5 font-semibold">{phase}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          name={`standards.${phase}.checkback`}
                          defaultValue={standard?.checkback ?? 0}
                          className={numberInputClass}
                          aria-label={`${phase} チェックバック日数`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {hasSecondDraft ? (
                          <input
                            type="number"
                            name={`standards.${phase}.secondDraftDays`}
                            defaultValue={standard?.secondDraftDays ?? 0}
                            className={numberInputClass}
                            aria-label={`${phase} 2校作業日数`}
                          />
                        ) : (
                          <span className="text-subtle">―</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {hasSecondDraft ? (
                          <input
                            type="number"
                            name={`standards.${phase}.secondCheckbackDays`}
                            defaultValue={standard?.secondCheckbackDays ?? 0}
                            className={numberInputClass}
                            aria-label={`${phase} 2校チェックバック日数`}
                          />
                        ) : (
                          <span className="text-subtle">―</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          name={`standards.${phase}.buffer`}
                          defaultValue={standard?.buffer ?? 0}
                          className={numberInputClass}
                          aria-label={`${phase} バッファ日数`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mb-5 text-[12px] text-subtle">
            2校期間（作業日数・チェックバック日数）は構成・デザイン・コーディング・テストアップの4工程にのみ適用されます（CMS構築・公開は対象外）。
          </p>

          <ImpactAwareSubmitButton />
        </form>
      </Panel>

      <Panel className="mb-4">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>休日カレンダー・定休日</SectionLabel>
          <form action={syncPublicHolidays}>
            <Button type="submit">祝日を自動取得（未登録分のみ追加）</Button>
          </form>
        </div>
        <HolidaysEditor
          initialHolidays={master.holidays ?? []}
          initialWeeklyOff={master.weekly_off ?? [0, 6]}
        />
      </Panel>

      <Panel className="mb-4">
        <SectionLabel>月額ディレクション費・消費税率・スマホ対応メニュー単価</SectionLabel>
        <form action={saveDirectionAndTax} className="flex flex-wrap gap-6">
          <FormRow label="月額ディレクション費（円）" htmlFor="directionMonthlyRate">
            <input
              id="directionMonthlyRate"
              type="number"
              name="directionMonthlyRate"
              defaultValue={master.direction_monthly_rate}
              className="w-40 rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </FormRow>
          <FormRow label="消費税率（%）" htmlFor="taxRatePercent">
            <input
              id="taxRatePercent"
              type="number"
              step="0.1"
              name="taxRatePercent"
              defaultValue={Math.round(master.tax_rate * 1000) / 10}
              className="w-32 rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </FormRow>
          <FormRow label="スマホ対応メニュー（メガメニュー）単価（円）" htmlFor="mobileMenuRate">
            <input
              id="mobileMenuRate"
              type="number"
              name="mobileMenuRate"
              defaultValue={master.mobile_menu_rate}
              className="w-40 rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </FormRow>
          <div className="flex items-end">
            <ImpactAwareSubmitButton />
          </div>
        </form>
      </Panel>

      <Panel className="mb-4">
        <SectionLabel>発行元情報（見積書PDF用）</SectionLabel>
        <form action={saveIssuerInfo} encType="multipart/form-data">
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <FormRow label="会社名" htmlFor="issuerCompanyName">
              <input
                id="issuerCompanyName"
                type="text"
                name="issuerCompanyName"
                defaultValue={master.issuer_company_name ?? ""}
                className="w-full rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
              />
            </FormRow>
            <FormRow label="電話番号" htmlFor="issuerPhone">
              <input
                id="issuerPhone"
                type="text"
                name="issuerPhone"
                defaultValue={master.issuer_phone ?? ""}
                className="w-full rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
              />
            </FormRow>
          </div>
          <FormRow label="住所" htmlFor="issuerAddress">
            <input
              id="issuerAddress"
              type="text"
              name="issuerAddress"
              defaultValue={master.issuer_address ?? ""}
              className="w-full rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </FormRow>
          <FormRow label="見積書の有効期限（発行日からの日数）" htmlFor="estimateValidityDays">
            <input
              id="estimateValidityDays"
              type="number"
              name="estimateValidityDays"
              defaultValue={master.estimate_validity_days}
              className="w-32 rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </FormRow>
          <FormRow label="角印画像" htmlFor="stampImage">
            {stampUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stampUrl} alt="登録済みの角印画像" className="mb-2 h-20 w-20 object-contain" />
            )}
            <input id="stampImage" type="file" name="stampImage" accept="image/*" />
          </FormRow>
          <Button type="submit" variant="primary">
            保存
          </Button>
        </form>
      </Panel>

      <Panel>
        <SectionLabel>AI連携設定</SectionLabel>
        <form action={saveAiSettings}>
          <FormRow label="Claude APIキー">
            <p className="mb-2 text-[13px] text-muted">
              {aiStatus.configured ? `設定済み（${aiStatus.masked}）` : "未設定"}
            </p>
            <input
              type="password"
              name="aiApiKey"
              placeholder="新しいAPIキーを入力（変更する場合のみ）"
              autoComplete="off"
              className="w-full max-w-md rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </FormRow>
          <FormRow label="使用モデル名" htmlFor="aiModel">
            <input
              id="aiModel"
              type="text"
              name="aiModel"
              placeholder="例: claude-sonnet-5"
              defaultValue={master.ai_model ?? ""}
              className="w-full max-w-md rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
            />
          </FormRow>
          <Button type="submit" variant="primary">
            保存
          </Button>
        </form>
      </Panel>
    </div>
  );
}
