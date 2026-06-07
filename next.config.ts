/* Dev-only: relax TLS verification for corporate/Windows SSL issues (e.g. Supabase fetch). Not used in production. */
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;
