import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service Roleキーを使うクライアント。RLSを全てバイパスするため、
// 外部共有閲覧(share_view)やai_api_keyの復号など、サーバー側で
// 権限判定を完結させる処理からのみ呼び出すこと。
// クライアントコンポーネント・ブラウザバンドルに絶対に含めない。
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
