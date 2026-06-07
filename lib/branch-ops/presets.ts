import type { OpsColumn } from "@/lib/branch-ops/columns";

export type OpsTablePreset = {
  name: string;
  table_type: "log" | "daily";
  columns: OpsColumn[];
  daily_items?: string[];
};

export const OPS_TABLE_PRESETS: OpsTablePreset[] = [
  {
    name: "Pfand / Cables",
    table_type: "log",
    columns: [
      { id: "table_spot", type: "text", label: "Table / Spot", required: true },
      { id: "guest_name", type: "text", label: "Guest name", required: false },
      { id: "staff_given", type: "staff", label: "Staff (gave cable)", required: true },
      { id: "pfand_amount", type: "number", label: "Pfand (€)", required: true },
      { id: "returned", type: "boolean", label: "Cable returned?", required: false },
      { id: "staff_returned", type: "staff", label: "Staff (received return)", required: false },
    ],
  },
  {
    name: "Daily Reception Tasks",
    table_type: "daily",
    columns: [],
    daily_items: [
      "Backen / bakery prep (from 06:00)",
      "Fill coffee machine",
      "Refill water station",
      "Clean reception area",
      "Check reservation list",
    ],
  },
  {
    name: "Product Control",
    table_type: "log",
    columns: [
      { id: "product", type: "text", label: "Product", required: true },
      { id: "qty_morning", type: "number", label: "Qty morning", required: false },
      { id: "qty_evening", type: "number", label: "Qty evening", required: false },
      { id: "staff", type: "staff", label: "Checked by", required: true },
      { id: "notes", type: "textarea", label: "Notes", required: false },
    ],
  },
];
