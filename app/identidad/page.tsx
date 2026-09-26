import { redirect } from "next/navigation";
// Esta ruta fue movida a /admin/usuarios
export default function OldPage() {
  redirect("/admin/usuarios");
}
