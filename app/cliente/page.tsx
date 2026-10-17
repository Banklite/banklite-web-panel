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
import {
  CreditCard,
  ArrowRightLeft,
  FileText,
  User,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
  Plus,
  Wallet,
  QrCode,
  Smartphone,
  Repeat,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  KeyRound,
} from "lucide-react";
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
  return "**** " + nc.slice(-4);
}

function formatNumeroCuenta(nc: string | null | undefined): string {
  if (!nc) return "Sin asignar";
  return nc.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3") || nc;
}

function maskNumeroTarjeta(nt: string | null | undefined): string {
  if (!nt) return "•••• •••• •••• ••••";
  const c = nt.replace(/\s/g, "");
  return `4532 •••• •••• ${c.slice(-4)}`;
}

export default function ClienteAppleDashboard() {
  const [nombre, setNombre] = useState("Cliente");
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(null);
  const [ledger, setLedger] = useState<CuentaContable | null>(null);
  const [movimientos, setMovimientos] = useState<Transferencia[]>([]);
  const [mostrarSaldo, setMostrarSaldo] = useState(true);
  const [cardFlipped, setCardFlipped] = useState(false);
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
        // Silencioso
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 font-sans text-neutral-100">
      {/* Encabezado con Estilo Apple OS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cuenta Verificada 2FA
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight apple-text-gradient">
              Hola, {nombre}
            </h1>
          </div>
        </div>

        {/* Acciones de Perfil */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarSaldo(!mostrarSaldo)}
            className="apple-glass px-4 py-2.5 rounded-full text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-2 transition"
          >
            {mostrarSaldo ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{mostrarSaldo ? "Ocultar saldos" : "Mostrar saldos"}</span>
          </button>
          <Link
            href="/cliente/perfil"
            className="apple-glass-button px-4 py-2.5 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 shadow"
          >
            <User size={15} />
            <span>Mi Perfil</span>
          </Link>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: Saldo Apple Titanium + Tarjeta 3D */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Tarjeta de Saldo Disponible (7 columnas) */}
        <div className="lg:col-span-7 apple-glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold">
                Saldo Disponible
              </span>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/10 text-neutral-300 font-semibold">
                {cuenta ? cuenta.moneda : "COP"}
              </span>
            </div>

            {cargando ? (
              <div className="animate-pulse space-y-3 py-2">
                <div className="h-14 bg-white/10 rounded-2xl w-3/4" />
                <div className="h-4 bg-white/5 rounded w-1/3" />
              </div>
            ) : (
              <div>
                <p
                  className={`text-4xl sm:text-5xl font-black tracking-tight leading-none text-white transition-all duration-300 ${
                    mostrarSaldo ? "" : "blur-md select-none opacity-60"
                  }`}
                >
                  {mostrarSaldo ? formatCOP(ledger?.saldo_actual) : "$ ••••••••"}
                </p>
                <p className="text-xs text-neutral-400 mt-2 font-mono flex items-center gap-1.5">
                  <span className="text-neutral-500">📱 Cuenta (Celular):</span>
                  <span className="text-emerald-400 font-bold">{cuenta ? cuenta.numero_cuenta : "Sin cuenta"}</span>
                </p>
              </div>
            )}
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Protegido por Fogafín & BankLite</span>
            </div>
            <Link
              href="/cliente/transferencias"
              className="text-white hover:text-emerald-400 font-bold flex items-center gap-1 group"
            >
              Transferir
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Tarjeta Bancaria Interactiva Apple Titanium (5 columnas) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="perspective-1000 w-full h-full min-h-[220px]">
            <div
              onClick={() => setCardFlipped(!cardFlipped)}
              className={`cursor-pointer w-full h-full transition-transform duration-700 transform-style-3d relative ${
                cardFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Cara Frontal: Apple Titanium Card */}
              <div className="w-full h-full min-h-[220px] rounded-3xl p-6 flex flex-col justify-between apple-glass-card border border-white/20 shadow-xl relative overflow-hidden select-none">
                <div className="absolute inset-0 titanium-shimmer pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <span className="font-bold tracking-tight text-white text-base">BankLite</span>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-8 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-inner" />
                    <span className="text-neutral-400 text-sm font-bold">)))</span>
                  </div>
                </div>

                <div className="space-y-3 relative z-10">
                  <p className="font-mono text-lg sm:text-xl tracking-[0.2em] text-neutral-100 font-semibold">
                    {tarjeta ? maskNumeroTarjeta(tarjeta.numero_tarjeta) : "4532 •••• •••• 9012"}
                  </p>
                  <div className="flex justify-between items-end text-[10px] text-neutral-400 uppercase tracking-widest">
                    <span className="font-bold text-neutral-200 text-xs">{nombre}</span>
                    <span className="font-mono text-neutral-300 text-xs">10/30</span>
                  </div>
                </div>
              </div>

              {/* Cara Trasera: Reverso con CVV Dinámico */}
              <div className="w-full h-full min-h-[220px] rounded-3xl py-6 flex flex-col justify-between apple-glass-card border border-white/20 shadow-xl absolute inset-0 rotate-y-180 backface-hidden select-none">
                <div className="w-full h-9 bg-neutral-900 border-y border-white/10 mt-1" />
                <div className="px-6 space-y-2">
                  <div className="flex justify-between items-center bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold">CVV Dinámico</span>
                    <span className="font-mono text-base font-extrabold text-emerald-400 tracking-widest">
                      842
                    </span>
                  </div>
                  <p className="text-[9px] text-neutral-500 text-center">Protección antifraude activa en compras web.</p>
                </div>
                <div className="px-6 text-[9px] text-neutral-400 flex justify-between">
                  <span>BankLite Card</span>
                  <span>Flip 3D</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center mt-2">
            <button
              onClick={() => setCardFlipped(!cardFlipped)}
              className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition"
            >
              <Repeat size={12} />
              {cardFlipped ? "Ver frente" : "Girar tarjeta (ver CVV)"}
            </button>
          </div>
        </div>
      </div>

      {/* BENTO GRID: Acciones Rápidas Estilo Apple iOS */}
      <div>
        <h2 className="text-lg font-bold text-neutral-300 mb-4 tracking-tight">
          Operaciones y Servicios
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          <Link
            href="/cliente/clave-dinamica"
            className="apple-glass-card rounded-2xl p-5 hover:border-amber-400/40 active:scale-[0.98] transition-all group flex flex-col justify-between gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <KeyRound size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Clave Dinámica</p>
              <p className="text-xs text-neutral-400 mt-0.5">Seguridad Nequi</p>
            </div>
          </Link>

          <Link
            href="/cliente/transferencias"
            className="apple-glass-card rounded-2xl p-5 hover:border-white/25 active:scale-[0.98] transition-all group flex flex-col justify-between gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Transferir</p>
              <p className="text-xs text-neutral-400 mt-0.5">Por celular Bre-B</p>
            </div>
          </Link>

          <Link
            href="/cliente/qr"
            className="apple-glass-card rounded-2xl p-5 hover:border-cyan-400/40 active:scale-[0.98] transition-all group flex flex-col justify-between gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <QrCode size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">QR & Bre-B</p>
              <p className="text-xs text-neutral-400 mt-0.5">Pagar por foto</p>
            </div>
          </Link>

          <Link
            href="/cliente/tarjetas"
            className="apple-glass-card rounded-2xl p-5 hover:border-white/25 active:scale-[0.98] transition-all group flex flex-col justify-between gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Tarjetas</p>
              <p className="text-xs text-neutral-400 mt-0.5">Límites y bloqueo</p>
            </div>
          </Link>

          <Link
            href="/cliente/movimientos"
            className="apple-glass-card rounded-2xl p-5 hover:border-white/25 active:scale-[0.98] transition-all group flex flex-col justify-between gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Extractos</p>
              <p className="text-xs text-neutral-400 mt-0.5">Historial contable</p>
            </div>
          </Link>

          <Link
            href="/cliente/perfil"
            className="apple-glass-card rounded-2xl p-5 hover:border-white/25 active:scale-[0.98] transition-all group flex flex-col justify-between gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Smartphone size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Seguridad 2FA</p>
              <p className="text-xs text-neutral-400 mt-0.5">WhatsApp y Claves</p>
            </div>
          </Link>
        </div>
      </div>

      {/* DETALLES DE CUENTA & ANALÍTICA DE GASTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta de Cuenta con Copiar Rápido */}
        {cuenta && (
          <div className="apple-glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Detalles de la Cuenta</h3>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {cuenta.estado}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Número de Cuenta (Tu Celular para recibir dinero)
              </span>
              <p className="text-2xl font-black font-mono tracking-wider text-emerald-400">
                📱 {cuenta.numero_cuenta}
              </p>
              <p className="text-xs text-neutral-300">
                Tu número de celular es tu número de cuenta oficial BankLite y tu llave Bre-B registrada.
              </p>
              <p className="text-xs text-neutral-400 pt-1">
                Tipo: {cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)} • Moneda: {cuenta.moneda}
              </p>
            </div>
          </div>
        )}

        {/* Analítica Visual de Gastos (Estilo Apple Wallet) */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white">Distribución de Gastos</h3>
            <span className="text-xs text-neutral-400">Este mes</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">💡 Servicios Públicos (EPM/Enel)</span>
                <span className="font-mono text-cyan-400 font-bold">45%</span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-[45%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">🛍️ Compras con Tarjeta</span>
                <span className="font-mono text-purple-400 font-bold">35%</span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full w-[35%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-300 font-medium">📲 Transferencias Enviadas</span>
                <span className="font-mono text-emerald-400 font-bold">20%</span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[20%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÚLTIMOS MOVIMIENTOS: Estilo Apple Transactions */}
      {cuenta && (
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Últimos Movimientos</h2>
              <p className="text-xs text-neutral-400">Registrados en doble partida contable por Ledger</p>
            </div>
            <Link
              href="/cliente/movimientos"
              className="apple-glass-button px-4 py-2 rounded-full text-xs font-semibold text-neutral-200 hover:text-white"
            >
              Ver todos →
            </Link>
          </div>

          {movimientos.length === 0 ? (
            <p className="text-neutral-500 text-sm py-6 text-center">
              No hay movimientos recientes en esta cuenta.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {movimientos.map((m) => (
                <div key={m.id_transferencia} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-300 flex items-center justify-center">
                      <ArrowRightLeft size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {m.concepto || "Transferencia bancaria"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(m.fecha_solicitud).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })} · {m.estado.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold font-mono text-white">
                    -{formatCOP(m.monto)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
