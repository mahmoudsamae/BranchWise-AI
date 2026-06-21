import type { BranchKpiRow, KpiSummary } from "@/lib/gm-hr/analytics-service";

export type ExportReportRow = {
  id: string;
  branch_id: string;
  branch_name: string;
  template_title: string;
  template_type: string;
  period_start: string;
  period_end: string;
  status: string;
  submitted_by_name: string | null;
  submitted_at: string | null;
  data_summary: string;
};

export type ExportFruhstuckRow = {
  branch_name: string;
  date: string;
  orders_count: number;
  top_item: string | null;
};

export type ExportCommunicationRow = {
  created_at: string;
  author_name: string;
  role: string;
  channel_name: string;
  body: string;
};

export type ExportBundle = {
  start_date: string;
  end_date: string;
  branch_ids: string[];
  hr_only: boolean;
  generated_by: string;
  summary: KpiSummary;
  by_branch: BranchKpiRow[];
  reports: ExportReportRow[];
  fruhstuck: ExportFruhstuckRow[];
  communication: ExportCommunicationRow[];
};

export type ExportInclude = {
  reports?: boolean;
  kpis?: boolean;
  ai_summary?: boolean;
  fruhstuck?: boolean;
  communication?: boolean;
};
