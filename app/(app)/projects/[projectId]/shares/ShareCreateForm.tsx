"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createShareLink } from "./actions";

const inputClass = "rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]";

type EstimateVersionOption = { id: string; quoteNumber: string; issuedAt: string };

export function ShareCreateForm({
  projectId,
  estimateVersions,
}: {
  projectId: string;
  estimateVersions: EstimateVersionOption[];
}) {
  const [includeEstimate, setIncludeEstimate] = useState(true);
  const [mode, setMode] = useState<"live" | "estimateVersion">(
    estimateVersions.length > 0 ? "estimateVersion" : "live",
  );
  const [basicInfo, setBasicInfo] = useState<"none" | "public" | "full">("none");

  return (
    <form action={createShareLink} className="rounded-panel border border-border-strong p-4">
      <input type="hidden" name="projectId" value={projectId} readOnly />

      <div className="mb-3">
        <span className="mb-1 block text-[12px] font-semibold text-muted">公開セクション</span>
        <div className="flex flex-wrap gap-4 text-[13px]">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              name="section.basicInfoPublic"
              checked={basicInfo === "public"}
              onChange={(e) => setBasicInfo(e.target.checked ? "public" : "none")}
            />
            基本情報（秘密情報なし）
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              name="section.basicInfoFull"
              checked={basicInfo === "full"}
              onChange={(e) => setBasicInfo(e.target.checked ? "full" : "none")}
            />
            基本情報（秘密情報あり・開発サポート者用）
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              name="section.estimate"
              defaultChecked
              onChange={(e) => setIncludeEstimate(e.target.checked)}
            />
            見積もり
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="section.directoryMap" defaultChecked />
            ディレクトリマップ
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="section.schedule" defaultChecked />
            スケジュール
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="section.meta" />
            メタ情報
          </label>
        </div>
        <p className="mt-1 text-[12px] text-subtle">
          基本情報は「秘密情報なし」（プロジェクト名・クライアント名・着手日のみ）と「秘密情報あり」（自社担当者・サーバー情報リンク・Figmaリンクを含む全項目）のどちらか一方を選べます。
        </p>
      </div>

      {includeEstimate && (
        <div className="mb-3">
          <span className="mb-1 block text-[12px] font-semibold text-muted">
            見積もりセクションの表示モード
          </span>
          <div className="flex flex-wrap gap-4 text-[13px]">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="mode"
                value="estimateVersion"
                checked={mode === "estimateVersion"}
                disabled={estimateVersions.length === 0}
                onChange={() => setMode("estimateVersion")}
              />
              発行済み見積書バージョンを固定表示
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="mode"
                value="live"
                checked={mode === "live"}
                onChange={() => setMode("live")}
              />
              常に最新（ライブ）
            </label>
          </div>
          {estimateVersions.length === 0 && (
            <p className="mt-1 text-[12px] text-subtle">
              このプロジェクトはまだ見積書が発行されていないため、バージョン固定表示は選択できません。「見積もり」タブから発行してください。
            </p>
          )}
          {mode === "estimateVersion" && estimateVersions.length > 0 && (
            <select name="estimateVersionId" defaultValue={estimateVersions[0].id} className={`${inputClass} mt-2`}>
              {estimateVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.quoteNumber}（{v.issuedAt.slice(0, 10)}発行）
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted">
            パスワード（任意）
          </label>
          <input type="text" name="password" placeholder="未設定の場合は誰でも閲覧可能" className={`${inputClass} w-56`} />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted">
            有効期限（日数）
          </label>
          <input type="number" name="expiresInDays" defaultValue={90} className={`${inputClass} w-24`} />
        </div>
      </div>

      <Button type="submit" variant="primary">
        共有リンクを発行
      </Button>
    </form>
  );
}
