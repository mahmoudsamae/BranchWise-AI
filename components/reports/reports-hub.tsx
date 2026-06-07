"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ReportBuilderClient from "@/components/report-builder/report-builder-client";
import { ReportsList } from "@/components/reports/reports-list";
import { Button } from "@/components/ui/Button";
import type { TemplateType } from "@/lib/report-builder/template-fields";

export type ReportsHubView = "list" | "templates" | "send";

type Props = {
  basePath: "/dashboard" | "/hr";
  workspaceTitle: string;
  allowedTemplateTypes: readonly TemplateType[];
  defaultTemplateType?: TemplateType;
};

function parseView(raw: string | null): ReportsHubView {
  if (raw === "templates" || raw === "send") return raw;
  return "list";
}

export function ReportsHub({ basePath, workspaceTitle, allowedTemplateTypes, defaultTemplateType }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ReportsHubView>(() => parseView(searchParams.get("view")));

  useEffect(() => {
    setView(parseView(searchParams.get("view")));
  }, [searchParams]);

  const setViewAndUrl = useCallback(
    (next: ReportsHubView) => {
      setView(next);
      const path = `${basePath}/reports`;
      if (next === "list") router.replace(path);
      else router.replace(`${path}?view=${next}`);
    },
    [basePath, router],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Eingereichte Berichte einsehen, Formularvorlagen bearbeiten oder neue Anfragen an Filialen senden.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#1f2937] pb-4">
          <Button type="button" variant={view === "list" ? "primary" : "secondary"} onClick={() => setViewAndUrl("list")}>
            Alle Berichte
          </Button>
          <Button
            type="button"
            variant={view === "templates" ? "primary" : "secondary"}
            onClick={() => setViewAndUrl("templates")}
          >
            Vorlagen
          </Button>
          <Button type="button" variant={view === "send" ? "primary" : "secondary"} onClick={() => setViewAndUrl("send")}>
            Bericht anfordern
          </Button>
        </div>
      </header>

      {view === "list" ? (
        <ReportsList basePath={basePath} embedded />
      ) : (
        <ReportBuilderClient
          workspaceTitle={workspaceTitle}
          allowedTemplateTypes={allowedTemplateTypes}
          defaultTemplateType={defaultTemplateType}
          embedded
          initialTab={view === "send" ? "send" : "templates"}
          schedulesBasePath={basePath}
        />
      )}
    </div>
  );
}
