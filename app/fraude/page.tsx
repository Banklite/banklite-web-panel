import { redirect } from "next/navigation";
// Esta ruta fue movida a /admin/fraude
export default function OldPage() {
  redirect("/admin/fraude");
}
