"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateShareToken } from "@/lib/share/token";
import { hashSharePassword } from "@/lib/share/password";

export type ShareSections = {
  basicInfoPublic: boolean;
  basicInfoFull: boolean;
  estimate: boolean;
  directoryMap: boolean;
  schedule: boolean;
  meta: boolean;
};

export async function createShareLink(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("projectId"));

  const basicInfoFull = formData.get("section.basicInfoFull") === "on";
  const sections: ShareSections = {
    // basicInfoFullが含まれる場合はbasicInfoPublicの内容も包含するため、
    // 二重にフラグを立てず片方に一本化する（spec §4.10）
    basicInfoPublic: !basicInfoFull && formData.get("section.basicInfoPublic") === "on",
    basicInfoFull,
    estimate: formData.get("section.estimate") === "on",
    directoryMap: formData.get("section.directoryMap") === "on",
    schedule: formData.get("section.schedule") === "on",
    meta: formData.get("section.meta") === "on",
  };

  const hasAnySection = Object.values(sections).some(Boolean);
  if (!hasAnySection) {
    throw new Error("少なくとも1つのセクションを選択してください");
  }

  const modeRaw = String(formData.get("mode") ?? "live");
  const mode = modeRaw === "estimateVersion" ? "estimateVersion" : "live";
  const estimateVersionId = String(formData.get("estimateVersionId") ?? "").trim() || null;

  if (sections.estimate && mode === "estimateVersion" && !estimateVersionId) {
    throw new Error("見積バージョンを選択してください");
  }

  const password = String(formData.get("password") ?? "").trim();
  const expiresInDays = Number(formData.get("expiresInDays")) || 90;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("share_links").insert({
    project_id: projectId,
    token: generateShareToken(),
    mode: sections.estimate ? mode : "live",
    estimate_version_id: sections.estimate && mode === "estimateVersion" ? estimateVersionId : null,
    include_sections: sections,
    password_hash: password ? hashSharePassword(password) : null,
    expires_at: expiresAt,
    created_by: user?.id ?? null,
    created_by_email: user?.email ?? null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/shares`);
  redirect(`/projects/${projectId}/shares?saved=1`);
}

export async function revokeShareLink(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("projectId"));
  const shareId = String(formData.get("shareId"));

  const { error } = await supabase
    .from("share_links")
    .update({ revoked: true })
    .eq("id", shareId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}/shares`);
  redirect(`/projects/${projectId}/shares?saved=1`);
}
