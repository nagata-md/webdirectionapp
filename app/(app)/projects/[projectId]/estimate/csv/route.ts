import { NextResponse } from "next/server";
import { loadProjectEstimate } from "@/lib/estimate/loadProjectEstimate";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { projectName, estimate } = await loadProjectEstimate(projectId);

  // 表示順(確定): ①ディレクション費 → ②ページ別コスト → ③追加項目
  const rows: (string | number)[][] = [["項目", "金額"]];
  rows.push(["ディレクション費", estimate.directionFee]);
  for (const p of estimate.pages) {
    rows.push([p.pageName, p.cost]);
  }
  for (const l of estimate.lineItems) {
    rows.push([l.label, l.amount]);
  }
  rows.push(["小計（税抜）", estimate.subtotal]);
  rows.push(["消費税", estimate.taxAmount]);
  rows.push(["合計（税込）", estimate.total]);

  const csvBody = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  // ExcelでのUTF-8文字化け防止のためBOMを付与
  const csv = `﻿${csvBody}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="estimate_${encodeURIComponent(projectName)}.csv"`,
    },
  });
}
