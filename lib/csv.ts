function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ExcelでのUTF-8文字化け防止のためBOMを付与したCSV文字列を組み立てる共通ヘルパー
export function buildCsv(rows: (string | number)[][]): string {
  const body = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return `﻿${body}`;
}
