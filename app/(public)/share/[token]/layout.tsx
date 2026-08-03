import { cookies } from "next/headers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";
import { isSharePasswordVerified, sharePasswordCookieName } from "@/lib/share/passwordCookie";
import { ShareTabs } from "./ShareTabs";
import { PasswordGate } from "./PasswordGate";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 flex-1 p-4 md:p-8">{children}</div>;
}

export default async function ShareLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);

  if (result.status === "not_found") {
    return (
      <Shell>
        <Panel>
          <p className="text-[13px] text-danger">このリンクは存在しません。URLをご確認ください。</p>
        </Panel>
      </Shell>
    );
  }
  if (result.status === "revoked") {
    return (
      <Shell>
        <Panel>
          <p className="text-[13px] text-danger">このリンクは発行者により失効されています。</p>
        </Panel>
      </Shell>
    );
  }
  if (result.status === "expired") {
    return (
      <Shell>
        <Panel>
          <p className="text-[13px] text-danger">このリンクの有効期限が切れています。</p>
        </Panel>
      </Shell>
    );
  }

  const { link } = result;

  if (link.passwordHash) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(sharePasswordCookieName(token))?.value;
    if (!isSharePasswordVerified(token, cookieValue)) {
      return (
        <Shell>
          <PasswordGate token={token} />
        </Shell>
      );
    }
  }

  await admin
    .from("share_links")
    .update({ view_count: link.viewCount + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", link.id);

  const { data: project } = await admin
    .from("projects")
    .select("project_name, client_name")
    .eq("id", link.projectId)
    .single();

  return (
    <Shell>
      <PageHeader title={project?.project_name ?? ""} eyebrow="共有ビュー" />
      {project?.client_name && (
        <p className="-mt-3 mb-5 text-[13px] text-subtle">{project.client_name} 様</p>
      )}
      <ShareTabs token={token} sections={link.sections} />
      {children}
    </Shell>
  );
}
