import { PublicCompanyForm } from "@/components/company-forms/public-form";
import { isCompanyFormModule } from "@/lib/company-forms/modules";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ module: string; token: string }> };

export default async function PublicFormPage({ params }: Props) {
  const { module, token } = await params;
  if (!isCompanyFormModule(module) || module === "incident") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] px-4 py-10 text-[#f9fafb]">
      <PublicCompanyForm module={module} token={token} apiPrefix={`/api/forms/${module}`} />
    </div>
  );
}
