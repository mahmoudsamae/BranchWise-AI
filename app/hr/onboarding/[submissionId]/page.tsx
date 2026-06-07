import { SubmissionDetail } from "@/components/onboarding/submission-detail";

type Props = { params: Promise<{ submissionId: string }> };

export default async function HrOnboardingSubmissionPage({ params }: Props) {
  const { submissionId } = await params;
  return <SubmissionDetail submissionId={submissionId} />;
}
