import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isShareLinkExpired } from "./expiry";

export type ShareLinkSections = {
  estimate: boolean;
  directoryMap: boolean;
  schedule: boolean;
  meta: boolean;
};

export type ShareLinkRow = {
  id: string;
  projectId: string;
  mode: "live" | "estimateVersion";
  estimateVersionId: string | null;
  sections: ShareLinkSections;
  passwordHash: string | null;
  viewCount: number;
};

export type ShareLinkStatus =
  | { status: "not_found" }
  | { status: "revoked" }
  | { status: "expired" }
  | { status: "ok"; link: ShareLinkRow };

// トークンから共有リンクを取得し、失効・期限切れを判定する（spec §4.10）。
// 共有閲覧画面のlayout/各セクションページの両方から呼ばれる想定。
export async function getShareLinkStatus(
  admin: SupabaseClient,
  token: string,
): Promise<ShareLinkStatus> {
  const { data: link } = await admin
    .from("share_links")
    .select(
      "id, project_id, mode, estimate_version_id, include_sections, password_hash, expires_at, revoked, view_count",
    )
    .eq("token", token)
    .maybeSingle();

  if (!link) return { status: "not_found" };
  if (link.revoked) return { status: "revoked" };
  if (isShareLinkExpired(link.expires_at)) return { status: "expired" };

  return {
    status: "ok",
    link: {
      id: link.id,
      projectId: link.project_id,
      mode: link.mode as "live" | "estimateVersion",
      estimateVersionId: link.estimate_version_id,
      sections: (link.include_sections as ShareLinkSections | null) ?? {
        estimate: false,
        directoryMap: false,
        schedule: false,
        meta: false,
      },
      passwordHash: link.password_hash,
      viewCount: link.view_count,
    },
  };
}
