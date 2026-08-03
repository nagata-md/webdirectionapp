import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 見積番号を採番する（例: EST-20260803-0001）。
// 同日の発行件数をService Role経由でカウントして連番を振る。
// 小規模チームでの利用を前提に、厳密な排他制御は行わない（衝突時はunique制約で弾かれる想定）。
export async function generateQuoteNumber(): Promise<string> {
  const admin = createAdminClient();
  // JSTでの「今日」を求める（UTC epochに+9時間してUTCフィールドを読む、spec §8のJST一貫方針）
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = `${jstNow.getUTCFullYear()}${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}${String(
    jstNow.getUTCDate(),
  ).padStart(2, "0")}`;

  const { count } = await admin
    .from("estimate_versions")
    .select("id", { count: "exact", head: true })
    .like("quote_number", `EST-${dateStr}-%`);

  const sequence = String((count ?? 0) + 1).padStart(4, "0");
  return `EST-${dateStr}-${sequence}`;
}
