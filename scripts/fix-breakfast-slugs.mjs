/** Fix wrong slug assignments — run: node scripts/fix-breakfast-slugs.mjs */
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

const fixes = [
  { match: "hannover", slug: "hannover" },
  { match: "regensburg", slug: "azur-camping-regensburg" },
  { match: "ingolstadt", slug: "ingolstadt" },
  { match: "wertheim", slug: "wertheim" },
  { match: "schw", slug: "schwbische" },
  { match: "altmuhl", slug: "altmuhltal" },
];

const branches = await sb("branches?select=id,name,external_id&order=name");

for (const f of fixes) {
  const row = branches.find((b) => b.name.toLowerCase().includes(f.match));
  if (row && row.external_id !== f.slug) {
    await sb(`branches?id=eq.${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ external_id: f.slug, is_active: true }),
    });
    console.log(`Fixed: ${row.name} -> ${f.slug}`);
  }
}

const altm = branches.filter((b) => b.name.toLowerCase().includes("altmuhl"));
if (altm.length === 0) {
  await sb("branches", {
    method: "POST",
    body: JSON.stringify({
      name: "AZUR Camping Altmühltal",
      external_id: "altmuhltal",
      is_active: true,
    }),
  });
  console.log("Created: AZUR Camping Altmühltal -> altmuhltal");
} else if (altm.length > 1) {
  const keep = altm[0];
  for (let i = 1; i < altm.length; i++) {
    await sb(`branches?id=eq.${altm[i].id}`, { method: "DELETE" });
    console.log(`Removed duplicate Altmühltal: ${altm[i].name}`);
  }
  if (keep.external_id !== "altmuhltal") {
    await sb(`branches?id=eq.${keep.id}`, {
      method: "PATCH",
      body: JSON.stringify({ external_id: "altmuhltal", is_active: true }),
    });
  }
}

const wertheimBranches = branches.filter((b) => normalize(b.name).includes("wertheim"));
if (wertheimBranches.length > 1) {
  const keep =
    wertheimBranches.find((b) => /Wertheim/.test(b.name)) ??
    wertheimBranches[0];
  for (const b of wertheimBranches) {
    if (b.id === keep.id) {
      if (b.external_id !== "wertheim") {
        await sb(`branches?id=eq.${b.id}`, {
          method: "PATCH",
          body: JSON.stringify({ external_id: "wertheim", is_active: true }),
        });
        console.log(`Fixed: ${b.name} -> wertheim`);
      }
    } else {
      await sb(`branches?id=eq.${b.id}`, { method: "DELETE" });
      console.log(`Removed duplicate: ${b.name}`);
    }
  }
} else if (wertheimBranches.length === 1 && wertheimBranches[0].external_id !== "wertheim") {
  await sb(`branches?id=eq.${wertheimBranches[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({ external_id: "wertheim", is_active: true }),
  });
  console.log(`Fixed: ${wertheimBranches[0].name} -> wertheim`);
}

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Dedupe by external_id (keep first by name)
const all = await sb("branches?select=id,name,external_id&order=name");
const bySlug = new Map();
for (const b of all) {
  const slug = b.external_id ?? `__none__${b.id}`;
  if (!bySlug.has(slug)) bySlug.set(slug, b);
  else {
    await sb(`branches?id=eq.${b.id}`, { method: "DELETE" });
    console.log(`Deduped: removed ${b.name} (${slug})`);
  }
}

const final = await sb("branches?select=name,external_id&order=name");
console.log("\nFinal:");
for (const b of final) console.log(`  ${b.external_id} — ${b.name}`);
