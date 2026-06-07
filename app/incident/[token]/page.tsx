import { IncidentPublicForm } from "@/components/company-forms/incident-public-form";

type Props = { params: Promise<{ token: string }> };

export default async function IncidentPublicPage({ params }: Props) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-[#0a0f1e] px-4 py-10 text-[#f9fafb]">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <p className="text-sm font-medium text-[#6366f1]">BranchWise — Incident Report</p>
      </div>
      <IncidentPublicForm token={token} />
    </div>
  );
}
