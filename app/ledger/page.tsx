import { redirect } from "next/navigation";
// Esta ruta fue movida a /admin/ledger
export default function OldPage() {
  redirect("/admin/ledger");
}
