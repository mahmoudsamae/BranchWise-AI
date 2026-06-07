import { PublicOnboardingForm } from "@/components/onboarding/public-onboarding-form";

type Props = { params: Promise<{ token: string }> };

export const metadata = {
  title: "Onboarding Form — BranchWise",
};

export default async function PublicOnboardingPage({ params }: Props) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-[#0a0f1e] px-4 py-10 text-[#f9fafb]">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <p className="text-sm font-medium text-[#6366f1]">BranchWise</p>
      </div>
      <PublicOnboardingForm token={token} />
    </div>
  );
}
