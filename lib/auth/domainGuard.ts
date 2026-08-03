import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EMAIL_DOMAIN = "marketingdept-llc.com";

// 保護ルートの先頭で呼ぶ。未ログインなら/loginへ、
// marketingdept-llc.com以外のアカウントならサインアウトの上で
// エラーメッセージ付きで/loginへリダイレクトする（spec §2・§7）。
export async function requireTeamMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "";
  const isAllowedDomain = email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);

  if (!isAllowedDomain) {
    await supabase.auth.signOut();
    redirect("/login?error=domain");
  }

  return user;
}
