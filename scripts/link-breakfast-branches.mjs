/**
 * One-off: link BranchWise branches to breakfast-order slugs.
 * Run: node scripts/link-breakfast-branches.mjs
 * Requires .env.local (loads via dotenv if present) or env vars set.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const breakfastUrl = (process.env.BREAKFAST_API_BASE_URL ?? "").replace(/\/$/, "");
const token = process.env.BREAKFAST_INTEGRATION_TOKEN;

if (!url || !key || !breakfastUrl || !token) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREAKFAST_API_BASE_URL, BREAKFAST_INTEGRATION_TOKEN");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function sb(path, opts = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method ?? "GET"} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;
  const ap = na.split(" ").filter((p) => p.length > 2);
  const bp = nb.split(" ").filter((p) => p.length > 2);
  let hits = 0;
  for (const p of ap) if (bp.some((q) => q.includes(p) || p.includes(q))) hits++;
  return hits * 15;
}

const breakfastRes = await fetch(`${breakfastUrl}/api/branches`, {
  headers: { "x-integration-token": token },
});
const breakfastJson = await breakfastRes.json();
if (!breakfastRes.ok) {
  console.error("Breakfast API failed:", breakfastJson);
  process.exit(1);
}

const bwBranches = await sb("branches?select=id,name,external_id&order=name");
const used = new Set();

for (const bb of breakfastJson.branches ?? []) {
  const slug = String(bb.slug ?? "").trim().toLowerCase();
  if (!slug || !bb.is_active) continue;

  let best = null;
  for (const bw of bwBranches) {
    if (used.has(bw.id)) continue;
    const s = scoreMatch(bw.name, bb.name);
    if (s >= 30 && (!best || s > best.score)) best = { ...bw, score: s };
  }

  if (best) {
    await sb(`branches?id=eq.${best.id}`, {
      method: "PATCH",
      body: JSON.stringify({ external_id: slug, is_active: true }),
    });
    used.add(best.id);
    console.log(`Linked: ${best.name} -> ${slug}`);
  } else {
    const created = await sb("branches", {
      method: "POST",
      body: JSON.stringify({ name: bb.name, external_id: slug, is_active: true }),
    });
    used.add(created[0].id);
    console.log(`Created: ${bb.name} -> ${slug}`);
  }
}

const analyticsRes = await fetch(
  `${breakfastUrl}/api/integration/analytics?branch=hannover&range=today`,
  { headers: { "x-integration-token": token } },
);
console.log("\nAnalytics endpoint:", analyticsRes.status === 404 ? "NOT DEPLOYED (404)" : `HTTP ${analyticsRes.status}`);

const final = await sb("branches?select=name,external_id,is_active&order=name");
console.log("\nBranches in Supabase:");
for (const b of final) console.log(`  ${b.external_id ?? "(no slug)"} — ${b.name}`);
