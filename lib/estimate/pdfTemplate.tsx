import "server-only";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "node:path";

Font.register({
  family: "NotoSansJP",
  src: path.resolve(process.cwd(), "assets/fonts/NotoSansJP-Regular.ttf"),
});

export type EstimatePdfLine = {
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

// PDF発行は集計見積もりベースで行う（Phase 12、詳細見積もりは画面表示のみ）。
export type EstimatePdfData = {
  quoteNumber: string;
  issuedAt: string;
  validUntil: string;
  clientName: string;
  projectName: string;
  directionFee: number;
  directionMonths: number;
  directionMonthlyRate: number;
  topLines: EstimatePdfLine[];
  tallyLines: EstimatePdfLine[];
  cmsLines: EstimatePdfLine[];
  testVerificationTotal: number;
  lineItems: { label: string; amount: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  remarks: string | null;
  issuer: {
    companyName: string | null;
    address: string | null;
    phone: string | null;
    stampDataUri: string | null;
  };
};

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

const styles = StyleSheet.create({
  page: { fontFamily: "NotoSansJP", padding: 40, fontSize: 10, color: "#101820" },
  title: { fontSize: 20, marginBottom: 16, color: "#0F2E4F" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { fontSize: 12 },
  headerRight: { fontSize: 9, textAlign: "right", color: "#6D6E71" },
  totalHighlight: {
    fontSize: 14,
    marginBottom: 16,
    padding: 8,
    backgroundColor: "#F3F4F5",
    color: "#0F2E4F",
  },
  table: { marginBottom: 12 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#0F2E4F",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#D9DCDF",
    paddingVertical: 3,
  },
  colLabel: { flex: 1, fontSize: 9 },
  colQuantity: { width: 60, fontSize: 9, textAlign: "right" },
  colUnitPrice: { width: 80, fontSize: 9, textAlign: "right" },
  colAmount: { width: 90, fontSize: 9, textAlign: "right" },
  headerLabel: { flex: 1, fontSize: 9, color: "#6D6E71" },
  headerQuantity: { width: 60, fontSize: 9, textAlign: "right", color: "#6D6E71" },
  headerUnitPrice: { width: 80, fontSize: 9, textAlign: "right", color: "#6D6E71" },
  headerAmount: { width: 90, fontSize: 9, textAlign: "right", color: "#6D6E71" },
  remarksBox: { marginTop: 8, marginBottom: 12 },
  remarksLabel: { fontSize: 9, color: "#6D6E71", marginBottom: 2 },
  remarksText: { fontSize: 9 },
  summary: { marginTop: 8, alignItems: "flex-end" },
  summaryLine: { fontSize: 9, marginBottom: 2 },
  grandTotal: { fontSize: 12, marginTop: 4, color: "#0F2E4F" },
  issuerBox: { marginTop: 24, alignItems: "flex-end" },
  stamp: { width: 60, height: 60, marginBottom: 4 },
  issuerText: { fontSize: 9, textAlign: "right", color: "#6D6E71" },
});

function PdfRow({ line }: { line: EstimatePdfLine }) {
  return (
    <View style={styles.tableRow}>
      <Text style={styles.colLabel}>{line.label}</Text>
      <Text style={styles.colQuantity}>
        {line.quantity} {line.unit}
      </Text>
      <Text style={styles.colUnitPrice}>{yen(line.unitPrice)}</Text>
      <Text style={styles.colAmount}>{yen(line.amount)}</Text>
    </View>
  );
}

export function EstimatePdfDocument({ data }: { data: EstimatePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>御見積書</Text>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text>{data.clientName || "―"} 御中</Text>
            <Text>件名：{data.projectName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>見積番号：{data.quoteNumber}</Text>
            <Text>発行日：{data.issuedAt}</Text>
            <Text>有効期限：{data.validUntil}</Text>
          </View>
        </View>

        <Text style={styles.totalHighlight}>ご請求金額（税込）：{yen(data.total)}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.headerLabel}>品番・品名</Text>
            <Text style={styles.headerQuantity}>数量</Text>
            <Text style={styles.headerUnitPrice}>単価</Text>
            <Text style={styles.headerAmount}>金額</Text>
          </View>

          <PdfRow
            line={{
              label: "全体ディレクション【進行・管理】",
              quantity: data.directionMonths,
              unit: "ヶ月",
              unitPrice: data.directionMonthlyRate,
              amount: data.directionFee,
            }}
          />

          {data.topLines.map((line, i) => (
            <PdfRow key={`top-${i}`} line={line} />
          ))}
          {data.tallyLines.map((line, i) => (
            <PdfRow key={`tally-${i}`} line={line} />
          ))}
          {data.cmsLines.map((line, i) => (
            <PdfRow key={`cms-${i}`} line={line} />
          ))}
          {data.testVerificationTotal > 0 && (
            <PdfRow
              line={{
                label: "テスト検証",
                quantity: 1,
                unit: "式",
                unitPrice: data.testVerificationTotal,
                amount: data.testVerificationTotal,
              }}
            />
          )}

          {data.lineItems.map((l, i) => (
            <View style={styles.tableRow} key={`line-${i}`}>
              <Text style={styles.colLabel}>{l.label}</Text>
              <Text style={styles.colQuantity} />
              <Text style={styles.colUnitPrice} />
              <Text style={styles.colAmount}>{yen(l.amount)}</Text>
            </View>
          ))}
        </View>

        {data.remarks && (
          <View style={styles.remarksBox}>
            <Text style={styles.remarksLabel}>備考</Text>
            <Text style={styles.remarksText}>{data.remarks}</Text>
          </View>
        )}

        <View style={styles.summary}>
          <Text style={styles.summaryLine}>小計（税抜）：{yen(data.subtotal)}</Text>
          <Text style={styles.summaryLine}>
            消費税（{Math.round(data.taxRate * 100)}%）：{yen(data.taxAmount)}
          </Text>
          <Text style={styles.grandTotal}>合計（税込）：{yen(data.total)}</Text>
        </View>

        <View style={styles.issuerBox}>
          {data.issuer.stampDataUri && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={data.issuer.stampDataUri} style={styles.stamp} />
          )}
          {data.issuer.companyName && <Text style={styles.issuerText}>{data.issuer.companyName}</Text>}
          {data.issuer.address && <Text style={styles.issuerText}>{data.issuer.address}</Text>}
          {data.issuer.phone && <Text style={styles.issuerText}>{data.issuer.phone}</Text>}
        </View>
      </Page>
    </Document>
  );
}
