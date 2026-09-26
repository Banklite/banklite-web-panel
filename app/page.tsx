"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";

/**
 * Pagina raiz: redirige al portal correcto segun el rol del usuario.
 * - Sin sesion -> /login
 * - role = admin -> /admin
 * - role = cliente -> /cliente
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      router.replace("/login");
    } else if (sesion.usuario.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/cliente");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-black text-2xl">B</span>
        </div>
        <p className="text-xl text-slate-600 font-semibold animate-pulse">Cargando BankLite...</p>
      </div>
    </div>
  );
}
