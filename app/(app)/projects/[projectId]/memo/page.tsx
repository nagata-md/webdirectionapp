import { Panel, SectionLabel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { addMemo } from "./actions";
import { DeleteMemoForm } from "./DeleteMemoForm";

export default async function MemoPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: memos } = await supabase
    .from("project_memos")
    .select("id, author_email, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <Panel className="mb-4">
        <SectionLabel>メモを追加</SectionLabel>
        <p className="mb-2 text-[12px] text-subtle">
          このメモは社内の運用者（ログイン中のチームメンバー）のみが閲覧できます。外部共有リンクには一切表示されません。
        </p>
        <form action={addMemo} className="flex flex-col gap-2">
          <input type="hidden" name="projectId" value={projectId} readOnly />
          <textarea
            name="content"
            rows={3}
            required
            placeholder="メモ内容を入力"
            className="w-full resize-y rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
          />
          <div>
            <Button type="submit" variant="primary">
              保存
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionLabel>メモ履歴</SectionLabel>
        {(memos ?? []).length === 0 && (
          <p className="text-[13px] text-subtle">まだメモは登録されていません</p>
        )}
        <div className="flex flex-col gap-3">
          {(memos ?? []).map((memo) => (
            <div key={memo.id} className="rounded-panel border border-border-strong p-3.5 text-[13px]">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-subtle">
                <span>
                  {memo.author_email} ・ {new Date(memo.created_at).toLocaleString("ja-JP")}
                </span>
                <DeleteMemoForm projectId={projectId} memoId={memo.id} />
              </div>
              <p className="whitespace-pre-wrap">{memo.content}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
