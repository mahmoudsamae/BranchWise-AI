import { SubmissionDetail } from "@/components/company-forms/submission-detail";

type Props = { params: Promise<{ submissionId: string }> };

export default async function ShiftHandoverDetailPage({ params }: Props) {
  const { submissionId } = await params;
  return <SubmissionDetail module="shift_handover" submissionId={submissionId} />;
}
