import { redirect } from "next/navigation";

export default function ResearchLayout({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  children,
}: {
  children: React.ReactNode;
}) {
  // Módulo de Investigación deshabilitado temporalmente para futuras mejoras
  redirect("/dashboard");
}
