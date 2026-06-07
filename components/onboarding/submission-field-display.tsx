"use client";

import { ExternalLink, FileText, Mail, Phone } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import {
  isOnboardingFileValue,
  type OnboardingField,
  type OnboardingFileValue,
} from "@/lib/onboarding/template-fields";

function formatDisplayDate(raw: string) {
  if (!raw) return "—";
  try {
    const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(d);
  } catch {
    return raw;
  }
}

function displayText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function FieldShell({
  label,
  required,
  children,
  wide,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">
        {label}
        {required ? <span className="text-red-400/80"> *</span> : null}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function SubmissionFieldDisplay({ field, value }: { field: OnboardingField; value: unknown }) {
  if (field.type === "file") {
    const fileVal = isOnboardingFileValue(value) ? value : null;
    const signedUrl = fileVal && "signedUrl" in fileVal ? (fileVal as OnboardingFileValue & { signedUrl?: string }).signedUrl : null;

    return (
      <FieldShell label={field.label} required={field.required} wide>
        {fileVal ? (
          <a
            href={signedUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-[#1f2937] bg-[#0a0f1e] px-4 py-3 transition hover:border-[#6366f1]/40 hover:bg-[#0a0f1e]/80"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
              <FileText className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white group-hover:text-indigo-200">{fileVal.fileName}</span>
              <span className="text-xs text-[#6b7280]">Open document</span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-[#6b7280] group-hover:text-indigo-300" />
          </a>
        ) : (
          <p className="text-sm text-[#6b7280]">No file uploaded</p>
        )}
      </FieldShell>
    );
  }

  if (field.type === "boolean") {
    const yes = value === true || value === "true" || value === 1 || value === "1";
    return (
      <FieldShell label={field.label} required={field.required}>
        <Badge variant={yes ? "green" : "gray"}>{yes ? "Yes" : "No"}</Badge>
      </FieldShell>
    );
  }

  if (field.type === "textarea") {
    const text = displayText(value);
    return (
      <FieldShell label={field.label} required={field.required} wide>
        <p className="whitespace-pre-wrap rounded-xl border border-[#1f2937]/80 bg-[#0a0f1e]/60 px-4 py-3 text-sm leading-relaxed text-[#e5e7eb]">
          {text}
        </p>
      </FieldShell>
    );
  }

  if (field.type === "email") {
    const email = typeof value === "string" ? value.trim() : "";
    return (
      <FieldShell label={field.label} required={field.required}>
        {email ? (
          <a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#a5b4fc] hover:text-indigo-300 hover:underline">
            <Mail className="size-3.5 shrink-0 opacity-70" />
            {email}
          </a>
        ) : (
          <p className="text-sm text-[#6b7280]">—</p>
        )}
      </FieldShell>
    );
  }

  if (field.type === "phone") {
    const phone = typeof value === "string" ? value.trim() : "";
    return (
      <FieldShell label={field.label} required={field.required}>
        {phone ? (
          <a href={`tel:${phone}`} className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-indigo-200">
            <Phone className="size-3.5 shrink-0 text-[#6b7280]" />
            {phone}
          </a>
        ) : (
          <p className="text-sm text-[#6b7280]">—</p>
        )}
      </FieldShell>
    );
  }

  if (field.type === "date") {
    const raw = typeof value === "string" ? value : "";
    return (
      <FieldShell label={field.label} required={field.required}>
        <p className="text-sm font-medium text-white">{raw ? formatDisplayDate(raw) : "—"}</p>
      </FieldShell>
    );
  }

  const text = field.type === "select" ? displayText(value) : displayText(value);

  return (
    <FieldShell label={field.label} required={field.required}>
      <p className="text-sm font-medium text-white">{text}</p>
    </FieldShell>
  );
}
