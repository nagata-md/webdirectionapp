import { requireTeamMember } from "@/lib/auth/domainGuard";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireTeamMember();

  return (
    <AppShell sidebar={<Sidebar userEmail={user.email} />}>{children}</AppShell>
  );
}
