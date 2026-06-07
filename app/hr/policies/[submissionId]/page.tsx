import { SubmissionDetail } from "@/components/company-forms/submission-detail";

type Props = { params: Promise<{ submissionId: string }> };

export default async function PolicyDetailPage({ params }: Props) {
  const { submissionId } = await params;
  return <SubmissionDetail module="policy" submissionId={submissionId} />;
}
