export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="max-w-xl space-y-3 rounded-xl border border-[#1f2937] bg-[#111827] p-8">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="text-sm text-[#9ca3af]">{description ?? "This section will be available in a future update."}</p>
    </div>
  );
}
