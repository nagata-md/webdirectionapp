import "server-only";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "node:path";

Font.register({
  family: "NotoSansJP",
  src: path.resolve(process.cwd(), "assets/fonts/NotoSansJP-Regular.ttf"),
});

export type EstimatePdfData = {
  quoteNumber: string;
  issuedAt: string;
  validUntil: string;
  clientName: string;
  projectName: string;
  directionFee: number;
  pages: { pageName: string; cost: number }[];
  lineItems: { label: string; amount: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
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
  colAmount: { width: 100, fontSize: 9, textAlign: "right" },
  headerLabel: { flex: 1, fontSize: 9, color: "#6D6E71" },
  headerAmount: { width: 100, fontSize: 9, textAlign: "right", color: "#6D6E71" },
  summary: { marginTop: 8, alignItems: "flex-end" },
  summaryLine: { fontSize: 9, marginBottom: 2 },
  grandTotal: { fontSize: 12, marginTop: 4, color: "#0F2E4F" },
  issuerBox: { marginTop: 24, alignItems: "flex-end" },
  stamp: { width: 60, height: 60, marginBottom: 4 },
  issuerText: { fontSize: 9, textAlign: "right", color: "#6D6E71" },
});

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
            <Text style={styles.headerLabel}>項目</Text>
            <Text style={styles.headerAmount}>金額</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLabel}>ディレクション費</Text>
            <Text style={styles.colAmount}>{yen(data.directionFee)}</Text>
          </View>

          {data.pages.map((p, i) => (
            <View style={styles.tableRow} key={`page-${i}`}>
              <Text style={styles.colLabel}>{p.pageName}</Text>
              <Text style={styles.colAmount}>{yen(p.cost)}</Text>
            </View>
          ))}

          {data.lineItems.map((l, i) => (
            <View style={styles.tableRow} key={`line-${i}`}>
              <Text style={styles.colLabel}>{l.label}</Text>
              <Text style={styles.colAmount}>{yen(l.amount)}</Text>
            </View>
          ))}
        </View>

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
