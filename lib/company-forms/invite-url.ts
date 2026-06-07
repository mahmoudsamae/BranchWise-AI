import { appBaseUrl, appBaseUrlFromRequest } from "@/lib/email/app-url";

import { publicFormPath, type CompanyFormModule } from "./modules";

export function companyFormInviteUrl(module: CompanyFormModule, token: string, request?: Request): string {
  const base = request ? appBaseUrlFromRequest(request) : appBaseUrl();
  return `${base}${publicFormPath(module, token)}`;
}
