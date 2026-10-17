"use client";
import { useEffect, useState } from "react";
import { obtenerSesion, Sesion, guardarSesion } from "@/lib/auth";
import {
  User, Mail, Phone, MapPin, Calendar, CheckCircle, Clock,
  AlertTriangle, Save, CreditCard, Lock, ShieldCheck, KeyRound, Edit3, X,
} from "lucide-react";
import {
  updateUsuario, listAccounts, cambiarClave, configurarPIN, obtenerStatusPIN, Cuenta,
} from "@/lib/api";
import { Loader2 } from "lucide-react";

function formatTelefono(tel: string | null | undefined) {
  if (!tel) return "";
  const clean = tel.replace(/\D/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return tel;
}

export default function ClientePerfilPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [exitoPerfil, setExitoPerfil] = useState<string | null>(null);

  // Campos editables
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [paisResidencia, setPaisResidencia] = useState("CO");
  const [fechaNac, setFechaNac] = useState("");

  // Campos bloqueados (solo lectura por seguridad bancaria)
  const [telefono, setTelefono] = useState("");
  const [cedula, setCedula] = useState("");
  const [fechaExp, setFechaExp] = useState("");
  const [fechaVenc, setFechaVenc] = useState("");
  const [paisExp, setPaisExp] = useState("CO");

  // Cambio de contraseña
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveConfirm, setClaveConfirm] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [claveOk, setClaveOk] = useState<string | null>(null);
  const [claveError, setClaveError] = useState<string | null>(null);

  // PIN de 4 dígitos (Nequi Style)
  const [tienePin, setTienePin] = useState(false);
  const [nuevoPin, setNuevoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [guardandoPin, setGuardandoPin] = useState(false);
  const [pinOk, setPinOk] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    const s = obtenerSesion();
    if (s) {
      setSesion(s);
      setNombre(s.usuario.nombre || "");
      setApellido(s.usuario.apellido || "");
      setEmail(s.usuario.email || "");
      setTelefono(s.usuario.telefono || "");
      setCedula(s.usuario.cedula || "");
      setPaisResidencia(s.usuario.pais_residencia || "CO");
      setFechaExp(s.usuario.fecha_expedicion || "");
      setFechaVenc(s.usuario.fecha_vencimiento || "");
      setPaisExp(s.usuario.pais_expedicion || "CO");
      setFechaNac(s.usuario.fecha_nacimiento || "");

      listAccounts().then((accs) => {
        const miCuenta = accs.find(c => c.id_usuario === s.usuario.id_usuario && c.estado === "activa");
        if (miCuenta) setCuenta(miCuenta);
      }).catch(err => console.error("Error al obtener cuenta:", err));

      obtenerStatusPIN(s.usuario.id_usuario)
        .then((r) => setTienePin(r.tiene_pin))
        .catch(() => {});
    }
  }, []);

  if (!sesion) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 size={40} className="text-white animate-spin" />
      <p className="text-sm text-neutral-400 font-semibold">Cargando perfil…</p>
    </div>
  );

  const u = sesion.usuario;
  const verificado = u.estado === "verificado";
  const celCuenta = u.telefono ? formatTelefono(u.telefono) : (cuenta?.numero_cuenta ?? "No asignada");

  const campos = [
    { label: "Número de cuenta bancaria", value: `📱 +57 ${celCuenta} (Tu Celular es tu Cuenta)`, icon: CreditCard, highlight: true },
    { label: "Documento de identidad", value: u.cedula ?? "No registrada", icon: ShieldCheck, locked: true },
    { label: "Teléfono celular / WhatsApp", value: `+57 ${formatTelefono(u.telefono)}`, icon: Phone, locked: true },
    { label: "Nombre completo", value: [u.nombre, u.apellido].filter(Boolean).join(" "), icon: User },
    { label: "Correo electrónico", value: u.email || "No registrado (puedes agregarlo editando tu perfil)", icon: Mail },
    { label: "País de residencia", value: u.pais_residencia, icon: MapPin },
    { label: "Fecha de nacimiento", value: u.fecha_nacimiento ?? "No registrada", icon: Calendar },
    { label: "Tipo de cuenta", value: cuenta ? (cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)) : "Ahorros Digital", icon: CreditCard },
    { label: "Estado de cuenta", value: cuenta?.estado.toUpperCase() ?? "ACTIVA", icon: verificado ? CheckCircle : AlertTriangle },
  ];

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorPerfil(null);
    setExitoPerfil(null);
    try {
      const res = await updateUsuario(u.id_usuario, {
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        email: email.trim().toLowerCase(),
        pais_residencia: paisResidencia.trim().toUpperCase(),
        fecha_nacimiento: fechaNac || undefined,
        fecha_expedicion: fechaExp || undefined,
        fecha_vencimiento: fechaVenc || undefined,
        pais_expedicion: paisExp || undefined,
      });

      guardarSesion(sesion!.token, res);
      setSesion({ ...sesion!, usuario: res });
      setExitoPerfil("Tu perfil ha sido actualizado exitosamente.");
      setEditing(false);
    } catch (err: unknown) {
      setErrorPerfil(err instanceof Error ? err.message : "Error al actualizar perfil");
    } finally {
      setLoading(false);
    }
  }

  async function handleCambiarClave(e: React.FormEvent) {
    e.preventDefault();
    setClaveOk(null); setClaveError(null);
    if (claveNueva.length < 6) { setClaveError("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    if (claveNueva !== claveConfirm) { setClaveError("La nueva contraseña y su confirmación no coinciden."); return; }
    setCambiando(true);
    try {
      const res = await cambiarClave(u.id_usuario, claveActual, claveNueva);
      setClaveOk(res?.mensaje ?? "Contraseña actualizada correctamente.");
      setClaveActual(""); setClaveNueva(""); setClaveConfirm("");
    } catch (err: unknown) {
      setClaveError(err instanceof Error ? err.message : "No fue posible cambiar la contraseña.");
    } finally { setCambiando(false); }
  }

  async function handleConfigurarPIN(e: React.FormEvent) {
    e.preventDefault();
    setPinOk(null);
    setPinError(null);
    if (nuevoPin.length !== 4 || !/^\d{4}$/.test(nuevoPin)) {
      setPinError("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }
    if (nuevoPin !== confirmarPin) {
      setPinError("Los dos PINs ingresados no coinciden.");
      return;
    }
    setGuardandoPin(true);
    try {
      await configurarPIN(sesion!.usuario.id_usuario, nuevoPin);
      setTienePin(true);
      setPinOk("PIN de 4 dígitos guardado exitosamente. Ahora puedes entrar a BankLite usando tu PIN.");
      setNuevoPin("");
      setConfirmarPin("");
    } catch {
      setPinError("No fue posible guardar el PIN. Intenta nuevamente.");
    } finally {
      setGuardandoPin(false);
    }
  }

  const inputClass = "w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 transition";
  const lockedInputClass = "w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3 text-sm text-neutral-500 cursor-not-allowed select-none";

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <User size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Mi Perfil</h1>
            <p className="text-sm text-neutral-400">Datos personales, correo y configuración de seguridad</p>
          </div>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setErrorPerfil(null); setExitoPerfil(null); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-neutral-100 text-black font-extrabold text-xs transition active:scale-95 shadow-lg shadow-white/10"
          >
            <Edit3 size={15} />
            <span>Editar Perfil</span>
          </button>
        )}
      </div>

      {/* Alertas */}
      {exitoPerfil && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 text-emerald-400 text-xs font-semibold animate-fade-in">
          <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{exitoPerfil}</span>
        </div>
      )}

      {errorPerfil && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400 text-xs font-semibold animate-fade-in">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{errorPerfil}</span>
        </div>
      )}

      {/* Estado KYC */}
      <div className={`rounded-2xl p-4 flex items-center gap-4 ${verificado ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-sky-500/10 border border-sky-500/20"}`}>
        {verificado
          ? <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
          : <Clock size={24} className="text-sky-400 flex-shrink-0" />}
        <div>
          <p className={`font-extrabold text-sm ${verificado ? "text-emerald-400" : "text-sky-400"}`}>
            {verificado ? "Identidad Verificada ante Fogafín" : "KYC Pendiente"}
          </p>
          <p className={`text-xs mt-0.5 ${verificado ? "text-emerald-400/70" : "text-sky-400/70"}`}>
            {verificado
              ? "Tu identidad y número de celular están vinculados a la red interoperable Bre-B."
              : "Estamos validando tu identidad o requiere atención."}
          </p>
        </div>
      </div>

      {/* FORMULARIO DE EDICIÓN DE PERFIL */}
      {editing ? (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-6 animate-fade-in border border-white/20">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">Editar Información Personal</h2>
              <p className="text-xs text-neutral-400">
                Puedes cambiar tu correo electrónico y datos personales. Tu celular y cédula están protegidos por seguridad bancaria.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-neutral-400 hover:text-white p-2 rounded-xl transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            {/* CAMPOS BLOQUEADOS (TELÉFONO Y CÉDULA) */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Lock size={14} />
                <span>Datos protegidos por seguridad bancaria</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    Número de Celular (Cuenta BankLite)
                  </label>
                  <div className="relative">
                    <input type="text" disabled value={`+57 ${formatTelefono(telefono)}`} className={lockedInputClass} />
                    <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Es tu número de cuenta y tu llave Bre-B. No se puede modificar directamente.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    Documento de Identidad
                  </label>
                  <div className="relative">
                    <input type="text" disabled value={cedula || "No registrada"} className={lockedInputClass} />
                    <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Vinculado a tu verificación de identidad oficial KYC.
                  </span>
                </div>
              </div>
            </div>

            {/* CAMPOS EDITABLES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Nombre
                </label>
                <input required type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Apellidos
                </label>
                <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} className={inputClass} />
              </div>

              {/* CORREO ELECTRÓNICO (TOTALMENTE EDITABLE) */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} />
                  <span>Correo Electrónico (Puedes cambiarlo o registrar uno nuevo)</span>
                </label>
                <input
                  required
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.06] border border-cyan-400/40 focus:border-cyan-400 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition shadow-sm shadow-cyan-500/10"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Aquí te llegarán los extractos y notificaciones de respaldo contable.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  País de Residencia
                </label>
                <input required type="text" maxLength={2} value={paisResidencia} onChange={(e) => setPaisResidencia(e.target.value.toUpperCase())} className={inputClass} />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Fecha de Nacimiento
                </label>
                <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-5 py-3 rounded-2xl text-xs font-bold text-neutral-400 hover:text-white border border-white/[0.08] hover:border-white/20 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-2xl text-xs font-extrabold bg-white hover:bg-neutral-100 text-black flex items-center gap-2 disabled:opacity-50 transition active:scale-95 shadow-lg shadow-white/10"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{loading ? "Guardando cambios…" : "Guardar Cambios"}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* VISTA DE DATOS PERSONALES */
        <div className="apple-glass-card rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white">Datos de tu Cuenta</h2>
            <button
              onClick={() => { setEditing(true); setErrorPerfil(null); setExitoPerfil(null); }}
              className="text-xs font-bold text-neutral-300 hover:text-white apple-glass-button rounded-xl px-3.5 py-1.5 transition flex items-center gap-1.5"
            >
              <Edit3 size={13} />
              <span>Editar</span>
            </button>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {campos.map((campo) => (
              <div key={campo.label} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    campo.highlight ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400" : "bg-white/[0.05] border border-white/[0.08] text-neutral-400"
                  }`}>
                    <campo.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{campo.label}</p>
                    <p className={`text-sm font-bold truncate mt-0.5 ${campo.highlight ? "text-cyan-300 font-mono" : "text-white"}`}>
                      {campo.value}
                    </p>
                  </div>
                </div>

                {campo.locked && (
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1 flex-shrink-0 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.06]">
                    <Lock size={11} /> Protegido
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PIN DE ACCESO RÁPIDO (4 DÍGITOS) - NEQUI STYLE */}
      <div className="apple-glass-card rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">PIN de Acceso Rápido (4 Dígitos)</h2>
              <p className="text-[11px] text-neutral-400">
                {tienePin ? "Tienes un PIN activo para iniciar sesión." : "Configura tu PIN de 4 números para entrar rápido."}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tienePin ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
            {tienePin ? "PIN Activo" : "Sin PIN"}
          </span>
        </div>

        <form onSubmit={handleConfigurarPIN} className="p-6 space-y-4">
          <p className="text-xs text-neutral-400">
            {tienePin
              ? "Para cambiar tu PIN actual, escribe los 4 dígitos nuevos y confirma."
              : "Crea tu clave numérica de 4 dígitos. Te servirá para entrar al banco sin contraseña escrita."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                {tienePin ? "Nuevo PIN (4 dígitos)" : "Escribe tu PIN (4 dígitos)"}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="••••"
                value={nuevoPin}
                onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3 text-center text-xl font-mono tracking-[0.4em] text-white focus:outline-none focus:border-purple-400/50 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Confirma tu PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="••••"
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3 text-center text-xl font-mono tracking-[0.4em] text-white focus:outline-none focus:border-purple-400/50 transition"
              />
            </div>
          </div>

          {pinOk && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={15} /> <span>{pinOk}</span>
            </div>
          )}
          {pinError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={15} /> <span>{pinError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={guardandoPin || nuevoPin.length !== 4 || confirmarPin.length !== 4}
              className="px-6 py-3 rounded-2xl text-xs font-extrabold bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black flex items-center gap-2 transition active:scale-95 shadow-lg shadow-purple-500/20"
            >
              {guardandoPin ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{guardandoPin ? "Guardando…" : tienePin ? "Actualizar PIN" : "Guardar mi PIN"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* CAMBIAR CONTRASEÑA */}
      <div className="apple-glass-card rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-neutral-400 flex items-center justify-center">
            <Lock size={18} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white">Seguridad de la Contraseña</h2>
            <p className="text-[11px] text-neutral-400">Actualiza tu clave de acceso al portal</p>
          </div>
        </div>

        <form onSubmit={handleCambiarClave} className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Contraseña actual</label>
              <input required type="password" placeholder="••••••••" value={claveActual} onChange={(e) => setClaveActual(e.target.value)} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Nueva contraseña (mín. 6)</label>
                <input required minLength={6} type="password" placeholder="••••••••" value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Confirmar contraseña</label>
                <input required minLength={6} type="password" placeholder="••••••••" value={claveConfirm} onChange={(e) => setClaveConfirm(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {claveOk && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={15} /> <span>{claveOk}</span>
            </div>
          )}
          {claveError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={15} /> <span>{claveError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={cambiando || !claveActual || !claveNueva}
              className="px-6 py-3 rounded-2xl text-xs font-extrabold apple-glass-button text-white flex items-center gap-2 disabled:opacity-40 transition active:scale-95"
            >
              {cambiando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{cambiando ? "Cambiando…" : "Cambiar Contraseña"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
