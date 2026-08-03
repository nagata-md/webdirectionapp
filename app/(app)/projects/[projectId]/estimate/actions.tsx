"use server";

import { redirect } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shiftCalendarDays } from "@/lib/schedule/businessDay";
import { generateQuoteNumber } from "@/lib/estimate/quoteNumber";
import { EstimatePdfDocument } from "@/lib/estimate/pdfTemplate";
import { loadProjectEstimate } from "@/lib/estimate/loadProjectEstimate";

export async function saveLineItems(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const itemsRaw = formData.get("lineItems");
  const items: { label: string; amount: number }[] = itemsRaw ? JSON.parse(String(itemsRaw)) : [];

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("estimate_line_items")
    .delete()
    .eq("project_id", projectId);
  if (deleteError) throw new Error(deleteError.message);

  const rows = items
    .filter((i) => i.label.trim())
    .map((i, index) => ({
      project_id: projectId,
      label: i.label.trim(),
      amount: i.amount,
      sort_order: index,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("estimate_line_items").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  redirect(`/projects/${projectId}/estimate?saved=1`);
}

async function loadIssuerData(): Promise<{
  companyName: string | null;
  address: string | null;
  phone: string | null;
  stampDataUri: string | null;
  estimateValidityDays: number;
}> {
  const supabase = await createClient();
  const { data: master } = await supabase
    .from("master")
    .select("issuer_company_name, issuer_address, issuer_phone, issuer_stamp_image_url, estimate_validity_days")
    .single();

  let stampDataUri: string | null = null;
  if (master?.issuer_stamp_image_url) {
    const admin = createAdminClient();
    const { data: file } = await admin.storage.from("stamps").download(master.issuer_stamp_image_url);
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "image/png";
      stampDataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
    }
  }

  return {
    companyName: master?.issuer_company_name ?? null,
    address: master?.issuer_address ?? null,
    phone: master?.issuer_phone ?? null,
    stampDataUri,
    estimateValidityDays: master?.estimate_validity_days ?? 30,
  };
}

export async function issueEstimatePdf(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) throw new Error("プロジェクトIDが指定されていません");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ clientName, projectName, estimate }, issuerData] = await Promise.all([
    loadProjectEstimate(projectId),
    loadIssuerData(),
  ]);

  const quoteNumber = await generateQuoteNumber();
  const jstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const validUntil = shiftCalendarDays(jstToday, issuerData.estimateValidityDays);

  const { count: existingVersionCount } = await supabase
    .from("estimate_versions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const versionNumber = (existingVersionCount ?? 0) + 1;

  const pdfData = {
    quoteNumber,
    issuedAt: jstToday,
    validUntil,
    clientName: clientName ?? "",
    projectName: projectName,
    directionFee: estimate.directionFee,
    pages: estimate.pages.map((p) => ({ pageName: p.pageName, cost: p.cost })),
    lineItems: estimate.lineItems.map((l) => ({ label: l.label, amount: l.amount })),
    subtotal: estimate.subtotal,
    taxRate: estimate.taxRate,
    taxAmount: estimate.taxAmount,
    total: estimate.total,
    issuer: {
      companyName: issuerData.companyName,
      address: issuerData.address,
      phone: issuerData.phone,
      stampDataUri: issuerData.stampDataUri,
    },
  };

  const pdfBuffer = await renderToBuffer(<EstimatePdfDocument data={pdfData} />);

  const admin = createAdminClient();
  const pdfPath = `${projectId}/${quoteNumber}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("estimate-pdfs")
    .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const estimateDataSnapshot = {
    directionFee: estimate.directionFee,
    pages: estimate.pages,
    lineItems: estimate.lineItems,
    subtotal: estimate.subtotal,
    taxRate: estimate.taxRate,
    taxAmount: estimate.taxAmount,
    total: estimate.total,
  };

  const { error: insertError } = await supabase.from("estimate_versions").insert({
    project_id: projectId,
    quote_number: quoteNumber,
    version_number: versionNumber,
    issued_at: new Date().toISOString(),
    valid_until: validUntil,
    estimate_data: estimateDataSnapshot,
    pdf_url: pdfPath,
    created_by: user?.id ?? null,
    created_by_email: user?.email ?? null,
  });
  if (insertError) throw new Error(insertError.message);

  redirect(`/projects/${projectId}/estimate?saved=1`);
}
