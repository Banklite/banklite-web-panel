"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  getLedgerBalance,
  listAccounts,
  listCards,
  listTransfers,
  Cuenta,
  Tarjeta,
  CuentaContable,
  Transferencia,
} from "@/lib/api";
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

function formatNumeroCuenta(nc: string | null | undefined): string {
  // Muestra el número completo en grupos de 2-3 dígitos para legibilidad
  if (!nc) return "Sin asignar";
  return nc.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3") || nc;
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
    bg: "from-brand-500 to-brand-700",
    shadow: "shadow-brand-500/30",
  },
  {
    href: "/cliente/transferencias",
    label: "Transferir Dinero",
    desc: "Envíe dinero de forma rápida y segura",
    icon: ArrowRightLeft,
    bg: "from-brand-600 to-brand-900",
    shadow: "shadow-brand-600/30",
  },
  {
    href: "/cliente/movimientos",
    label: "Mis Movimientos",
    desc: "Vea el historial de transacciones",
    icon: FileText,
    bg: "from-brand-500 to-brand-600",
    shadow: "shadow-brand-500/30",
  },
  {
    href: "/cliente/perfil",
    label: "Mi Perfil",
    desc: "Actualice sus datos personales",
    icon: User,
    bg: "from-brand-700 to-brand-900",
    shadow: "shadow-brand-700/30",
  },
];

export default function ClienteDashboard() {
  const [nombre, setNombre] = useState("Cliente");
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(null);
  const [ledger, setLedger] = useState<CuentaContable | null>(null);
  const [movimientos, setMovimientos] = useState<Transferencia[]>([]);
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
          const [bal, tarjetas, transferencias] = await Promise.all([
            getLedgerBalance(miCuenta.id_cuenta),
            listCards(miCuenta.id_cuenta),
            listTransfers().catch(() => [] as Transferencia[]),
          ]);
          setLedger(bal);
          if (tarjetas.length > 0) setTarjeta(tarjetas[0]);
          setMovimientos(
            transferencias
              .filter((t) => t.id_cuenta_origen === miCuenta.id_cuenta)
              .sort(
                (a, b) =>
                  new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime()
              )
              .slice(0, 5)
          );
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
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-brand-500/30 flex-shrink-0">
          {nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-slate-500 text-base font-semibold">Bienvenido/a de vuelta</p>
          <h1 className="text-2xl font-black text-slate-800 leading-tight">{nombre}</h1>
        </div>
      </div>

      {/* TARJETA DE SALDO — protagonista */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 text-white p-8 shadow-2xl shadow-brand-900/40 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-brand-100 text-base font-semibold uppercase tracking-widest">
                Mi Saldo Disponible
              </p>
              <p className="text-brand-100/80 text-sm mt-0.5">
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
            <div className="animate-pulse space-y-3">
              <div className="h-12 bg-white/20 rounded-xl w-3/4" />
              <div className="h-4 bg-white/15 rounded w-1/3" />
            </div>
          ) : cuenta ? (
            <p className="text-5xl sm:text-6xl font-black tracking-tight leading-none">
              {mostrarSaldo ? formatCOP(ledger?.saldo_actual) : "$ ••••••"}
            </p>
          ) : (
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-brand-100">No tiene cuenta activa</p>
              <p className="text-brand-100/70 text-sm mt-1">Contacte al banco para abrir su cuenta.</p>
            </div>
          )}

          {cuenta && (
            <p className="mt-3 text-brand-100 font-semibold text-base">
              {cuenta.moneda}
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-white/20 flex items-center gap-2 text-brand-100 text-sm font-semibold">
            <Shield size={16} />
            <span>Su dinero está protegido y asegurado por BankLite</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN MI CUENTA — número de cuenta visible */}
      {cuenta && (
        <div className="rounded-2xl bg-white border-2 border-slate-100 shadow-md p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <User size={22} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Mi Cuenta</h2>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{cuenta.estado.toUpperCase()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Tipo</p>
              <p className="text-base font-bold text-slate-800">
                {cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Moneda</p>
              <p className="text-base font-bold text-slate-800">{cuenta.moneda}</p>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 col-span-2">
              <p className="text-xs text-brand-600 font-bold uppercase tracking-wider mb-1">Número de Cuenta</p>
              <p className="text-2xl font-black text-brand-700 font-mono tracking-widest">
                {formatNumeroCuenta(cuenta.numero_cuenta)}
              </p>
              <p className="text-xs text-brand-500 mt-1">Use este número para recibir transferencias</p>
            </div>
          </div>
        </div>
      )}
      {/* Tarjeta asociada */}
      {tarjeta && (
        <div className="rounded-2xl bg-white border-2 border-slate-100 shadow-md p-6 flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
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
                className={`font-bold ${tarjeta.estado === "activa" ? "text-brand-600" : "text-red-600"}`}
              >
                {tarjeta.estado.charAt(0).toUpperCase() + tarjeta.estado.slice(1)}
              </span>
            </p>
          </div>
          <Link
            href="/cliente/tarjetas"
            className="text-brand-600 font-bold text-sm hover:underline flex-shrink-0"
          >
            Ver más →
          </Link>
        </div>
      )}

      {!tarjeta && !cargando && cuenta && (
        <Link
          href="/cliente/tarjetas"
          className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-brand-500/40 bg-brand-50 p-6 hover:border-brand-500 hover:bg-brand-100 transition group"
        >
          <div className="h-12 w-12 rounded-xl bg-brand-100 group-hover:bg-brand-500/20 flex items-center justify-center flex-shrink-0 transition">
            <Plus size={24} className="text-brand-600" />
          </div>
          <div>
            <p className="text-brand-900 font-black text-lg">Solicitar mi tarjeta</p>
            <p className="text-brand-600 text-sm">No tiene tarjetas aún. Solicite una ahora.</p>
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

      {/* Últimos movimientos */}
      {cuenta && (
        <div className="rounded-2xl bg-white border-2 border-slate-100 shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800">Últimos movimientos</h2>
            <Link href="/cliente/movimientos" className="text-brand-600 font-bold text-sm hover:underline">
              Ver todos →
            </Link>
          </div>
          {movimientos.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">Aún no tiene movimientos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {movimientos.map((m) => (
                <li key={m.id_transferencia} className="py-3 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <ArrowRightLeft size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {m.concepto || "Transferencia enviada"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(m.fecha_solicitud).toLocaleDateString("es-CO")} · {m.estado}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-800">-{formatCOP(m.monto)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Aviso de ayuda */}
      <div className="rounded-2xl bg-brand-50 border-2 border-brand-100 p-6 flex items-start gap-4">
        <Phone size={28} className="text-brand-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-bold text-brand-900">¿Necesita ayuda?</h3>
          <p className="text-brand-700 mt-1 text-base">
            Si tiene problemas con su cuenta, llame a nuestro centro de atención:
          </p>
          <p className="text-3xl font-black text-brand-700 mt-2">01 800 BANKLITE</p>
          <p className="text-sm text-brand-600 mt-1">Disponible de lunes a viernes, 8am – 6pm</p>
        </div>
      </div>
    </div>
  );
}
