import { redirect } from "next/navigation";
// Esta ruta fue movida a /admin/tarjetas
export default function OldPage() {
  redirect("/admin/tarjetas");
}
