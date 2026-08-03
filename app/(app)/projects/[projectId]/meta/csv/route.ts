import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCsv } from "@/lib/csv";

// 開発者向けメタ情報CSVエクスポート（Phase 12、新規要件）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: pages }] = await Promise.all([
    supabase.from("projects").select("project_name").eq("id", projectId).single(),
    supabase
      .from("pages")
      .select("name, slug, title, description, keywords, due_date, status")
      .eq("project_id", projectId)
      .order("priority"),
  ]);

  const rows: (string | number)[][] = [
    ["ページ", "スラッグ", "TITLE", "ディスクリプション", "キーワード", "納品予定日", "進捗ステータス"],
  ];
  for (const p of pages ?? []) {
    rows.push([
      p.name,
      p.slug ?? "",
      p.title ?? "",
      p.description ?? "",
      p.keywords ?? "",
      p.due_date ?? "",
      p.status,
    ]);
  }

  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meta_${encodeURIComponent(project?.project_name ?? projectId)}.csv"`,
    },
  });
}
