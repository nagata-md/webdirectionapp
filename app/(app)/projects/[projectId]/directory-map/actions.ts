"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDescendant } from "@/lib/pages/constants";

function num(formData: FormData, key: string): number {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : 0;
}

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

  const supabase = await createClient();
  const { error } = await supabase.from("pages").insert({
    project_id: projectId,
    name,
    type: String(formData.get("type") ?? "other"),
    complexity: String(formData.get("complexity") ?? "M"),
    parent_id: nullableId(formData, "parentId"),
    wire_needed: formData.get("wireNeeded") === "on",
    copy_needed: formData.get("copyNeeded") === "on",
    cms_tier: nullableCmsTier(formData),
    mobile_menu_needed: formData.get("mobileMenuNeeded") === "on",
    group_id: nullableId(formData, "groupId"),
    priority: num(formData, "priority"),
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
      cms_tier: nullableCmsTier(formData),
      mobile_menu_needed: formData.get("mobileMenuNeeded") === "on",
      group_id: nullableId(formData, "groupId"),
      priority: num(formData, "priority"),
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
