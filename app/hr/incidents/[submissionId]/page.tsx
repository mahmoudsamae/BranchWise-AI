import { SubmissionDetail } from "@/components/company-forms/submission-detail";

type Props = { params: Promise<{ submissionId: string }> };

export default async function IncidentDetailPage({ params }: Props) {
  const { submissionId } = await params;
  return <SubmissionDetail module="incident" submissionId={submissionId} />;
}
