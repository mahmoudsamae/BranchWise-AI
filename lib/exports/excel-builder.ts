import * as XLSX from "xlsx";

import type { ExportBundle } from "./types";

function sheetFromRows<T extends Record<string, unknown>>(rows: T[], headers: { key: keyof T; label: string }[]) {
  const data = [
    headers.map((h) => h.label),
    ...rows.map((row) => headers.map((h) => row[h.key] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(h.label.length, ...rows.map((r) => String(r[h.key] ?? "").length));
    return { wch: Math.min(48, maxLen + 2) };
  });
  ws["!cols"] = colWidths;
  return ws;
}

export function buildAnalyticsWorkbook(bundle: ExportBundle): Buffer {
  const wb = XLSX.utils.book_new();

  const kpiRows = bundle.by_branch.map((b) => ({
    Branch: b.branch_name,
    "Period Start": bundle.start_date,
    "Period End": bundle.end_date,
    Revenue: b.total_revenue,
    "Occupancy %": b.avg_occupancy,
    "Neg. Feedback": b.total_negative_feedback,
    "Pos. Feedback": b.positive_feedback,
    Issues: b.repeated_issues,
    Support: b.support_needed,
    "Unpaid Departures": b.unpaid_departures,
  }));

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(kpiRows, [
      { key: "Branch", label: "Branch" },
      { key: "Period Start", label: "Period Start" },
      { key: "Period End", label: "Period End" },
      { key: "Revenue", label: "Revenue" },
      { key: "Occupancy %", label: "Occupancy %" },
      { key: "Neg. Feedback", label: "Neg. Feedback" },
      { key: "Pos. Feedback", label: "Pos. Feedback" },
      { key: "Issues", label: "Issues" },
      { key: "Support", label: "Support" },
      { key: "Unpaid Departures", label: "Unpaid Departures" },
    ]),
    "KPIs",
  );

  const reportRows = bundle.reports.map((r) => ({
    Branch: r.branch_name,
    Template: r.template_title,
    Type: r.template_type,
    Period: `${r.period_start} – ${r.period_end}`,
    Status: r.status,
    "Submitted By": r.submitted_by_name ?? "—",
    "Submitted At": r.submitted_at ? new Date(r.submitted_at).toISOString() : "—",
  }));

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(reportRows, [
      { key: "Branch", label: "Branch" },
      { key: "Template", label: "Template" },
      { key: "Type", label: "Type" },
      { key: "Period", label: "Period" },
      { key: "Status", label: "Status" },
      { key: "Submitted By", label: "Submitted By" },
      { key: "Submitted At", label: "Submitted At" },
    ]),
    "Reports Log",
  );

  const feedbackRows = bundle.by_branch.map((b) => ({
    Branch: b.branch_name,
    Week: bundle.end_date,
    "Negative Count": b.total_negative_feedback,
    "Positive Count": b.positive_feedback,
    "Net Sentiment": b.positive_feedback - b.total_negative_feedback,
  }));

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(feedbackRows, [
      { key: "Branch", label: "Branch" },
      { key: "Week", label: "Week" },
      { key: "Negative Count", label: "Negative Count" },
      { key: "Positive Count", label: "Positive Count" },
      { key: "Net Sentiment", label: "Net Sentiment" },
    ]),
    "Feedback Signals",
  );

  const fruhstuckRows = bundle.fruhstuck.map((f) => ({
    Branch: f.branch_name,
    Date: f.date,
    Orders: f.orders_count,
    Revenue: f.revenue,
    "Top Item": f.top_item ?? "—",
  }));

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(fruhstuckRows, [
      { key: "Branch", label: "Branch" },
      { key: "Date", label: "Date" },
      { key: "Orders", label: "Orders" },
      { key: "Revenue", label: "Revenue" },
      { key: "Top Item", label: "Top Item" },
    ]),
    "Frühstück",
  );

  if (bundle.communication.length > 0) {
    const commRows = bundle.communication.map((c) => ({
      Date: c.created_at,
      Author: c.author_name,
      Role: c.role,
      Channel: c.channel_name,
      Message: c.body.slice(0, 500),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(commRows, [
        { key: "Date", label: "Date" },
        { key: "Author", label: "Author" },
        { key: "Role", label: "Role" },
        { key: "Channel", label: "Channel" },
        { key: "Message", label: "Message" },
      ]),
      "Communication",
    );
  }

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
