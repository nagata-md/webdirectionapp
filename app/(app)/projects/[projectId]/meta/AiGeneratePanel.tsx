"use client";

import { useActionState } from "react";
import { applyMetaPreview, generateMetaPreview, type MetaGenState } from "./actions";
import { Button } from "@/components/ui/Button";

const cellInputClass =
  "w-full rounded-control border border-border-strong px-2 py-1 text-[12px]";
const cellTextareaClass = `${cellInputClass} resize-y`;

export function AiGeneratePanel({
  projectId,
  initialInstruction,
}: {
  projectId: string;
  initialInstruction: string;
}) {
  const boundGenerate = generateMetaPreview.bind(null, projectId);
  const initialState: MetaGenState = {
    items: null,
    scope: "empty_only",
    instruction: initialInstruction,
    error: null,
  };
  const [state, formAction, isPending] = useActionState(boundGenerate, initialState);

  return (
    <div>
      <form action={formAction} className="mb-4">
        <label className="mb-1 block text-[12px] font-semibold text-muted">
          サイト全体の方向性・トーン
        </label>
        <textarea
          name="instruction"
          rows={3}
          defaultValue={state.instruction}
          placeholder="例: BtoB向け、堅めのトーン、地域名を意識したキーワードを入れる"
          className="mb-2 w-full rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
        />
        <div className="mb-2 flex gap-4 text-[13px]">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="scope"
              value="empty_only"
              defaultChecked={state.scope !== "all"}
            />
            未入力ページのみ
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="radio" name="scope" value="all" defaultChecked={state.scope === "all"} />
            全ページ（既存値も上書き）
          </label>
        </div>
        {state.error && <p className="mb-2 text-[13px] text-danger">{state.error}</p>}
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "生成中…" : "生成"}
        </Button>
      </form>

      {state.items && state.items.length > 0 && (
        <form action={applyMetaPreview}>
          <input type="hidden" name="projectId" value={projectId} readOnly />
          <input type="hidden" name="instruction" value={state.instruction} readOnly />
          <input type="hidden" name="scope" value={state.scope} readOnly />

          <p className="mb-2 text-[13px] text-muted">
            生成結果（{state.items.length}件）。内容を確認・修正してから「反映」を押してください。
          </p>

          <div className="table-scroll mb-3 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    ページ
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    スラッグ
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    TITLE
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    ディスクリプション
                  </th>
                  <th className="border-b-2 border-navy bg-surface-subtle px-2 py-2 text-left font-label text-[11px] uppercase tracking-wide text-muted">
                    キーワード
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item) => (
                  <tr key={item.pageId} className="border-b border-border">
                    <td className="px-2 py-1.5 font-semibold">
                      <input type="hidden" name="pageId" value={item.pageId} />
                      {item.pageName}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        name={`slug.${item.pageId}`}
                        defaultValue={item.slug}
                        className={cellInputClass}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <textarea
                        name={`title.${item.pageId}`}
                        defaultValue={item.title}
                        rows={1}
                        className={cellTextareaClass}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <textarea
                        name={`description.${item.pageId}`}
                        defaultValue={item.description}
                        rows={1}
                        className={cellTextareaClass}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <textarea
                        name={`keywords.${item.pageId}`}
                        defaultValue={item.keywords}
                        rows={1}
                        className={cellTextareaClass}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="submit" variant="primary">
            反映
          </Button>
        </form>
      )}
    </div>
  );
}
