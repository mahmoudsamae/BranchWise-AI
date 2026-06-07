export type BreakfastRange = "today" | "yesterday" | "last7days" | "last30days";

export const BREAKFAST_RANGES: BreakfastRange[] = ["today", "yesterday", "last7days", "last30days"];

export type BreakfastTopProduct = { name: string; count: number };

export type BreakfastProductBreakdown = {
  name: string;
  count: number;
  revenue: number;
  shareOfSalesPct: number;
  shareOfOrdersPct?: number;
};

export type BreakfastAnalyticsData = {
  summary: {
    orders: number;
    revenue: number;
    itemsSold: number;
    averageOrderValue: number;
  };
  products: {
    topProducts: BreakfastTopProduct[];
    productsBreakdown: BreakfastProductBreakdown[];
  };
  revenue: {
    revenueToday?: number;
    revenueLast7Days?: number;
    revenuePerDay: { date: string; revenue: number }[];
    revenuePerHour: { hour: number; revenue: number }[];
  };
  timeAnalytics: {
    ordersByHour: { hour: number; count: number }[];
    ordersByDay: { date: string; count: number }[];
    revenuePerHour: { hour: number; revenue: number }[];
    byWeekday: { weekday: string; orders: number; revenue: number }[];
    heatmap: { weekday: string; hour: number; count: number }[];
    afterHours: {
      orders: number;
      revenue: number;
      pctOfOrders: number;
      averageOrderValue: number;
    };
    peakHour: { hour: number | null; count: number } | null;
    peakDay: { date: string | null; count: number } | null;
    peakOrderHour: number | null;
    peakRevenueHour: number | null;
    peakWeekday: string | null;
    slowestWeekday: string | null;
  };
  comparisons: {
    ordersLast7VsPrev7Pct: number | null;
    revenueLast7VsPrev7Pct: number | null;
    ordersTodayVsYesterdayPct?: number | null;
  };
  registration: {
    onlineRegistrationFormsToday: number;
    breakfastOrdersFromRegistration: number;
    registrationToBreakfastConversion?: number;
  };
};

export type BreakfastAnalyticsResponse = {
  ok: boolean;
  branch: string;
  range: string;
  data: BreakfastAnalyticsData;
  error?: string;
};

/** Legacy shape in DB `items` jsonb; new API uses `count`. */
export type FruhstuckItemRow = { name: string; count: number; quantity?: number };

export type FruhstuckBranchPayload = {
  branch_id: string;
  branch_name: string;
  external_id: string;
  orders_count: number;
  revenue: number;
  top_product: string | null;
  trend_pct: number | null;
  items: BreakfastTopProduct[];
  raw_data: BreakfastAnalyticsData;
  synced_at?: string | null;
  date?: string;
};
