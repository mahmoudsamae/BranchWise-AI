import { redirect } from "next/navigation";

export default function GmReportBuilderRedirectPage() {
  redirect("/dashboard/reports?view=templates");
}
