import { ChangePasswordForm } from "@/components/account/change-password-form";

export function AccountSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#f9fafb]">Account Settings</h1>
        <p className="mt-2 text-base text-[#9ca3af]">Update your account password.</p>
      </div>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#f9fafb]">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
