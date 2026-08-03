import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";

// layout.tsxで無効なリンク・パスワード未照合の場合はここまで到達しない。
// 有効な場合は含まれる最初のセクションへリダイレクトする。
export default async function ShareRootPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);

  if (result.status !== "ok") {
    return null;
  }

  const { sections } = result.link;
  if (sections.directoryMap) redirect(`/share/${token}/directory-map`);
  if (sections.schedule) redirect(`/share/${token}/schedule`);
  if (sections.estimate) redirect(`/share/${token}/estimate`);
  if (sections.meta) redirect(`/share/${token}/meta`);

  return <p className="text-[13px] text-subtle">表示できるセクションがありません。</p>;
}
