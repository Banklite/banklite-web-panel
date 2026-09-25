import { redirect } from "next/navigation";
// Esta ruta fue movida a /admin/cuentas
export default function OldPage() {
  redirect("/admin/cuentas");
}
