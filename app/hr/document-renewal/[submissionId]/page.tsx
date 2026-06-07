import { SubmissionDetail } from "@/components/company-forms/submission-detail";

type Props = { params: Promise<{ submissionId: string }> };

export default async function DocumentRenewalDetailPage({ params }: Props) {
  const { submissionId } = await params;
  return <SubmissionDetail module="document_renewal" submissionId={submissionId} />;
}
