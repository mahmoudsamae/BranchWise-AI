const SKIP_WORDS = new Set([
  "camping",
  "hotel",
  "restaurant",
  "branch",
  "filiale",
  "the",
  "and",
  "am",
  "der",
  "die",
  "das",
  "von",
]);

export type BranchPalette = {
  bg: string;
  border: string;
  text: string;
};

const BRANCH_PALETTES: BranchPalette[] = [
  { bg: "bg-indigo-500/15", border: "border-indigo-500/35", text: "text-indigo-200" },
  { bg: "bg-violet-500/15", border: "border-violet-500/35", text: "text-violet-200" },
  { bg: "bg-sky-500/15", border: "border-sky-500/35", text: "text-sky-200" },
  { bg: "bg-amber-500/15", border: "border-amber-500/35", text: "text-amber-200" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/35", text: "text-emerald-200" },
  { bg: "bg-rose-500/15", border: "border-rose-500/35", text: "text-rose-200" },
];

function meaningfulWords(name: string): string[] {
  const cleaned = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  return cleaned.split(" ").filter((w) => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()));
}

/** Single branch letter for compact badges (e.g. A for AZUR). */
export function branchLetter(name: string): string {
  const words = meaningfulWords(name);
  if (words.length === 0) {
    const c = name.replace(/[^\p{L}]/gu, "").charAt(0);
    return c ? c.toUpperCase() : "?";
  }
  return words[0]!.charAt(0).toUpperCase();
}

/** Short branch code for dense tables (e.g. AZRE). */
export function branchAbbrev(name: string): string {
  const words = meaningfulWords(name);
  if (words.length === 0) {
    const cleaned = name.replace(/[^\p{L}\p{N}]/gu, "").trim();
    return cleaned.slice(0, 3).toUpperCase() || "—";
  }
  if (words.length === 1) return words[0]!.slice(0, 4).toUpperCase();

  const first = words[0]!;
  const last = words[words.length - 1]!;
  return `${first.slice(0, 2)}${last.slice(0, 2)}`.toUpperCase().slice(0, 5);
}

export function branchPalette(name: string): BranchPalette {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return BRANCH_PALETTES[Math.abs(hash) % BRANCH_PALETTES.length]!;
}

export function branchDisplay(name: string) {
  return {
    letter: branchLetter(name),
    code: branchAbbrev(name),
    palette: branchPalette(name),
  };
}
