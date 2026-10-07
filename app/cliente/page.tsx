"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { getLedgerBalance, listAccounts, listCards, Cuenta, Tarjeta, CuentaContable } from "@/lib/api";
import { CreditCard, ArrowRightLeft, FileText, User, Phone, Shield, Eye, EyeOff, Plus } from "lucide-react";
import Link from "next/link";

function formatCOP(valor: string | number | undefined | null): string {
  if (valor == null) return "—";
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function maskNumeroCuenta(nc: string | null | undefined): string {
  if (!nc) return "••••••••";
  return "****" + nc.slice(-4);
}

function maskNumeroTarjeta(nt: string | null | undefined): string {
  if (!nt) return "•••• •••• •••• ••••";
  const c = nt.replace(/\s/g, "");
  return `**** **** **** ${c.slice(-4)}`;
}

const ACCIONES = [
  {
    href: "/cliente/tarjetas",
    label: "Mis Tarjetas",
    desc: "Vea sus tarjetas y solicite nuevas",
    icon: CreditCard,
    bg: "from-purple-600 to-purple-800",
    shadow: "shadow-purple-500/30",
  },
  {
    href: "/cliente/transferencias",
    label: "Transferir Dinero",
    desc: "Envíe dinero de forma rápida y segura",
    icon: ArrowRightLeft,
    bg: "from-emerald-600 to-emerald-800",
    shadow: "shadow-emerald-500/30",
  },
  {
    href: "/cliente/movimientos",
    label: "Mis Movimientos",
    desc: "Vea el historial de transacciones",
    icon: FileText,
    bg: "from-amber-500 to-amber-700",
    shadow: "shadow-amber-500/30",
  },
  {
    href: "/cliente/perfil",
    label: "Mi Perfil",
    desc: "Actualice sus datos personales",
    icon: User,
    bg: "from-blue-600 to-blue-800",
    shadow: "shadow-blue-500/30",
  },
];

export default function ClienteDashboard() {
  const [nombre, setNombre] = useState("Cliente");
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(null);
  const [ledger, setLedger] = useState<CuentaContable | null>(null);
  const [mostrarSaldo, setMostrarSaldo] = useState(true);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) return;
    setNombre(s.usuario.nombre);

    async function cargar() {
      try {
        const cuentas = await listAccounts();
        const miCuenta = cuentas.find(
          (c) => c.id_usuario === s!.usuario.id_usuario && c.estado === "activa"
        );
        if (miCuenta) {
          setCuenta(miCuenta);
          const [bal, tarjetas] = await Promise.all([
            getLedgerBalance(miCuenta.id_cuenta),
            listCards(miCuenta.id_cuenta),
          ]);
          setLedger(bal);
          if (tarjetas.length > 0) setTarjeta(tarjetas[0]);
        }
      } catch {
        // silencioso — solo no se muestra el saldo
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-10">
      {/* Bienvenida */}
      <div className="flex items-center gap-4 pt-2">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/30 flex-shrink-0">
          {nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-slate-500 text-base font-semibold">Bienvenido/a de vuelta</p>
          <h1 className="text-2xl font-black text-slate-800 leading-tight">{nombre}</h1>
        </div>
      </div>

      {/* TARJETA DE SALDO — protagonista */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-8 shadow-2xl shadow-indigo-900/40 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-indigo-300 text-base font-semibold uppercase tracking-widest">
                Mi Saldo Disponible
              </p>
              <p className="text-indigo-200 text-sm mt-0.5">
                {cuenta
                  ? `${cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)} · ${maskNumeroCuenta(cuenta.numero_cuenta)}`
                  : "Sin cuenta activa"}
              </p>
            </div>
            <button
              onClick={() => setMostrarSaldo(!mostrarSaldo)}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
              title={mostrarSaldo ? "Ocultar saldo" : "Mostrar saldo"}
            >
              {mostrarSaldo ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          {cargando ? (
            <p className="text-5xl font-black animate-pulse">Cargando…</p>
          ) : cuenta ? (
            <p className="text-5xl sm:text-6xl font-black tracking-tight leading-none">
              {mostrarSaldo ? formatCOP(ledger?.saldo_actual) : "$ ••••••"}
            </p>
          ) : (
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-indigo-300">No tiene cuenta activa</p>
              <p className="text-indigo-400 text-sm mt-1">Contacte al banco para abrir su cuenta.</p>
            </div>
          )}

          {cuenta && (
            <p className="mt-3 text-indigo-300 font-semibold text-base">
              {cuenta.moneda}
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-white/20 flex items-center gap-2 text-indigo-200 text-sm font-semibold">
            <Shield size={16} />
            <span>Su dinero está protegido y asegurado por BankLite</span>
          </div>
        </div>
      </div>

      {/* Tarjeta asociada */}
      {tarjeta && (
        <div className="rounded-2xl bg-white border-2 border-slate-100 shadow-md p-6 flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
            <CreditCard size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Tarjeta Asociada</p>
            <p className="text-slate-800 text-xl font-black mt-0.5 font-mono">
              {maskNumeroTarjeta(tarjeta.numero_tarjeta)}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {tarjeta.tipo_tarjeta.charAt(0).toUpperCase() + tarjeta.tipo_tarjeta.slice(1)} ·{" "}
              <span
                className={`font-bold ${tarjeta.estado === "activa" ? "text-green-600" : "text-red-600"}`}
              >
                {tarjeta.estado.charAt(0).toUpperCase() + tarjeta.estado.slice(1)}
              </span>
            </p>
          </div>
          <Link
            href="/cliente/tarjetas"
            className="text-indigo-600 font-bold text-sm hover:underline flex-shrink-0"
          >
            Ver más →
          </Link>
        </div>
      )}

      {!tarjeta && !cargando && cuenta && (
        <Link
          href="/cliente/tarjetas"
          className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 p-6 hover:border-purple-500 hover:bg-purple-100 transition group"
        >
          <div className="h-12 w-12 rounded-xl bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center flex-shrink-0 transition">
            <Plus size={24} className="text-purple-600" />
          </div>
          <div>
            <p className="text-purple-800 font-black text-lg">Solicitar mi tarjeta</p>
            <p className="text-purple-600 text-sm">No tiene tarjetas aún. Solicite una ahora.</p>
          </div>
        </Link>
      )}

      {/* Acciones principales */}
      <div>
        <h2 className="text-2xl font-bold text-slate-700 mb-5">¿Qué desea hacer hoy?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ACCIONES.map((accion) => (
            <Link
              key={accion.href}
              href={accion.href}
              className={`bg-gradient-to-br ${accion.bg} text-white rounded-2xl p-6 shadow-xl ${accion.shadow} hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 flex items-center gap-4`}
            >
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <accion.icon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black">{accion.label}</h3>
                <p className="text-white/80 text-sm mt-0.5">{accion.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Aviso de ayuda */}
      <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-6 flex items-start gap-4">
        <Phone size={28} className="text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-bold text-blue-900">¿Necesita ayuda?</h3>
          <p className="text-blue-700 mt-1 text-base">
            Si tiene problemas con su cuenta, llame a nuestro centro de atención:
          </p>
          <p className="text-3xl font-black text-blue-800 mt-2">01 800 BANKLITE</p>
          <p className="text-sm text-blue-500 mt-1">Disponible de lunes a viernes, 8am – 6pm</p>
        </div>
      </div>
    </div>
  );
}
