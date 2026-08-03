"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { COMPLEXITIES, COST_PHASES, SCHEDULE_PHASES } from "@/lib/master/constants";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getMasterId(supabase: SupabaseServerClient): Promise<string> {
  const { data, error } = await supabase.from("master").select("id").single();
  if (error || !data) {
    throw new Error("マスタ設定が見つかりません");
  }
  return data.id as string;
}

function num(formData: FormData, key: string): number {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : 0;
}

export type LiveShareImpact = { projectId: string; projectName: string };

// マスタの単価・工数・ディレクション費・税率を変更する前に、見積もりセクションを含む
// 有効なライブ共有リンクへの影響を警告するためのチェック（spec §4.10）。
// estimateVersionモードのリンクは凍結データを表示するため対象外。
export async function checkLiveShareImpact(): Promise<LiveShareImpact[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("share_links")
    .select("include_sections, project_id, projects(project_name)")
    .eq("mode", "live")
    .eq("revoked", false)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (error) throw new Error(error.message);

  const impacted = (data ?? []).filter(
    (row) => (row.include_sections as { estimate?: boolean } | null)?.estimate === true,
  );

  const seen = new Set<string>();
  const result: LiveShareImpact[] = [];
  for (const row of impacted) {
    const project = row.projects as unknown as { project_name: string } | null;
    if (!project || seen.has(row.project_id)) continue;
    seen.add(row.project_id);
    result.push({ projectId: row.project_id, projectName: project.project_name });
  }
  return result;
}

export async function saveScheduleMaster(formData: FormData) {
  const supabase = await createClient();
  const id = await getMasterId(supabase);

  const rates: Record<string, Record<string, { days: number; cost: number }>> = {};
  const topRates: Record<string, Record<string, { days: number; cost: number }>> = {};
  for (const complexity of COMPLEXITIES) {
    rates[complexity] = {};
    topRates[complexity] = {};
    for (const phase of COST_PHASES) {
      rates[complexity][phase] = {
        days: num(formData, `rates.${complexity}.${phase}.days`),
        cost: num(formData, `rates.${complexity}.${phase}.cost`),
      };
      topRates[complexity][phase] = {
        days: num(formData, `topRates.${complexity}.${phase}.days`),
        cost: num(formData, `topRates.${complexity}.${phase}.cost`),
      };
    }
  }

  const cmsRates: Record<string, { days: number; cost: number }> = {};
  for (const complexity of COMPLEXITIES) {
    cmsRates[complexity] = {
      days: num(formData, `cmsRates.${complexity}.days`),
      cost: num(formData, `cmsRates.${complexity}.cost`),
    };
  }

  const standards: Record<string, { checkback: number; buffer: number }> = {};
  const defaultParallelByPhase: Record<string, number> = {};
  for (const phase of SCHEDULE_PHASES) {
    standards[phase] = {
      checkback: num(formData, `standards.${phase}.checkback`),
      buffer: num(formData, `standards.${phase}.buffer`),
    };
    defaultParallelByPhase[phase] = num(formData, `parallel.${phase}`);
  }

  const { error } = await supabase
    .from("master")
    .update({
      rates,
      top_rates: topRates,
      cms_rates: cmsRates,
      standards,
      default_parallel_by_phase: defaultParallelByPhase,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/master");
  redirect("/master?saved=1");
}

export async function saveHolidaysAndWeeklyOff(formData: FormData) {
  const supabase = await createClient();
  const id = await getMasterId(supabase);

  const holidaysRaw = formData.get("holidays");
  const holidays = holidaysRaw ? JSON.parse(String(holidaysRaw)) : [];

  const weeklyOff = formData
    .getAll("weeklyOff")
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  const { error } = await supabase
    .from("master")
    .update({ holidays, weekly_off: weeklyOff })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/master");
  redirect("/master?saved=1");
}

export async function saveDirectionAndTax(formData: FormData) {
  const supabase = await createClient();
  const id = await getMasterId(supabase);

  const directionMonthlyRate = num(formData, "directionMonthlyRate");
  const taxRatePercent = num(formData, "taxRatePercent");
  const mobileMenuRate = num(formData, "mobileMenuRate");

  const { error } = await supabase
    .from("master")
    .update({
      direction_monthly_rate: directionMonthlyRate,
      tax_rate: taxRatePercent / 100,
      mobile_menu_rate: mobileMenuRate,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/master");
  redirect("/master?saved=1");
}

export async function saveIssuerInfo(formData: FormData) {
  const supabase = await createClient();
  const id = await getMasterId(supabase);

  const update: Record<string, unknown> = {
    issuer_company_name: String(formData.get("issuerCompanyName") ?? "").trim() || null,
    issuer_address: String(formData.get("issuerAddress") ?? "").trim() || null,
    issuer_phone: String(formData.get("issuerPhone") ?? "").trim() || null,
    estimate_validity_days: num(formData, "estimateValidityDays") || 30,
  };

  const stampFile = formData.get("stampImage");
  if (stampFile instanceof File && stampFile.size > 0) {
    const admin = createAdminClient();
    const ext = stampFile.name.split(".").pop() || "png";
    const path = `issuer-stamp.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("stamps")
      .upload(path, stampFile, { upsert: true, contentType: stampFile.type });
    if (uploadError) throw new Error(uploadError.message);
    update.issuer_stamp_image_url = path;
  }

  const { error } = await supabase.from("master").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/master");
  redirect("/master?saved=1");
}

export async function saveAiSettings(formData: FormData) {
  const supabase = await createClient();
  const id = await getMasterId(supabase);

  const aiModel = String(formData.get("aiModel") ?? "").trim();
  const newApiKey = String(formData.get("aiApiKey") ?? "").trim();

  const update: Record<string, unknown> = {
    ai_model: aiModel || null,
  };

  // 未入力なら既存のキーを保持する（再表示はしない・上書きもしない）
  if (newApiKey) {
    update.ai_api_key = encrypt(newApiKey);
  }

  const { error } = await supabase.from("master").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/master");
  redirect("/master?saved=1");
}
