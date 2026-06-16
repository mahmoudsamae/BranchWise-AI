import type { OpsColumn } from "@/lib/branch-ops/columns";
import type { OpsTimeGroup } from "@/lib/branch-ops/time-groups";

export type OpsTablePreset = {
  name: string;
  table_type: "log" | "daily";
  columns: OpsColumn[];
  daily_items?: { label: string; time_group: OpsTimeGroup; time_hint?: string }[];
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
    name: "Reception",
    table_type: "daily",
    columns: [],
    daily_items: [
      { label: "Kaffeemaschine vorbereiten", time_group: "morning", time_hint: "Wasser nachfüllen, Kaffeebohnen prüfen" },
      { label: "Empfangsbereich reinigen", time_group: "morning" },
      { label: "Reservierungsliste prüfen", time_group: "morning" },
      { label: "Wasserstation auffüllen", time_group: "morning" },
      { label: "Mittags-Check-in vorbereiten", time_group: "midday" },
      { label: "Gästefeedback sammeln", time_group: "midday" },
      { label: "Shop-Bestand prüfen", time_group: "midday" },
      { label: "Telefon & E-Mail abarbeiten", time_group: "midday" },
      { label: "Abend-Übergabe vorbereiten", time_group: "evening" },
      { label: "Kasse abrechnen", time_group: "evening" },
      { label: "Empfang für nächsten Tag vorbereiten", time_group: "evening" },
      { label: "Schlüssel & Pfand kontrollieren", time_group: "evening" },
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
