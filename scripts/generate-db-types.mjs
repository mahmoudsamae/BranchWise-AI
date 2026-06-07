import fs from "node:fs";
import path from "node:path";

const openapiPath = path.join(process.cwd(), "tmp-openapi.json");
const outPath = path.join(process.cwd(), "lib", "database.types.ts");

/** @type {Record<string, { required: string[]; properties: Record<string, { format?: string; type?: string; items?: { type?: string }; default?: unknown; description?: string }> }>} */
const extraTables = {
  report_comments: {
    required: ["id", "report_id", "user_id", "message"],
    properties: {
      id: { format: "uuid", type: "string", default: "gen_random_uuid()" },
      report_id: { format: "uuid", type: "string", description: "Foreign Key to `reports.id`" },
      user_id: { format: "uuid", type: "string", description: "Foreign Key to `users.id`" },
      message: { format: "text", type: "string" },
      created_at: { format: "timestamp with time zone", type: "string", default: "now()" },
    },
  },
  ai_summaries: {
    required: ["report_id", "summary", "generated_at"],
    properties: {
      report_id: { format: "uuid", type: "string", description: "Foreign Key to `reports.id`" },
      branch_id: { format: "uuid", type: "string", description: "Foreign Key to `branches.id`" },
      summary: { format: "text", type: "string" },
      generated_at: { format: "timestamp with time zone", type: "string", default: "now()" },
    },
  },
};

function mapFormat(prop) {
  const format = prop.format ?? "";
  const type = prop.type;

  if (format === "jsonb" || format === "json") return "Json";
  if (type === "integer" || type === "number" || format === "numeric") return "number";
  if (type === "boolean") return "boolean";
  if (type === "array" && prop.items?.type === "string") return "string[]";
  return "string";
}

function hasDefault(prop) {
  return prop.default !== undefined;
}

function parseRelationships(tableName, properties) {
  const relationships = [];
  for (const [column, prop] of Object.entries(properties)) {
    const desc = prop.description ?? "";
    const match = desc.match(/Foreign Key to `([^.`]+)\.([^`]+)`/);
    if (!match) continue;
    relationships.push({
      foreignKeyName: `${tableName}_${column}_fkey`,
      columns: [column],
      isOneToOne: false,
      referencedRelation: match[1],
      referencedColumns: [match[2]],
    });
  }
  return relationships;
}

function renderRelationships(relationships) {
  if (relationships.length === 0) return "[]";
  const items = relationships
    .map(
      (rel) => `          {
            foreignKeyName: "${rel.foreignKeyName}",
            columns: ${JSON.stringify(rel.columns)},
            isOneToOne: ${rel.isOneToOne},
            referencedRelation: "${rel.referencedRelation}",
            referencedColumns: ${JSON.stringify(rel.referencedColumns)},
          }`,
    )
    .join(",\n");
  return `[\n${items}\n        ]`;
}

function renderFields(properties, required, mode) {
  const lines = [];
  for (const [name, prop] of Object.entries(properties)) {
    const tsType = mapFormat(prop);
    const isRequired = required.includes(name);
    const nullable = !isRequired;

    if (mode === "Row") {
      lines.push(`          ${name}: ${tsType}${nullable ? " | null" : ""}`);
      continue;
    }

    if (mode === "Insert") {
      const optional = !isRequired || hasDefault(prop);
      const insertType = nullable ? `${tsType} | null` : tsType;
      lines.push(`          ${name}${optional ? "?" : ""}: ${insertType}`);
      continue;
    }

    const updateType = nullable ? `${tsType} | null` : tsType;
    lines.push(`          ${name}?: ${updateType}`);
  }
  return lines.join("\n");
}

function renderTable(name, def) {
  const required = def.required ?? [];
  const properties = def.properties ?? {};
  const relationships = parseRelationships(name, properties);

  return `      ${name}: {
        Row: {
${renderFields(properties, required, "Row")}
        }
        Insert: {
${renderFields(properties, required, "Insert")}
        }
        Update: {
${renderFields(properties, required, "Update")}
        }
        Relationships: ${renderRelationships(relationships)}
      }`;
}

const openapi = JSON.parse(fs.readFileSync(openapiPath, "utf8"));
const definitions = { ...openapi.definitions, ...extraTables };

const tableBlocks = Object.keys(definitions)
  .sort()
  .map((name) => renderTable(name, definitions[name]))
  .join("\n");

const output = `/** Generated from the live Supabase public schema. Regenerate with \`npm run db:types\`. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
${tableBlocks}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
`;

fs.writeFileSync(outPath, output);
console.log(`Wrote ${outPath} (${Object.keys(definitions).length} tables)`);
