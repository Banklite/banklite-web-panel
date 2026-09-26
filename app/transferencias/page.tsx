import { redirect } from "next/navigation";
// Esta ruta fue movida a /admin/transferencias
export default function OldPage() {
  redirect("/admin/transferencias");
}
