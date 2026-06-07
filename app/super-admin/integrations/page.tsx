import { GooglePlacesApiSettings } from "@/components/super-admin/google-places-api-settings";

export default function SuperAdminIntegrationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Integrationen</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Zentrale API-Schlüssel und Verbindungen für das gesamte BranchWise-System.
        </p>
      </header>

      <GooglePlacesApiSettings />
    </div>
  );
}
