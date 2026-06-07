import { redirect } from "next/navigation";

export default function HrReportBuilderRedirectPage() {
  redirect("/hr/reports?view=templates");
}
