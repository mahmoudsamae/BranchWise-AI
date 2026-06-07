import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  coverTitle: { fontSize: 28, fontWeight: "bold", color: "#6366f1", marginBottom: 8 },
  coverSubtitle: { fontSize: 16, marginBottom: 24 },
  coverMeta: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  h1: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#111827" },
  h2: { fontSize: 14, fontWeight: "bold", marginBottom: 8, marginTop: 12 },
  paragraph: { fontSize: 10, lineHeight: 1.5, marginBottom: 8, color: "#374151" },
  box: { backgroundColor: "#f3f4f6", padding: 12, marginBottom: 12, borderRadius: 4 },
  bullet: { fontSize: 10, marginBottom: 4, paddingLeft: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#111827", color: "#fff", padding: 6 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", padding: 5 },
  cell: { flex: 1, fontSize: 9 },
  cellWide: { flex: 2, fontSize: 9 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});
