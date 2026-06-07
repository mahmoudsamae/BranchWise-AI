import { PublicOpsHub } from "@/components/branch-ops/public-ops-hub";

type Props = { params: Promise<{ token: string }> };

export default async function PublicOpsPage({ params }: Props) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-[#0a0f1e] px-4 py-8 text-[#f9fafb]">
      <PublicOpsHub token={token} />
    </div>
  );
}
