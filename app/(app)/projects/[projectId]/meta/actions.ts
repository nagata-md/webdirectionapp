"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PAGE_STATUSES } from "@/lib/pages/constants";
import { callClaudeForStructuredOutput } from "@/lib/ai/claudeClient";
import { buildMetaGenPrompt, META_GEN_TOOL, type MetaGenPageInput } from "@/lib/ai/metaPrompt";

export type MetaGenItem = {
  pageId: string;
  pageName: string;
  slug: string;
  title: string;
  description: string;
  keywords: string;
};

export type MetaGenState = {
  items: MetaGenItem[] | null;
  scope: "empty_only" | "all";
  instruction: string;
  error: string | null;
};

export async function saveMetaTable(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const pageIds = formData.getAll("pageId").map((v) => String(v));
  const supabase = await createClient();

  for (const pageId of pageIds) {
    const status = String(formData.get(`status.${pageId}`) ?? "未着手");
    const { error } = await supabase
      .from("pages")
      .update({
        slug: String(formData.get(`slug.${pageId}`) ?? "").trim() || null,
        title: String(formData.get(`title.${pageId}`) ?? "").trim() || null,
        description: String(formData.get(`description.${pageId}`) ?? "").trim() || null,
        keywords: String(formData.get(`keywords.${pageId}`) ?? "").trim() || null,
        due_date: String(formData.get(`dueDate.${pageId}`) ?? "").trim() || null,
        status: PAGE_STATUSES.includes(status as (typeof PAGE_STATUSES)[number])
          ? status
          : "未着手",
      })
      .eq("id", pageId);
    if (error) throw new Error(error.message);
  }

  redirect(`/projects/${projectId}/meta?saved=1`);
}

export async function generateMetaPreview(
  projectId: string,
  _prevState: MetaGenState,
  formData: FormData,
): Promise<MetaGenState> {
  const instruction = String(formData.get("instruction") ?? "").trim();
  const scope = (String(formData.get("scope") ?? "empty_only") === "all" ? "all" : "empty_only") as
    | "all"
    | "empty_only";

  if (!instruction) {
    return { items: null, scope, instruction, error: "指示文を入力してください" };
  }

  const supabase = await createClient();
  const { data: pagesRaw, error } = await supabase
    .from("pages")
    .select("id, name, type, parent_id, priority, slug, title, description, keywords")
    .eq("project_id", projectId);

  if (error) {
    return { items: null, scope, instruction, error: error.message };
  }

  const allPages = pagesRaw ?? [];
  const pageNameById = new Map(allPages.map((p) => [p.id, p.name]));

  const isEmpty = (p: (typeof allPages)[number]) =>
    !p.slug && !p.title && !p.description && !p.keywords;

  const targetPages = scope === "all" ? allPages : allPages.filter(isEmpty);

  if (targetPages.length === 0) {
    return {
      items: null,
      scope,
      instruction,
      error:
        scope === "empty_only"
          ? "未入力のページがありません（すべて入力済みです）"
          : "ページが登録されていません",
    };
  }

  const metaGenInput: MetaGenPageInput[] = targetPages.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    parentName: p.parent_id ? (pageNameById.get(p.parent_id) ?? null) : null,
    priority: p.priority,
  }));

  const { system, userMessage } = buildMetaGenPrompt(instruction, metaGenInput);

  try {
    const result = await callClaudeForStructuredOutput<{
      pages: { pageId: string; slug: string; title: string; description: string; keywords: string }[];
    }>({ system, userMessage, tool: META_GEN_TOOL });

    const items: MetaGenItem[] = result.pages.map((p) => ({
      pageId: p.pageId,
      pageName: pageNameById.get(p.pageId) ?? p.pageId,
      slug: p.slug,
      title: p.title,
      description: p.description,
      keywords: p.keywords,
    }));

    return { items, scope, instruction, error: null };
  } catch (e) {
    return {
      items: null,
      scope,
      instruction,
      error: e instanceof Error ? e.message : "AI生成に失敗しました",
    };
  }
}

export async function applyMetaPreview(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const instruction = String(formData.get("instruction") ?? "");
  const scope = String(formData.get("scope") ?? "empty_only");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const pageIds = formData.getAll("pageId").map((v) => String(v));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const pageId of pageIds) {
    const { error } = await supabase
      .from("pages")
      .update({
        slug: String(formData.get(`slug.${pageId}`) ?? "").trim() || null,
        title: String(formData.get(`title.${pageId}`) ?? "").trim() || null,
        description: String(formData.get(`description.${pageId}`) ?? "").trim() || null,
        keywords: String(formData.get(`keywords.${pageId}`) ?? "").trim() || null,
      })
      .eq("id", pageId);
    if (error) throw new Error(error.message);
  }

  const { error: logError } = await supabase.from("ai_meta_generation_logs").insert({
    project_id: projectId,
    instruction,
    scope,
    page_count: pageIds.length,
    generated_by: user?.id ?? null,
  });
  if (logError) throw new Error(logError.message);

  redirect(`/projects/${projectId}/meta?saved=1`);
}
