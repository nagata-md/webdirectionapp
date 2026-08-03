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
