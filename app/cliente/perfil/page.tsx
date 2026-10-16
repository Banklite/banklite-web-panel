"use client";
import { useEffect, useState } from "react";
import { obtenerSesion, Sesion, guardarSesion } from "@/lib/auth";
import { User, Mail, Phone, MapPin, Calendar, CheckCircle, Clock, AlertTriangle, Save, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { updateUsuario, listAccounts, cambiarClave, Cuenta } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function ClientePerfilPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);

  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveConfirm, setClaveConfirm] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [claveOk, setClaveOk] = useState<string | null>(null);
  const [claveError, setClaveError] = useState<string | null>(null);

  const [cedula, setCedula] = useState("");
  const [fechaExp, setFechaExp] = useState("");
  const [fechaVenc, setFechaVenc] = useState("");
  const [paisExp, setPaisExp] = useState("CO");
  const [fechaNac, setFechaNac] = useState("");

  useEffect(() => {
    const s = obtenerSesion();
    if (s) {
      setSesion(s);
      setCedula(s.usuario.cedula || "");
      setFechaExp(s.usuario.fecha_expedicion || "");
      setFechaVenc(s.usuario.fecha_vencimiento || "");
      setPaisExp(s.usuario.pais_expedicion || "CO");
      setFechaNac(s.usuario.fecha_nacimiento || "");
      listAccounts().then((accs) => {
        const miCuenta = accs.find(c => c.id_usuario === s.usuario.id_usuario && c.estado === "activa");
        if (miCuenta) setCuenta(miCuenta);
      }).catch(err => console.error("Error al obtener cuenta:", err));
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
  const incomplete = !u.cedula || !u.fecha_expedicion || !u.fecha_vencimiento || !u.pais_expedicion || !u.fecha_nacimiento;

  const campos = [
    { label: "Documento de identidad", value: u.cedula ?? "No registrada", icon: User },
    { label: "Nombre completo", value: [u.nombre, u.apellido].filter(Boolean).join(" "), icon: User },
    { label: "Correo electrónico", value: u.email, icon: Mail },
    { label: "Teléfono / WhatsApp", value: u.telefono, icon: Phone },
    { label: "País de residencia", value: u.pais_residencia, icon: MapPin },
    { label: "Fecha de nacimiento", value: u.fecha_nacimiento ?? "No registrada", icon: Calendar },
    { label: "Número de cuenta", value: cuenta?.numero_cuenta ?? "No asignada", icon: CreditCard },
    { label: "Tipo de cuenta", value: cuenta ? (cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)) : "No asignada", icon: CreditCard },
    { label: "Estado de cuenta", value: cuenta?.estado.toUpperCase() ?? "INACTIVA", icon: verificado ? CheckCircle : AlertTriangle },
  ];

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateUsuario(u.id_usuario, { cedula, fecha_expedicion: fechaExp, fecha_vencimiento: fechaVenc, pais_expedicion: paisExp, fecha_nacimiento: fechaNac });
      guardarSesion(sesion!.token, res);
      setSesion({ ...sesion!, usuario: res });
      setEditing(false);
    } catch { alert("Error al actualizar perfil"); } finally { setLoading(false); }
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

  const inputClass = "w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 transition";

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-neutral-400">Datos personales y configuración de seguridad</p>
        </div>
      </div>

      {/* Estado KYC */}
      <div className={`rounded-2xl p-4 flex items-center gap-4 ${verificado ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-sky-500/10 border border-sky-500/20"}`}>
        {verificado
          ? <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
          : <Clock size={24} className="text-sky-400 flex-shrink-0" />}
        <div>
          <p className={`font-extrabold text-sm ${verificado ? "text-emerald-400" : "text-sky-400"}`}>
            {verificado ? "Identidad Verificada" : "KYC Pendiente"}
          </p>
          <p className={`text-xs mt-0.5 ${verificado ? "text-emerald-400/70" : "text-sky-400/70"}`}>
            {verificado ? "Tu identidad ha sido verificada exitosamente." : "Estamos validando tu identidad o requiere atención."}
          </p>
        </div>
      </div>

      {/* Alerta incompleto */}
      {incomplete && !editing && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-400 text-sm">Información incompleta</p>
              <p className="text-xs text-neutral-400 mt-0.5">Completa tu perfil para finalizar el proceso KYC.</p>
            </div>
          </div>
          <button onClick={() => setEditing(true)}
            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-bold py-2 px-5 rounded-xl text-sm transition whitespace-nowrap">
            Completar Perfil
          </button>
        </div>
      )}

      {/* Formulario edición */}
      {editing ? (
        <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-extrabold text-white">Completar Datos</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Cédula</label>
                <input required type="text" inputMode="numeric" minLength={6} maxLength={10} pattern="[0-9]{6,10}" value={cedula} onChange={e => setCedula(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">País Expedición</label>
                <input required type="text" value={paisExp} onChange={e => setPaisExp(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Fecha Expedición</label>
                <input required type="date" value={fechaExp} onChange={e => setFechaExp(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Fecha Vencimiento</label>
                <input required type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Fecha Nacimiento</label>
                <input required type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-neutral-400 hover:text-white border border-white/[0.08] hover:border-white/20 transition">Cancelar</button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white hover:bg-neutral-100 text-black flex items-center gap-2 disabled:opacity-50 transition">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {loading ? "Guardando…" : "Guardar Datos"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Datos del perfil */
        <div className="apple-glass-card rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white">Datos Personales</h2>
            {!incomplete && (
              <button onClick={() => setEditing(true)} className="text-xs font-semibold text-neutral-400 hover:text-white apple-glass-button rounded-xl px-3 py-1.5 transition">
                Editar
              </button>
            )}
          </div>
          <div className="divide-y divide-white/[0.05]">
            {campos.map((campo) => (
              <div key={campo.label} className="px-6 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-neutral-500 flex items-center justify-center flex-shrink-0">
                  <campo.icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">{campo.label}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{campo.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cambiar contraseña */}
      <div className="apple-glass-card rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-neutral-400 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <h2 className="text-sm font-extrabold text-white">Cambiar Contraseña</h2>
        </div>
        <form onSubmit={handleCambiarClave} className="p-6 space-y-4">
          {claveOk && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle size={16} className="flex-shrink-0" /> {claveOk}
            </div>
          )}
          {claveError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} className="flex-shrink-0" /> {claveError}
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Contraseña actual</label>
            <input required type="password" autoComplete="current-password" value={claveActual} onChange={e => setClaveActual(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Nueva contraseña</label>
            <input required type="password" minLength={6} autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={claveNueva} onChange={e => setClaveNueva(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Confirmar nueva contraseña</label>
            <input required type="password" minLength={6} autoComplete="new-password" placeholder="Repite la nueva contraseña" value={claveConfirm} onChange={e => setClaveConfirm(e.target.value)} className={inputClass} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={cambiando} className="bg-white hover:bg-neutral-100 disabled:opacity-40 text-black font-extrabold px-6 py-3 rounded-2xl text-sm flex items-center gap-2 transition active:scale-[0.98]">
              {cambiando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {cambiando ? "Actualizando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
