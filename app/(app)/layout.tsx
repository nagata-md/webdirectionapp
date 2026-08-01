import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // TODO(Phase 3): user.email のドメインが marketingdept-llc.com でなければ拒否する

  return (
    <AppShell sidebar={<Sidebar userEmail={user?.email} />}>{children}</AppShell>
  );
}
