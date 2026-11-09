import { redirect } from "next/navigation";

export default function LegacyCoordinatorQuarantineRedirectPage() {
  redirect("/lab/quality");
}
