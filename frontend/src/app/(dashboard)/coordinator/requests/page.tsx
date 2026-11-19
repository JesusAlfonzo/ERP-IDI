import { redirect } from "next/navigation";

export default function LegacyCoordinatorRequestsRedirectPage() {
  redirect("/dashboard");
}
