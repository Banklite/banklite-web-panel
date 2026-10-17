"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  ArrowRightLeft,
  FileText,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  ArrowUpRight,
  Repeat,
  Sparkles,
  Smartphone,
  KeyRound,
  QrCode,
  Copy,
  Check,
  Receipt,
} from "lucide-react";
import {
  Cuenta,
  Tarjeta,
  Transferencia,
  CuentaContable,
  listAccounts,
  listCards,
  listTransfers,
  getLedgerBalance,
} from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

function formatCOP(v: number | string | null | undefined): string {
  if (v == null) return "$ 0";
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "$ 0";
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
  return nc.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3") || nc;
}

function maskNumeroTarjeta(nt: string | null | undefined): string {
  if (!nt) return "4532 •••• •••• 9012";
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
  const [copiadoCuenta, setCopiadoCuenta] = useState(false);

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

  function handleCopiarNumero() {
    if (cuenta?.numero_cuenta) {
      navigator.clipboard.writeText(cuenta.numero_cuenta);
      setCopiadoCuenta(true);
      setTimeout(() => setCopiadoCuenta(false), 2000);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 font-sans text-slate-900">
      {/* Encabezado con Estilo Apple OS Light Glass */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-slate-900/15">
            {nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cuenta Verificada 2FA & Bre-B
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-0.5">
              Hola, {nombre}
            </h1>
          </div>
        </div>

        {/* Acciones de Perfil */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarSaldo(!mostrarSaldo)}
            className="apple-glass px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-2 transition active:scale-[0.97]"
          >
            {mostrarSaldo ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{mostrarSaldo ? "Ocultar saldos" : "Mostrar saldos"}</span>
          </button>
          <Link
            href="/cliente/perfil"
            className="apple-glass px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 shadow-sm transition active:scale-[0.97]"
          >
            <User size={15} />
            <span>Mi Perfil</span>
          </Link>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: Saldo Apple White Glass Glow + Tarjeta 3D */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Tarjeta de Saldo Disponible (7 columnas) */}
        <div className="lg:col-span-7 apple-glass-glow-emerald rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                Saldo Disponible en Cuenta
              </span>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200/60 text-emerald-800 font-bold">
                {cuenta ? cuenta.moneda : "COP"}
              </span>
            </div>

            {cargando ? (
              <div className="animate-pulse space-y-3 py-2">
                <div className="h-14 bg-slate-200/70 rounded-2xl w-3/4" />
                <div className="h-4 bg-slate-200/50 rounded w-1/3" />
              </div>
            ) : (
              <div>
                <p
                  className={`text-4xl sm:text-5xl font-black tracking-tight leading-none text-slate-950 transition-all duration-300 ${
                    mostrarSaldo ? "" : "blur-md select-none opacity-60"
                  }`}
                >
                  {mostrarSaldo ? formatCOP(ledger?.saldo_actual) : "$ ••••••••"}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-mono">
                    <span className="text-slate-500 font-sans font-semibold">📱 Cuenta / Celular:</span>
                    <span className="text-slate-900 font-black">{cuenta ? cuenta.numero_cuenta : "Sin cuenta"}</span>
                  </div>

                  {cuenta && (
                    <button
                      onClick={handleCopiarNumero}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition active:scale-[0.97]"
                      title="Copiar número de cuenta"
                    >
                      {copiadoCuenta ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiadoCuenta ? "Copiado" : "Copiar"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Protegido por Fogafín & Red Bre-B</span>
            </div>
            <Link
              href="/cliente/transferencias"
              className="apple-primary-button rounded-full px-5 py-2 font-bold text-xs flex items-center gap-1 group shadow"
            >
              <span>Transferir</span>
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Tarjeta Bancaria Interactiva Apple White Titanium (5 columnas) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="perspective-1000 w-full h-full min-h-[220px]">
            <div
              onClick={() => setCardFlipped(!cardFlipped)}
              className={`cursor-pointer w-full h-full transition-transform duration-700 transform-style-3d relative ${
                cardFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Cara Frontal: Apple White Titanium Card */}
              <div className="w-full h-full min-h-[220px] rounded-3xl p-6 flex flex-col justify-between apple-white-titanium shadow-2xl relative overflow-hidden select-none">
                <div className="absolute inset-0 titanium-shimmer pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <span className="font-extrabold tracking-tight text-slate-900 text-lg">BankLite</span>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-9 rounded-lg bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 shadow-sm border border-amber-400/40" />
                    <span className="text-slate-400 text-sm font-bold tracking-widest">)))</span>
                  </div>
                </div>

                <div className="space-y-3 relative z-10">
                  <p className="font-mono text-lg sm:text-xl tracking-[0.2em] text-slate-800 font-bold">
                    {tarjeta ? maskNumeroTarjeta(tarjeta.numero_tarjeta) : "4532 •••• •••• 9012"}
                  </p>
                  <div className="flex justify-between items-end text-[10px] text-slate-500 uppercase tracking-widest">
                    <span className="font-black text-slate-800 text-xs">{nombre}</span>
                    <span className="font-mono text-slate-600 text-xs font-bold">10/30</span>
                  </div>
                </div>
              </div>

              {/* Cara Trasera: Reverso con CVV Dinámico */}
              <div className="w-full h-full min-h-[220px] rounded-3xl py-6 flex flex-col justify-between apple-white-titanium shadow-2xl absolute inset-0 rotate-y-180 backface-hidden select-none">
                <div className="w-full h-10 bg-slate-800 mt-1 shadow-inner" />
                <div className="px-6 space-y-2">
                  <div className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">CVV Dinámico</span>
                    <span className="font-mono text-base font-extrabold text-emerald-600 tracking-widest">
                      842
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 text-center font-medium">
                    Protección antifraude activa en compras web.
                  </p>
                </div>
                <div className="px-6 text-[10px] font-bold text-slate-500 flex justify-between">
                  <span>Apple Titanium Edition</span>
                  <span className="text-sky-600">Flip 3D</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-2">
            <button
              onClick={() => setCardFlipped(!cardFlipped)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition active:scale-[0.97]"
            >
              <Repeat size={13} />
              <span>{cardFlipped ? "Ver frente de la tarjeta" : "Girar tarjeta (ver CVV dinámico)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* BENTO GRID: Acciones Rápidas Estilo Apple iOS */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 mb-4 tracking-tight">
          Operaciones y Servicios
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          <Link
            href="/cliente/clave-dinamica"
            className="apple-glass-card rounded-2xl p-5 active:scale-[0.97] group flex flex-col justify-between gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <KeyRound size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Clave Dinámica</p>
              <p className="text-xs text-slate-500 mt-0.5">Seguridad Nequi</p>
            </div>
          </Link>

          <Link
            href="/cliente/transferencias"
            className="apple-glass-card rounded-2xl p-5 active:scale-[0.97] group flex flex-col justify-between gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Transferir</p>
              <p className="text-xs text-slate-500 mt-0.5">Por celular Bre-B</p>
            </div>
          </Link>

          <Link
            href="/cliente/qr"
            className="apple-glass-card rounded-2xl p-5 active:scale-[0.97] group flex flex-col justify-between gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <QrCode size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">QR & Bre-B</p>
              <p className="text-xs text-slate-500 mt-0.5">Cámara y cobro</p>
            </div>
          </Link>

          <Link
            href="/cliente/tarjetas"
            className="apple-glass-card rounded-2xl p-5 active:scale-[0.97] group flex flex-col justify-between gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Tarjetas</p>
              <p className="text-xs text-slate-500 mt-0.5">Límites y bloqueo</p>
            </div>
          </Link>

          <Link
            href="/cliente/movimientos"
            className="apple-glass-card rounded-2xl p-5 active:scale-[0.97] group flex flex-col justify-between gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Receipt size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Movimientos</p>
              <p className="text-xs text-slate-500 mt-0.5">Tipo Nequi & QR</p>
            </div>
          </Link>

          <Link
            href="/cliente/perfil"
            className="apple-glass-card rounded-2xl p-5 active:scale-[0.97] group flex flex-col justify-between gap-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Smartphone size={22} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Seguridad 2FA</p>
              <p className="text-xs text-slate-500 mt-0.5">Perfil y WhatsApp</p>
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
              <h3 className="font-extrabold text-base text-slate-900">Detalles de la Cuenta</h3>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200">
                {cuenta.estado}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Número de Cuenta (Tu Celular para recibir dinero)
              </span>
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-slate-900">
                  📱 {formatNumeroCuenta(cuenta.numero_cuenta)}
                </p>
                <button
                  onClick={handleCopiarNumero}
                  className="apple-glass-button px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5"
                >
                  {copiadoCuenta ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiadoCuenta ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Tu número celular es tu identificador oficial en BankLite y tu llave Bre-B registrada.
              </p>
              <p className="text-xs text-slate-500 pt-1 font-mono">
                Tipo: {cuenta.tipo_cuenta.toUpperCase()} • Moneda: {cuenta.moneda}
              </p>
            </div>
          </div>
        )}

        {/* Analítica Visual de Gastos (Estilo Apple Wallet) */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">Distribución de Gastos</h3>
            <span className="text-xs font-bold text-slate-500">Este mes</span>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 font-semibold">💡 Servicios Públicos (EPM/Enel)</span>
                <span className="font-mono text-sky-600 font-bold">45%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-sky-400 to-blue-600 h-full w-[45%] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 font-semibold">🛍️ Compras con Tarjeta</span>
                <span className="font-mono text-purple-600 font-bold">35%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-purple-400 to-indigo-600 h-full w-[35%] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 font-semibold">📲 Transferencias Enviadas</span>
                <span className="font-mono text-emerald-600 font-bold">20%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-400 to-teal-600 h-full w-[20%] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÚLTIMOS MOVIMIENTOS: Estilo Apple Transactions */}
      {cuenta && (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Últimos Movimientos</h2>
              <p className="text-xs text-slate-500">Registrados en doble partida contable por Ledger</p>
            </div>
            <Link
              href="/cliente/movimientos"
              className="apple-glass-button px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-slate-950 shadow-sm"
            >
              Ver todos →
            </Link>
          </div>

          {movimientos.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">
              No hay movimientos recientes en esta cuenta.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {movimientos.map((m) => (
                <div key={m.id_transferencia} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shadow-sm">
                      <ArrowRightLeft size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {m.concepto || "Transferencia bancaria"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(m.fecha_solicitud).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })} · {m.estado.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-black font-mono text-slate-900">
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
