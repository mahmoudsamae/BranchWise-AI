"use client";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal markdown: paragraphs, **bold**, bullets, inline `code`. */
export function SimpleMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (/^[-*]\s/m.test(trimmed)) {
          const items = trimmed.split(/\n/).filter((l) => /^[-*]\s/.test(l));
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {items.map((line, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inlineFormat(line.replace(/^[-*]\s+/, "")) }} />
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
        );
      })}
    </div>
  );
}

function inlineFormat(raw: string) {
  let s = escapeHtml(raw);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code class=\"rounded bg-black/30 px-1 py-0.5 text-xs\">$1</code>");
  return s;
}
