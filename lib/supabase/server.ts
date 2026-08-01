import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// 認証済みユーザーのセッションでSupabaseにアクセスする（RLSが有効な通常のクライアント用）
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Componentから呼ばれた場合はsetできないが、
            // proxy.ts側でセッションを更新していれば問題ない
          }
        },
      },
    },
  );
}
