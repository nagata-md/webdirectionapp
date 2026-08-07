"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDescendant } from "@/lib/pages/constants";
import { reorderSiblingPriorities } from "@/lib/pages/reorder";

function nullableId(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function nullableCmsTier(formData: FormData): string | null {
  const value = String(formData.get("cmsTier") ?? "").trim();
  return value === "S" || value === "M" || value === "L" ? value : null;
}

export async function createPage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");
  if (!name) throw new Error("ページ名は必須です");

  const parentId = nullableId(formData, "parentId");

  const supabase = await createClient();

  // 新規ページのpriorityは常に「同じ親を持つ兄弟の末尾」に自動採番する（2026-08-07修正）。
  // 進行グループはスケジュールの起点を揃えるための分類であり表示順とは無関係なため
  // （2026-08-07ユーザー確定方針）、ここでは親（parent_id）のみでスコープする。
  let siblingsQuery = supabase.from("pages").select("priority").eq("project_id", projectId);
  siblingsQuery = parentId
    ? siblingsQuery.eq("parent_id", parentId)
    : siblingsQuery.is("parent_id", null);
  const { data: siblings, error: siblingsError } = await siblingsQuery;
  if (siblingsError) throw new Error(siblingsError.message);

  const nextPriority = (siblings ?? []).reduce((max, s) => Math.max(max, s.priority), 0) + 1;

  const { error } = await supabase.from("pages").insert({
    project_id: projectId,
    name,
    type: String(formData.get("type") ?? "other"),
    complexity: String(formData.get("complexity") ?? "M"),
    parent_id: parentId,
    wire_needed: formData.get("wireNeeded") === "on",
    copy_needed: formData.get("copyNeeded") === "on",
    design_needed: formData.get("designSkip") !== "on",
    coding_needed: formData.get("codingSkip") !== "on",
    cms_tier: nullableCmsTier(formData),
    mobile_menu_needed: formData.get("mobileMenuNeeded") === "on",
    group_id: nullableId(formData, "groupId"),
    priority: nextPriority,
  });

  if (error) throw new Error(error.message);

  redirect(`/projects/${projectId}/directory-map?saved=1`);
}

export async function updatePage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !pageId) throw new Error("IDが指定されていません");
  if (!name) throw new Error("ページ名は必須です");

  const parentId = nullableId(formData, "parentId");
  if (parentId === pageId) {
    throw new Error("自分自身を親ページにはできません");
  }

  const supabase = await createClient();

  if (parentId) {
    const { data: allPages } = await supabase
      .from("pages")
      .select("id, parent_id")
      .eq("project_id", projectId);
    if (isDescendant(allPages ?? [], pageId, parentId)) {
      throw new Error("自分の子孫ページを親ページにはできません");
    }
  }

  const { error } = await supabase
    .from("pages")
    .update({
      name,
      type: String(formData.get("type") ?? "other"),
      complexity: String(formData.get("complexity") ?? "M"),
      parent_id: parentId,
      wire_needed: formData.get("wireNeeded") === "on",
      copy_needed: formData.get("copyNeeded") === "on",
      design_needed: formData.get("designSkip") !== "on",
      coding_needed: formData.get("codingSkip") !== "on",
      cms_tier: nullableCmsTier(formData),
      mobile_menu_needed: formData.get("mobileMenuNeeded") === "on",
      group_id: nullableId(formData, "groupId"),
      // priorityは意図的に更新しない（2026-08-07廃止）。表示順は進行グループの並び順が
      // 最優先で、グループ内の細かい順序はドラッグ&ドロップ（reorderPages）でのみ変更する。
    })
    .eq("id", pageId);

  if (error) throw new Error(error.message);

  redirect(`/projects/${projectId}/directory-map?saved=1`);
}

export async function deletePage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  if (!projectId || !pageId) throw new Error("IDが指定されていません");

  const supabase = await createClient();
  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  if (error) throw new Error(error.message);

  redirect(`/projects/${projectId}/directory-map?saved=1`);
}

export async function saveGroups(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const groupsRaw = formData.get("groups");
  const groups: { id: string | null; name: string }[] = groupsRaw
    ? JSON.parse(String(groupsRaw))
    : [];

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("progress_groups")
    .select("id")
    .eq("project_id", projectId);
  if (existingError) throw new Error(existingError.message);

  const existingIds = new Set((existing ?? []).map((g) => g.id as string));
  const submittedIds = new Set(groups.filter((g) => g.id).map((g) => g.id as string));

  const toDelete = [...existingIds].filter((id) => !submittedIds.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("progress_groups")
      .delete()
      .in("id", toDelete);
    if (deleteError) throw new Error(deleteError.message);
  }

  let sortOrder = 1;
  for (const group of groups) {
    const trimmedName = group.name.trim();
    if (!trimmedName) continue;

    if (group.id) {
      const { error } = await supabase
        .from("progress_groups")
        .update({ name: trimmedName, sort_order: sortOrder })
        .eq("id", group.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("progress_groups").insert({
        project_id: projectId,
        name: trimmedName,
        sort_order: sortOrder,
      });
      if (error) throw new Error(error.message);
    }
    sortOrder += 1;
  }

  redirect(`/projects/${projectId}/directory-map?saved=1`);
}

// ドラッグ&ドロップによるページの並び替え（2026-08-07新規要件）。
// 同じ親（兄弟ページ）の範囲内でのみpriorityを振り直すため、親子階層は自動的にセットで動く。
// クライアントからフォーム送信ではなく直接呼び出されるため、redirectはせずrevalidatePathのみ行う。
export async function reorderPages(
  projectId: string,
  parentId: string | null,
  orderedIds: string[],
) {
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const supabase = await createClient();
  const { data: allPages, error: fetchError } = await supabase
    .from("pages")
    .select("id, parent_id")
    .eq("project_id", projectId);
  if (fetchError) throw new Error(fetchError.message);

  const newPriorities = reorderSiblingPriorities(allPages ?? [], parentId, orderedIds);

  const results = await Promise.all(
    [...newPriorities.entries()].map(([id, priority]) =>
      supabase.from("pages").update({ priority }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath(`/projects/${projectId}/directory-map`);
  revalidatePath(`/projects/${projectId}/estimate`);
}
