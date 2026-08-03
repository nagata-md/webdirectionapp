import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLinkStatus } from "@/lib/share/getShareLinkStatus";
import { buildCsv } from "@/lib/csv";

// 共有閲覧画面からのメタ情報CSVダウンロード（Phase 12、新規要件）。
// メタ情報セクションが含まれる共有リンクでのみ許可する。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = createAdminClient();
  const result = await getShareLinkStatus(admin, token);
  if (result.status !== "ok" || !result.link.sections.meta) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const [{ data: project }, { data: pages }] = await Promise.all([
    admin.from("projects").select("project_name").eq("id", result.link.projectId).single(),
    admin
      .from("pages")
      .select("name, slug, title, description, keywords, due_date, status")
      .eq("project_id", result.link.projectId)
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
      "Content-Disposition": `attachment; filename="meta_${encodeURIComponent(project?.project_name ?? "project")}.csv"`,
    },
  });
}
