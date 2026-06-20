import type { BranchBreakfastDashboardSummary } from "@/lib/branch/breakfast-dashboard";
import type { BranchReviewsSummary } from "@/lib/branch/branch-reviews-summary";
import type { BranchIssue } from "@/lib/branch/problems";
import type { OvertimeSummary } from "@/lib/branch/overtime-summary";
import type { ReviewsNeedingReplyPayload } from "@/lib/branch/review-explanations";
import type { SubmissionHistoryPoint } from "@/lib/branch/submission-history";
import type { TodaysTaskProgress } from "@/lib/branch/todays-tasks";
import type { BranchBreakfastPayload } from "@/lib/fruhstuck/load-branch-breakfast";
import type { DashboardStats } from "@/lib/gm-hr/dashboard-stats";
import type { OperationsDashboardData } from "@/lib/gm-hr/operations-dashboard";
import type { HrDashboardPayload } from "@/lib/hr/dashboard-service";
import { getMockReviewsForBranch } from "@/lib/google/mock-reviews";

import { DEMO_BRANCH_IDS, DEMO_REPORT_ID } from "./config";

const BRANCHES = [
  { id: DEMO_BRANCH_IDS.regensburg, name: "AZUR Camping Regensburg", location: "Regensburg", is_active: true, external_id: "DEMO-R" },
  { id: DEMO_BRANCH_IDS.bodensee, name: "AZUR Camping Bodensee", location: "Friedrichshafen", is_active: true, external_id: "DEMO-B" },
  { id: DEMO_BRANCH_IDS.chiemsee, name: "AZUR Camping Chiemsee", location: "Prien", is_active: true, external_id: "DEMO-C" },
  { id: DEMO_BRANCH_IDS.schwarzwald, name: "AZUR Camping Schwarzwald", location: "Titisee", is_active: true, external_id: "DEMO-S" },
];

export function demoBranches() {
  return { branches: BRANCHES };
}

export function demoOperationsDashboard(): OperationsDashboardData {
  return {
    live: true,
    header: {
      date_label: "Montag, 15. Juni 2026",
      region_label: "Region Süd",
      branch_count: BRANCHES.length,
    },
    decisions: {
      missing_reports: {
        count: 2,
        all_clear: false,
        items: [
          {
            request_id: "demo-req-1",
            branch_id: DEMO_BRANCH_IDS.chiemsee,
            branch_name: "Chiemsee",
            report_title: "Wochenbericht",
            period_label: "02.06. – 08.06.2026",
            due_date: "2026-06-10",
            days_overdue: 5,
          },
          {
            request_id: "demo-req-2",
            branch_id: DEMO_BRANCH_IDS.schwarzwald,
            branch_name: "Schwarzwald",
            report_title: "Tagesbericht",
            period_label: "06.06.2026",
            due_date: "2026-06-12",
            days_overdue: 3,
          },
        ],
      },
      support_requests: {
        count: 1,
        all_clear: false,
        items: [
          { id: "q1", branch_name: "Regensburg", title: "Budget für Fliesen Sanitärgebäude" },
        ],
      },
    },
    branch_status: [
      {
        branch_id: DEMO_BRANCH_IDS.regensburg,
        branch_name: "Regensburg",
        camp_score: 67,
        score_segments: ["green", "green", "yellow", "green"],
        areas: { rezeption: "green", sanitaer: "green", gruenpflege: "yellow", bestellungen: "green", personal: "yellow", projekte: "green" },
        last_report_label: "12. Jun",
        last_report_overdue: false,
      },
      {
        branch_id: DEMO_BRANCH_IDS.bodensee,
        branch_name: "Bodensee",
        camp_score: 61,
        score_segments: ["green", "yellow", "green", "yellow"],
        areas: { rezeption: "green", sanitaer: "yellow", gruenpflege: "green", bestellungen: "green", personal: "green", projekte: "yellow" },
        last_report_label: "11. Jun",
        last_report_overdue: false,
      },
      {
        branch_id: DEMO_BRANCH_IDS.chiemsee,
        branch_name: "Chiemsee",
        camp_score: 56,
        score_segments: ["yellow", "yellow", "green", "red"],
        areas: { rezeption: "yellow", sanitaer: "green", gruenpflege: "green", bestellungen: "yellow", personal: "red", projekte: "yellow" },
        last_report_label: "– 5 Tage",
        last_report_overdue: true,
      },
      {
        branch_id: DEMO_BRANCH_IDS.schwarzwald,
        branch_name: "Schwarzwald",
        camp_score: 52,
        score_segments: ["red", "yellow", "red", "yellow"],
        areas: { rezeption: "red", sanitaer: "yellow", gruenpflege: "yellow", bestellungen: "red", personal: "yellow", projekte: "red" },
        last_report_label: "– 3 Tage",
        last_report_overdue: true,
      },
    ],
    projects: [
      {
        id: "demo-proj-1",
        branch_id: DEMO_BRANCH_IDS.regensburg,
        branch_name: "Regensburg",
        title: "Sanitärgebäude-Sanierung",
        status: "blocked",
        status_label: "BLOCKIERT",
        notes: "Wartet auf Budgetfreigabe für Fliesen",
        progress: 25,
      },
    ],
    request_queue: [
      { id: "q1", kind: "support", branch_id: DEMO_BRANCH_IDS.regensburg, branch_name: "Regensburg", title: "Budget für Fliesen Sanitärgebäude", source: "branch_issues" },
    ],
  };
}

export function demoDashboardStats(): DashboardStats {
  return {
    open_requests: 14,
    overdue_reports: 3,
    pending_review: 8,
    submitted_this_week: 37,
    revenue_week: 284_500,
    avg_occupancy: 82.4,
    negative_feedback_week: 5,
    unread_messages: 9,
    overdue_branches: [
      {
        branch_id: DEMO_BRANCH_IDS.chiemsee,
        branch_name: "AZUR Camping Chiemsee",
        days_overdue: 2,
        request_id: "demo-req-overdue-1",
      },
    ],
    low_occupancy_branches: [
      {
        branch_id: DEMO_BRANCH_IDS.schwarzwald,
        branch_name: "AZUR Camping Schwarzwald",
        occupancy_rate: 58,
      },
    ],
    active_requests: [
      {
        id: "demo-req-1",
        title: "Wochenreport KW 23",
        branch_name: "AZUR Camping Regensburg",
        template_title: "Weekly Operations",
        period_start: "2026-06-02",
        period_end: "2026-06-08",
        due_date: "2026-06-10",
        status: "pending",
        submitted_count: 3,
        total_branches: 4,
      },
      {
        id: "demo-req-2",
        title: "Tagesreport",
        branch_name: "AZUR Camping Bodensee",
        template_title: "Daily Snapshot",
        period_start: "2026-06-06",
        period_end: "2026-06-06",
        due_date: "2026-06-06",
        status: "pending",
        submitted_count: 2,
        total_branches: 4,
      },
    ],
    branch_snapshots: BRANCHES.map((b, i) => {
      const healthGrades = ["A", "B", "C", "D"] as const;
      const healthColors = ["green", "green", "yellow", "red"] as const;
      const occupancies = [88, 79, 72, 58];
      const revenues = [92_400, 78_200, 65_100, 48_800];
      const scores = [91, 84, 71, 54];
      return {
        branch_id: b.id,
        branch_name: b.name,
        last_report_at: "2026-06-05T14:30:00.000Z",
        status: "submitted",
        occupancy_rate: occupancies[i] ?? null,
        revenue: revenues[i] ?? null,
        health: healthColors[i] ?? "yellow",
        health_score: scores[i] ?? 0,
        health_grade: healthGrades[i] ?? "C",
      };
    }),
  };
}

export function demoHrDashboard(): HrDashboardPayload {
  return {
    kpis: {
      open_requests: 6,
      submitted_this_week: 12,
      overtime_hours_week: 47,
      staff_registered: 186,
    },
    alerts: {
      high_overtime: [{ branch_id: DEMO_BRANCH_IDS.bodensee, branch_name: "AZUR Camping Bodensee", overtime_hours: 22 }],
      poor_morale: [{ branch_id: DEMO_BRANCH_IDS.schwarzwald, branch_name: "AZUR Camping Schwarzwald" }],
      missing_report: [{ branch_id: DEMO_BRANCH_IDS.chiemsee, branch_name: "AZUR Camping Chiemsee" }],
    },
    active_requests: [
      {
        request_id: "demo-hr-req-1",
        report_id: null,
        branch_id: DEMO_BRANCH_IDS.regensburg,
        branch_name: "AZUR Camping Regensburg",
        period: "2026-06-02 – 2026-06-08",
        due_date: "2026-06-10",
        status: "pending",
        submitted_by_name: null,
      },
    ],
    recent_reports: [
      {
        report_id: DEMO_REPORT_ID,
        branch_id: DEMO_BRANCH_IDS.regensburg,
        branch_name: "AZUR Camping Regensburg",
        week: "2026-06-02",
        submitted_at: "2026-06-05T09:15:00.000Z",
        overtime_hours: 8,
        absences: 2,
        morale: "Gut",
      },
      {
        report_id: "00000000-0000-4000-8000-000000000021",
        branch_id: DEMO_BRANCH_IDS.bodensee,
        branch_name: "AZUR Camping Bodensee",
        week: "2026-06-02",
        submitted_at: "2026-06-04T16:40:00.000Z",
        overtime_hours: 14,
        absences: 1,
        morale: "Stabil",
      },
    ],
  };
}

export function demoReportsList() {
  const reports = [
    {
      id: DEMO_REPORT_ID,
      branch_id: DEMO_BRANCH_IDS.regensburg,
      branch_name: "AZUR Camping Regensburg",
      request_id: "demo-req-1",
      template_id: "demo-tpl-weekly",
      template_title: "Weekly Operations",
      type: "weekly",
      period_start: "2026-06-02",
      period_end: "2026-06-08",
      status: "submitted",
      submitted_at: "2026-06-05T09:15:00.000Z",
      updated_at: "2026-06-05T09:15:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000021",
      branch_id: DEMO_BRANCH_IDS.bodensee,
      branch_name: "AZUR Camping Bodensee",
      request_id: "demo-req-2",
      template_id: "demo-tpl-daily",
      template_title: "Daily Snapshot",
      type: "daily",
      period_start: "2026-06-05",
      period_end: "2026-06-05",
      status: "reviewed",
      submitted_at: "2026-06-05T18:00:00.000Z",
      updated_at: "2026-06-06T10:00:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000022",
      branch_id: DEMO_BRANCH_IDS.chiemsee,
      branch_name: "AZUR Camping Chiemsee",
      request_id: "demo-req-3",
      template_id: "demo-tpl-hr",
      template_title: "HR Weekly",
      type: "hr",
      period_start: "2026-06-02",
      period_end: "2026-06-08",
      status: "submitted",
      submitted_at: "2026-06-04T11:20:00.000Z",
      updated_at: "2026-06-04T11:20:00.000Z",
    },
  ];
  return {
    reports,
    total: reports.length,
    stats: { total: 3, submitted: 2, draft: 0, reviewed: 1, revision_required: 0 },
  };
}

export function demoReportDetail() {
  return {
    report: {
      id: DEMO_REPORT_ID,
      branch_id: DEMO_BRANCH_IDS.regensburg,
      template_id: "demo-tpl-weekly",
      request_id: "demo-req-1",
      data: {
        revenue: 92400,
        occupancy: 88,
        guest_feedback: "Sehr positive Rückmeldungen zur Sauberkeit.",
        issues: "Kurzzeitig Ausfall der Waschmaschinen — behoben.",
        staff_notes: "Team motiviert, keine kritischen Engpässe.",
      },
      status: "submitted",
      submitted_at: "2026-06-05T09:15:00.000Z",
      updated_at: "2026-06-05T09:15:00.000Z",
      submitted_by: "00000000-0000-4000-8000-000000000003",
    },
    branch: { id: DEMO_BRANCH_IDS.regensburg, name: "AZUR Camping Regensburg", location: "Regensburg" },
    template: {
      id: "demo-tpl-weekly",
      title: "Weekly Operations",
      type: "weekly",
      fields: [
        { id: "revenue", label: "Umsatz (€)", type: "number" },
        { id: "occupancy", label: "Auslastung (%)", type: "number" },
        { id: "guest_feedback", label: "Gästefeedback", type: "textarea" },
        { id: "issues", label: "Offene Themen", type: "textarea" },
        { id: "staff_notes", label: "Personalnotizen", type: "textarea" },
      ],
    },
    request: {
      period_start: "2026-06-02",
      period_end: "2026-06-08",
      title: "Wochenreport KW 23",
      due_date: "2026-06-10",
    },
    requested_by: { id: "00000000-0000-4000-8000-000000000001", full_name: "Demo General Manager", role: "general_manager" },
    submitter: { full_name: "Demo Branch Manager", email: "demo.branch@branchwise.demo" },
    comments: [
      {
        id: "demo-comment-1",
        user_id: "00000000-0000-4000-8000-000000000001",
        message: "Danke — bitte Auslastung nächste Woche genauer begründen.",
        created_at: "2026-06-05T11:00:00.000Z",
        user: { full_name: "Demo General Manager", email: "demo.manager@branchwise.demo", role: "general_manager" as const },
      },
    ],
    ai_summary: {
      summary:
        "• Regensburg: Umsatz 92.400 €, Auslastung 88 % — über Plan.\n• Gästefeedback positiv; Waschmaschinen-Störung kurz behoben.\n• Personal stabil, keine kritischen Engpässe.",
      generated_at: "2026-06-05T12:00:00.000Z",
    },
  };
}

export function demoAnalyticsKpis() {
  return {
    summary: {
      total_revenue: 284_500,
      avg_occupancy: 74.2,
      total_negative_feedback: 5,
      unpaid_departures: 2,
      positive_feedback: 38,
      repeated_issues: 3,
      support_needed: 1,
      reports_submitted: 37,
    },
    previous_period: {
      total_revenue: 261_200,
      avg_occupancy: 71.8,
      total_negative_feedback: 7,
      unpaid_departures: 3,
      positive_feedback: 32,
      repeated_issues: 4,
      support_needed: 2,
      reports_submitted: 34,
    },
    by_branch: BRANCHES.map((b, i) => ({
      branch_id: b.id,
      branch_name: b.name,
      total_revenue: [92_400, 78_200, 65_100, 48_800][i],
      avg_occupancy: [88, 79, 72, 58][i],
      total_negative_feedback: [1, 2, 1, 1][i],
      unpaid_departures: [0, 1, 0, 1][i],
      positive_feedback: [12, 10, 9, 7][i],
      repeated_issues: [0, 1, 1, 1][i],
      support_needed: [0, 0, 1, 0][i],
      reports_submitted: [10, 9, 9, 9][i],
      revenue: [92_400, 78_200, 65_100, 48_800][i],
      occupancy_rate: [88, 79, 72, 58][i],
      negative_feedback: [1, 2, 1, 1][i],
    })),
    period: { start: "2026-06-02", end: "2026-06-08", label: "KW 23" },
  };
}

export function demoAnalyticsTrends() {
  return {
    trends: [
      { week: "KW 20", branch_id: DEMO_BRANCH_IDS.regensburg, branch_name: "AZUR Camping Regensburg", revenue: 86_000, occupancy_rate: 84 },
      { week: "KW 21", branch_id: DEMO_BRANCH_IDS.regensburg, branch_name: "AZUR Camping Regensburg", revenue: 89_500, occupancy_rate: 86 },
      { week: "KW 22", branch_id: DEMO_BRANCH_IDS.regensburg, branch_name: "AZUR Camping Regensburg", revenue: 91_200, occupancy_rate: 87 },
      { week: "KW 23", branch_id: DEMO_BRANCH_IDS.regensburg, branch_name: "AZUR Camping Regensburg", revenue: 92_400, occupancy_rate: 88 },
    ],
    feedback_trend: [
      { week: "KW 22", positive: 28, negative: 6 },
      { week: "KW 23", positive: 38, negative: 5 },
    ],
    issues_trend: [
      { week: "KW 22", repeated_issues: 5, support_needed: 2, unpaid_departures: 3 },
      { week: "KW 23", repeated_issues: 3, support_needed: 1, unpaid_departures: 2 },
    ],
  };
}

export function demoSubmissionRates() {
  return {
    rates: BRANCHES.map((b, i) => ({
      branch_id: b.id,
      branch_name: b.name,
      on_time_rate: [96, 91, 78, 85][i],
      late_count: [1, 2, 4, 2][i],
      total_requests: [12, 12, 12, 12][i],
    })),
  };
}

export function demoAiInsight() {
  return {
    insight:
      "Regensburg und Bodensee liefern stabil über Plan — Chiemsee braucht Fokus auf pünktliche Wochenreports. Schwarzwald: Auslastung unter 60 %, Personalstimmung beobachten.",
    cached: false,
  };
}

export function demoNotifications() {
  return { notifications: [], unread_count: 0 };
}

export function demoChannels() {
  return {
    channels: [
      {
        id: "demo-channel-1",
        slug: "operations",
        name: "Operations",
        description: "Tagesgeschäft & Eskalationen",
        visible_roles: ["general_manager", "hr", "branch_manager"],
        unread_count: 3,
        member_count: 24,
      },
      {
        id: "demo-channel-2",
        slug: "hr-updates",
        name: "HR Updates",
        description: "Personal & Richtlinien",
        visible_roles: ["hr", "general_manager"],
        unread_count: 1,
        member_count: 12,
      },
    ],
  };
}

export function demoChannelMessages() {
  return {
    channel: {
      id: "demo-channel-1",
      name: "Operations",
      description: "Tagesgeschäft & Eskalationen",
      visible_roles: ["general_manager", "hr", "branch_manager"],
    },
    messages: [
      {
        id: "demo-msg-1",
        user_id: "00000000-0000-4000-8000-000000000003",
        body: "KW 23 Report ist eingereicht — kurze Störung bei Waschmaschinen, bereits behoben.",
        created_at: "2026-06-05T09:20:00.000Z",
        author_name: "Demo Branch Manager",
        role: "branch_manager" as const,
        branch_name: "AZUR Camping Regensburg",
      },
      {
        id: "demo-msg-2",
        user_id: "00000000-0000-4000-8000-000000000001",
        body: "Danke! Bitte Auslastungsprognose für Pfingsten ergänzen.",
        created_at: "2026-06-05T10:05:00.000Z",
        author_name: "Demo General Manager",
        role: "general_manager" as const,
        branch_name: null,
      },
    ],
  };
}

export function demoKiChatReply() {
  return {
    reply:
      "Im Demo-Modus: Regensburg führt mit 88 % Auslastung. Chiemsee hat 2 überfällige Reports. Empfehlung: Kurz-Check mit Filialleitung Chiemsee diese Woche.",
  };
}

export function demoSuperAdminDashboard() {
  return {
    totalUsers: 42,
    totalBranches: 4,
    gmCount: 2,
    bmCount: 4,
    recent: [
      {
        id: "00000000-0000-4000-8000-000000000003",
        full_name: "Demo Branch Manager",
        email: "demo.branch@branchwise.demo",
        role: "branch_manager" as const,
        created_at: "2026-05-01T10:00:00.000Z",
        is_active: true,
        branch_name: "AZUR Camping Regensburg",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        full_name: "Demo HR Lead",
        email: "demo.hr@branchwise.demo",
        role: "hr" as const,
        created_at: "2026-04-15T08:00:00.000Z",
        is_active: true,
        branch_name: null,
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        full_name: "Demo General Manager",
        email: "demo.manager@branchwise.demo",
        role: "general_manager" as const,
        created_at: "2026-04-01T08:00:00.000Z",
        is_active: true,
        branch_name: null,
      },
    ],
    error: null as string | null,
  };
}

export type BranchDashboardDemoData = {
  displayName: string;
  pendingCount: number;
  submittedWeek: number;
  overdueCount: number;
  pendingRows: {
    id: string;
    title: string;
    request_type: string;
    period_start: string;
    period_end: string;
    due_date: string;
  }[];
  recent: {
    id: string;
    title: string;
    period_start: string;
    period_end: string;
    submitted_at: string;
    status: string;
  }[];
  submissionHistory: SubmissionHistoryPoint[];
  reviewsSummary: BranchReviewsSummary;
  loadError: string | null;
  todaysTasks: TodaysTaskProgress[];
  overtime: OvertimeSummary;
  issues: BranchIssue[];
  reviewsNeedingReply: ReviewsNeedingReplyPayload;
  breakfast: BranchBreakfastDashboardSummary;
};

export function demoBranchDashboard(): BranchDashboardDemoData {
  const mockReviews = getMockReviewsForBranch(DEMO_BRANCH_IDS.regensburg, "AZUR Camping Regensburg");
  return {
    displayName: "Demo Branch Manager",
    pendingCount: 2,
    submittedWeek: 3,
    overdueCount: 1,
    pendingRows: [
      {
        id: "demo-branch-req-1",
        title: "Tagesreport",
        request_type: "daily",
        period_start: "2026-06-06",
        period_end: "2026-06-06",
        due_date: "2026-06-06",
      },
      {
        id: "demo-branch-req-2",
        title: "Wochenreport KW 23",
        request_type: "weekly",
        period_start: "2026-06-02",
        period_end: "2026-06-08",
        due_date: "2026-06-04",
      },
    ],
    recent: [
      {
        id: DEMO_REPORT_ID,
        title: "Weekly Operations",
        period_start: "2026-06-02",
        period_end: "2026-06-08",
        submitted_at: "2026-06-05T09:15:00.000Z",
        status: "submitted",
      },
    ],
    submissionHistory: [
      { week: "May W4", status: "submitted", submitted_at: "2026-05-28T08:00:00.000Z" },
      { week: "Jun W1", status: "submitted", submitted_at: "2026-06-05T09:15:00.000Z" },
      { week: "May W3", status: "submitted", submitted_at: "2026-05-21T07:30:00.000Z" },
      { week: "May W2", status: "overdue", submitted_at: null },
    ],
    reviewsSummary: {
      linked: true,
      rating: mockReviews.rating ?? 4.2,
      userRatingCount: mockReviews.userRatingCount ?? 120,
      recentReviews: mockReviews.reviews.slice(0, 3).map((r) => ({
        authorName: r.authorName,
        rating: r.rating,
        text: r.text,
        relativeTime: r.relativeTime ?? null,
      })),
      google_maps_url: "https://maps.google.com",
    },
    loadError: null,
    todaysTasks: [
      { tableId: "demo-task-reception", name: "Reception", completed: 9, total: 16 },
      { tableId: "demo-task-cleaning", name: "Cleaning", completed: 3, total: 5 },
      { tableId: "demo-task-grounds", name: "Grounds", completed: 1, total: 3 },
    ],
    overtime: {
      monthHours: 142,
      allTimeHours: 318,
      staffWithOvertimeMonth: 4,
      nearLimitCount: 2,
      nearLimitNames: ["Anna M.", "Jonas K."],
      lastUpdated: "2026-06-01T10:00:00.000Z",
      monthLabel: "Juni 2026",
      period: { from: "2026-06-01", to: "2026-06-30" },
    },
    issues: [
      {
        id: "demo-issue-1",
        kind: "problem",
        title: "Kaputte Schranke — Einfahrt",
        stages: ["Gemeldet", "Telefonat Firma", "Anfrage", "Kalkulation", "Entscheidung", "Repariert"],
        currentStage: 4,
        status: "open",
        costEstimate: 1240,
        notes: "Wartet auf Entscheidung.",
        stageNotes: {
          "0": "Schranke blockiert Einfahrt seit 12.06.",
          "3": "Angebot: 1.240 € inkl. Montage.",
          "4": "Fortsetzen? Wartet auf Entscheidung.",
        },
        stageChecklists: {
          "3": [
            { id: "c1", text: "Angebot eingeholt", done: true },
            { id: "c2", text: "GM informiert", done: false },
          ],
        },
        createdAt: "2026-06-12T08:00:00.000Z",
        updatedAt: "2026-06-15T08:00:00.000Z",
      },
      {
        id: "demo-issue-2",
        kind: "problem",
        title: "WLAN-Ausfall — Sektor C",
        stages: ["Gemeldet", "Telefonat Firma", "Anfrage", "Kalkulation", "Entscheidung", "Behoben"],
        currentStage: 1,
        status: "open",
        costEstimate: null,
        notes: "Provider kontaktiert · Rückruf heute erwartet.",
        stageNotes: {
          "0": "WLAN in Sektor C seit 15:00 ausgefallen.",
          "1": "Provider kontaktiert · Rückruf heute erwartet.",
        },
        stageChecklists: {},
        createdAt: "2026-06-15T08:00:00.000Z",
        updatedAt: "2026-06-15T08:00:00.000Z",
      },
      {
        id: "demo-issue-3",
        kind: "project",
        title: "Digital Check-in Rollout",
        stages: ["Konzept", "Setup", "Test", "Schulung", "Live"],
        currentStage: 2,
        status: "open",
        costEstimate: null,
        notes: "In Test — 2 Stationen aktiv. Feedback wird gesammelt.",
        stageNotes: {
          "2": "In Test — 2 Stationen aktiv, Feedback wird gesammelt.",
        },
        stageChecklists: {
          "2": [
            { id: "t1", text: "Station A getestet", done: true },
            { id: "t2", text: "Station B getestet", done: true },
            { id: "t3", text: "Feedback auswerten", done: false },
          ],
        },
        createdAt: "2026-05-26T08:00:00.000Z",
        updatedAt: "2026-06-14T08:00:00.000Z",
      },
    ],
    reviewsNeedingReply: {
      linked: true,
      overallRating: mockReviews.rating ?? 4.6,
      userRatingCount: mockReviews.userRatingCount ?? 128,
      googleMapsUrl: "https://maps.google.com",
      reviews: [
        {
          signature: "demo-review-1",
          authorName: "Markus R.",
          rating: 2,
          text: "Reservierung war doppelt vergeben — wir mussten bei Anreise umziehen. Sehr ärgerlich.",
          relativeTime: "3 days ago",
          explanation: null,
          explained: false,
        },
        {
          signature: "demo-review-2",
          authorName: "Petra L.",
          rating: 3,
          text: "Sanitäranlagen morgens nicht sauber, lange Wartezeit beim Check-in.",
          relativeTime: "6 days ago",
          explanation: null,
          explained: false,
        },
      ],
    },
    breakfast: {
      linked: true,
      tomorrowYmd: "2026-06-07",
      tomorrowLabel: "MO 7 JUN",
      itemCount: 128,
      orderCount: 34,
      highVolume: true,
      hint: "Hohes Aufkommen — früher anfangen, Aushilfe einplanen.",
    },
  };
}

export function demoBranchBreakfast(
  _range: string | null = null,
  compare: string | null = null,
): BranchBreakfastPayload {
  const revenuePerDay = Array.from({ length: 30 }, (_, i) => {
    const d = new Date("2026-06-06T12:00:00");
    d.setDate(d.getDate() - (29 - i));
    return { date: d.toISOString().slice(0, 10), revenue: 720 + (i % 7) * 45 };
  });

  const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hour >= 7 && hour <= 10 ? 18 + hour * 3 : hour >= 18 && hour <= 20 ? 8 + hour : 2,
  }));

  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const heatmap: { weekday: string; hour: number; count: number }[] = [];
  for (const w of weekdays) {
    for (let h = 0; h < 24; h++) {
      heatmap.push({ weekday: w, hour: h, count: h >= 7 && h <= 10 ? 12 : 1 });
    }
  }

  const products = [
    { name: "Großes Frühstück", count: 186, revenue: 1674, shareOfSalesPct: 28.4 },
    { name: "Croissant", count: 142, revenue: 426, shareOfSalesPct: 7.2 },
    { name: "Kaffee", count: 318, revenue: 954, shareOfSalesPct: 16.2 },
    { name: "Brötchen-Set", count: 98, revenue: 392, shareOfSalesPct: 6.6 },
    { name: "Obstteller", count: 76, revenue: 456, shareOfSalesPct: 7.7 },
  ];

  const totalOrders = 412;
  const totalRevenue = 5892;

  const raw = {
    summary: {
      orders: totalOrders,
      revenue: totalRevenue,
      itemsSold: 1028,
      averageOrderValue: Math.round((totalRevenue / totalOrders) * 100) / 100,
    },
    products: {
      topProducts: products.slice(0, 5).map((p) => ({ name: p.name, count: p.count })),
      productsBreakdown: products,
    },
    revenue: {
      revenuePerDay,
      revenuePerHour: ordersByHour.map((h) => ({ hour: h.hour, revenue: h.count * 6.8 })),
    },
    timeAnalytics: {
      ordersByHour,
      ordersByDay: revenuePerDay.map((d) => ({ date: d.date, count: 10 })),
      revenuePerHour: ordersByHour.map((h) => ({ hour: h.hour, revenue: h.count * 6.8 })),
      byWeekday: weekdays.map((weekday, i) => ({ weekday, orders: 42 + i * 5, revenue: 280 + i * 35 })),
      heatmap,
      afterHours: { orders: 38, revenue: 312, pctOfOrders: 9.2, averageOrderValue: 8.2 },
      peakHour: { hour: 9, count: 45 },
      peakDay: null,
      peakOrderHour: 9,
      peakRevenueHour: 10,
      peakWeekday: "Saturday",
      slowestWeekday: "Tuesday",
    },
    comparisons: { ordersLast7VsPrev7Pct: 12.4, revenueLast7VsPrev7Pct: 8.6 },
    registration: { onlineRegistrationFormsToday: 0, breakfastOrdersFromRegistration: 0 },
  };

  return {
    branch: {
      branch_id: DEMO_BRANCH_IDS.regensburg,
      branch_name: "AZUR Camping Regensburg",
      external_id: "DEMO-R",
      orders_count: totalOrders,
      revenue: totalRevenue,
      top_product: products[0]?.name ?? null,
      trend_pct: 8.6,
      items: products.slice(0, 5).map((p) => ({ name: p.name, count: p.count })),
      raw_data: raw,
      synced_at: null,
    },
    range: "Gesamter Zeitraum",
    range_kind: "all",
    start_date: "2020-01-01",
    end_date: "2026-06-06",
    comparison: {
      orders_pct: 12.4,
      revenue_pct: 8.6,
      prev_orders: 367,
      prev_revenue: 5428,
    },
    operations: {
      tomorrow_ymd: "2026-06-07",
      today_ymd: "2026-06-06",
      tomorrow: {
        orders: 38,
        revenue: 246,
        pending: 12,
        delivered: 24,
        not_picked_up: 2,
        floor_orders: 0,
        floor_revenue: 0,
      },
      today: {
        orders: 22,
        revenue: 134,
        pending: 3,
        delivered: 18,
        not_picked_up: 1,
        floor_orders: 5,
        floor_revenue: 28,
      },
    },
    period_comparison:
      compare === "wow" || compare === "mom" || compare === "yoy"
        ? {
            mode: compare,
            label: "Diese Woche vs. Vorwoche",
            current: { start: "2026-06-02", end: "2026-06-08", orders: 48, revenue: 312 },
            previous: { start: "2026-05-26", end: "2026-06-01", orders: 41, revenue: 278 },
            orders_pct: 17.1,
            revenue_pct: 12.2,
            chart: [
              { label: "Mo", current: 6, previous: 5 },
              { label: "Di", current: 7, previous: 6 },
              { label: "Mi", current: 8, previous: 7 },
              { label: "Do", current: 9, previous: 8 },
              { label: "Fr", current: 10, previous: 8 },
              { label: "Sa", current: 12, previous: 9 },
              { label: "So", current: 11, previous: 8 },
            ],
          }
        : null,
  };
}
