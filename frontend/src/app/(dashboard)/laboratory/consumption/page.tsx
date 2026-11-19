import { redirect } from "next/navigation";

export default function LegacyConsumptionRedirectPage() {
  redirect("/dashboard");
}
