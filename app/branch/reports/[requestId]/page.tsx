import { FillReportForm } from "@/components/branch/fill-report-form";

export default async function FillReportPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <FillReportForm requestId={requestId} />;
}
