"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 運用者専用メモ（Phase 12、新規要件）。ログ形式（追記・削除のみ、保存後の編集は不可）で、
// 共有リンクの対象セクションには一切含めない。
export async function addMemo(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");
  if (!content) throw new Error("メモ内容を入力してください");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("project_memos").insert({
    project_id: projectId,
    author_email: user?.email ?? "不明",
    content,
  });
  if (error) throw new Error(error.message);

  redirect(`/projects/${projectId}/memo?saved=1`);
}

export async function deleteMemo(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const memoId = String(formData.get("memoId") ?? "");
  if (!projectId || !memoId) throw new Error("IDが指定されていません");

  const supabase = await createClient();
  const { error } = await supabase.from("project_memos").delete().eq("id", memoId);
  if (error) throw new Error(error.message);

  redirect(`/projects/${projectId}/memo?saved=1`);
}
