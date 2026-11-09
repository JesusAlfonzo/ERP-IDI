import { redirect } from "next/navigation";

export default function LegacyFridgeDetailRedirectPage() {
  redirect("/lab/fridges");
}
