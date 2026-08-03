import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import type { Holiday, ParallelByPhase, Rates, Standards } from "@/lib/master/constants";

export type MasterSettings = {
  id: string;
  rates: Rates;
  standards: Standards;
  weekly_off: number[];
  holidays: Holiday[];
  direction_monthly_rate: number;
  default_parallel_by_phase: ParallelByPhase;
  tax_rate: number;
  issuer_company_name: string | null;
  issuer_address: string | null;
  issuer_phone: string | null;
  issuer_stamp_image_url: string | null;
  estimate_validity_days: number;
  ai_model: string | null;
  updated_at: string;
};

// ai_api_keyは絶対に含めない（DB側でもauthenticatedからのSELECTを禁止済み、spec §6・§8）。
const MASTER_SAFE_COLUMNS =
  "id, rates, standards, weekly_off, holidays, direction_monthly_rate, default_parallel_by_phase, tax_rate, issuer_company_name, issuer_address, issuer_phone, issuer_stamp_image_url, estimate_validity_days, ai_model, updated_at";

export async function getMasterSettings(): Promise<MasterSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master")
    .select(MASTER_SAFE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "マスタ設定が見つかりません");
  }

  return data as unknown as MasterSettings;
}

// ai_api_keyの状態（設定済みか・下4桁のマスク表示）だけをService Role経由で取得する。
// 復号した実際の値はこの関数の外に一切出さない（spec §6・§8）。
export async function getAiKeyStatus(): Promise<{
  configured: boolean;
  masked: string | null;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("master").select("ai_api_key").single();

  if (error || !data?.ai_api_key) {
    return { configured: false, masked: null };
  }

  try {
    const plain = decrypt(data.ai_api_key as string);
    return { configured: true, masked: `****${plain.slice(-4)}` };
  } catch {
    return { configured: false, masked: null };
  }
}

export async function getStampSignedUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("stamps").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
