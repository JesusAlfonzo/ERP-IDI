import { redirect } from "next/navigation";

export default function LabLayout({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  children,
}: {
  children: React.ReactNode;
}) {
  // Módulo de Laboratorio deshabilitado temporalmente para futuras mejoras
  redirect("/dashboard");
}
