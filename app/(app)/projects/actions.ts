"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PROGRESS_GROUPS } from "@/lib/pages/defaultGroups";

export async function createProject(formData: FormData) {
  const projectName = String(formData.get("projectName") ?? "").trim();
  if (!projectName) {
    throw new Error("プロジェクト名は必須です");
  }
  const clientName = String(formData.get("clientName") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      project_name: projectName,
      client_name: clientName || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "プロジェクトの作成に失敗しました");
  }

  const { error: groupsError } = await supabase.from("progress_groups").insert(
    DEFAULT_PROGRESS_GROUPS.map((name, index) => ({
      project_id: data.id,
      name,
      sort_order: index + 1,
    })),
  );
  if (groupsError) throw new Error(groupsError.message);

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function deleteProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) {
    throw new Error("プロジェクトIDが指定されていません");
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) <= 1) {
    throw new Error("最後の1件のプロジェクトは削除できません");
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  redirect("/projects?saved=1");
}

export async function archiveProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  redirect(`/projects/${projectId}?saved=1`);
}

export async function unarchiveProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ archived_at: null })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  redirect(`/projects/${projectId}?saved=1`);
}

// プロジェクトの複製（Phase 12、新規要件）。ディレクトリマップ（ページ・進行グループ）・
// 自社担当者・サーバー情報リンク/Figmaリンクは複製するが、スケジュールの手動オーバーライド・
// 確定済み見積書・メタ情報（slug/title/description/keywords/due_date/status）・見積もりの
// 追加項目/備考・共有リンクは複製しない。
export async function copyProject(formData: FormData) {
  const sourceProjectId = String(formData.get("projectId") ?? "");
  if (!sourceProjectId) throw new Error("プロジェクトIDが指定されていません");

  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("projects")
    .select("project_name, client_name, start_date, parallel_by_phase")
    .eq("id", sourceProjectId)
    .single();
  if (sourceError || !source) {
    throw new Error(sourceError?.message ?? "コピー元のプロジェクトが見つかりません");
  }

  const { data: newProject, error: insertError } = await supabase
    .from("projects")
    .insert({
      project_name: `${source.project_name}のコピー`,
      client_name: source.client_name,
      start_date: source.start_date,
      parallel_by_phase: source.parallel_by_phase,
    })
    .select("id")
    .single();
  if (insertError || !newProject) {
    throw new Error(insertError?.message ?? "プロジェクトの複製に失敗しました");
  }
  const newProjectId = newProject.id as string;

  const [{ data: owners }, { data: links }, { data: groups }, { data: pages }] = await Promise.all([
    supabase.from("project_owners").select("role, name").eq("project_id", sourceProjectId),
    supabase
      .from("project_links")
      .select("category, label, url, sort_order")
      .eq("project_id", sourceProjectId),
    supabase
      .from("progress_groups")
      .select("id, name, sort_order")
      .eq("project_id", sourceProjectId)
      .order("sort_order"),
    supabase
      .from("pages")
      .select(
        "id, name, type, complexity, parent_id, wire_needed, copy_needed, cms_tier, mobile_menu_needed, group_id, priority",
      )
      .eq("project_id", sourceProjectId),
  ]);

  if (owners && owners.length > 0) {
    const { error } = await supabase
      .from("project_owners")
      .insert(owners.map((o) => ({ project_id: newProjectId, role: o.role, name: o.name })));
    if (error) throw new Error(error.message);
  }

  if (links && links.length > 0) {
    const { error } = await supabase.from("project_links").insert(
      links.map((l) => ({
        project_id: newProjectId,
        category: l.category,
        label: l.label,
        url: l.url,
        sort_order: l.sort_order,
      })),
    );
    if (error) throw new Error(error.message);
  }

  // 進行グループ・ページはparent_id/group_idの旧→新ID対応が必要なため、
  // 1件ずつ挿入してIDマッピングを確実に取る（複数件一括insertは返却順序が保証されないため）。
  const groupIdMap = new Map<string, string>();
  for (const g of groups ?? []) {
    const { data: newGroup, error } = await supabase
      .from("progress_groups")
      .insert({ project_id: newProjectId, name: g.name, sort_order: g.sort_order })
      .select("id")
      .single();
    if (error || !newGroup) throw new Error(error?.message ?? "進行グループの複製に失敗しました");
    groupIdMap.set(g.id, newGroup.id as string);
  }

  const pageIdMap = new Map<string, string>();
  for (const p of pages ?? []) {
    const { data: newPage, error } = await supabase
      .from("pages")
      .insert({
        project_id: newProjectId,
        name: p.name,
        type: p.type,
        complexity: p.complexity,
        parent_id: null,
        wire_needed: p.wire_needed,
        copy_needed: p.copy_needed,
        cms_tier: p.cms_tier,
        mobile_menu_needed: p.mobile_menu_needed,
        group_id: p.group_id ? (groupIdMap.get(p.group_id) ?? null) : null,
        priority: p.priority,
      })
      .select("id")
      .single();
    if (error || !newPage) throw new Error(error?.message ?? "ページの複製に失敗しました");
    pageIdMap.set(p.id, newPage.id as string);
  }

  for (const p of pages ?? []) {
    if (!p.parent_id) continue;
    const newPageId = pageIdMap.get(p.id);
    const newParentId = pageIdMap.get(p.parent_id);
    if (!newPageId || !newParentId) continue;
    const { error } = await supabase
      .from("pages")
      .update({ parent_id: newParentId })
      .eq("id", newPageId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/projects");
  redirect(`/projects/${newProjectId}`);
}

export async function updateProjectBasicInfo(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const projectName = String(formData.get("projectName") ?? "").trim();
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");
  if (!projectName) throw new Error("プロジェクト名は必須です");

  const clientName = String(formData.get("clientName") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      project_name: projectName,
      client_name: clientName || null,
      start_date: startDate || null,
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  redirect(`/projects/${projectId}?saved=1`);
}

export async function saveOwners(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const ownersRaw = formData.get("owners");
  const owners: { role: string; name: string }[] = ownersRaw
    ? JSON.parse(String(ownersRaw))
    : [];

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("project_owners")
    .delete()
    .eq("project_id", projectId);
  if (deleteError) throw new Error(deleteError.message);

  const rows = owners
    .filter((o) => o.role.trim() && o.name.trim())
    .map((o) => ({ project_id: projectId, role: o.role.trim(), name: o.name.trim() }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("project_owners").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  redirect(`/projects/${projectId}?saved=1`);
}

export async function saveProjectLinks(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const category = String(formData.get("category") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");
  if (category !== "server" && category !== "figma") {
    throw new Error("不正なリンク種別です");
  }

  const linksRaw = formData.get("links");
  const links: { label: string; url: string }[] = linksRaw ? JSON.parse(String(linksRaw)) : [];

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("project_links")
    .delete()
    .eq("project_id", projectId)
    .eq("category", category);
  if (deleteError) throw new Error(deleteError.message);

  const rows = links
    .filter((l) => l.label.trim() && l.url.trim())
    .map((l, index) => ({
      project_id: projectId,
      category,
      label: l.label.trim(),
      url: l.url.trim(),
      sort_order: index,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("project_links").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  redirect(`/projects/${projectId}?saved=1`);
}
