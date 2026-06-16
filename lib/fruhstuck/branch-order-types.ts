export type BreakfastOrderStatus = "pending" | "delivered" | "not_picked_up" | string;

export type BreakfastOrderSource = "qr" | "staff" | string;

export type BranchBreakfastOrder = {
  id: number;
  order_number: number;
  customer_name: string;
  pickup_date: string;
  status: BreakfastOrderStatus;
  source: BreakfastOrderSource;
  total_amount: number;
  created_at: string;
  delivered_at: string | null;
  paid_at: string | null;
  items_summary: string;
  item_count: number;
};

export type BranchBreakfastSummary = {
  total_orders: number;
  revenue: number;
  pending_count: number;
  delivered_count: number;
  not_picked_up_count: number;
  staff_today_count: number;
  staff_today_revenue: number;
  qr_count: number;
  staff_count: number;
};

export type BranchBreakfastComparison = {
  mode: "wow" | "mom" | "yoy";
  label: string;
  current: { start: string; end: string; orders: number; revenue: number };
  previous: { start: string; end: string; orders: number; revenue: number };
  orders_pct: number | null;
  revenue_pct: number | null;
  chart: { label: string; current: number; previous: number }[];
};
