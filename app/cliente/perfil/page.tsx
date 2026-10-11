"use client";
import { useEffect, useState } from "react";
import { obtenerSesion, Sesion, guardarSesion } from "@/lib/auth";
import { User, Mail, Phone, MapPin, Calendar, CheckCircle, Clock, AlertTriangle, Save, CreditCard, Lock } from "lucide-react";
import { updateUsuario, listAccounts, cambiarClave, Cuenta } from "@/lib/api";

export default function ClientePerfilPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);

  // Cambio de contraseña
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveConfirm, setClaveConfirm] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [claveOk, setClaveOk] = useState<string | null>(null);
  const [claveError, setClaveError] = useState<string | null>(null);
  
  // Form fields
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
      
      // Consultamos la cuenta para traer el numero oficial desde account-service
      listAccounts().then((accs) => {
        const miCuenta = accs.find(c => c.id_usuario === s.usuario.id_usuario && c.estado === "activa");
        if (miCuenta) setCuenta(miCuenta);
      }).catch(err => console.error("Error al obtener cuenta:", err));
    }
  }, []);

  if (!sesion) return null;
  const u = sesion.usuario;
  const verificado = u.estado === "verificado";
  const incomplete = !u.cedula || !u.fecha_expedicion || !u.fecha_vencimiento || !u.pais_expedicion || !u.fecha_nacimiento;

  const campos = [
    { label: "Documento de Identidad", value: u.cedula ?? "No registrada", icon: User },
    { label: "Nombre completo", value: [u.nombre, u.apellido].filter(Boolean).join(" "), icon: User },
    { label: "Correo electronico", value: u.email, icon: Mail },
    { label: "Telefono", value: u.telefono, icon: Phone },
    { label: "Pais de residencia", value: u.pais_residencia, icon: MapPin },
    { label: "Fecha de nacimiento", value: u.fecha_nacimiento ?? "No registrada", icon: Calendar },
    { label: "Número de cuenta", value: cuenta?.numero_cuenta ?? "No asignada", icon: CreditCard },
    { label: "Tipo de cuenta", value: cuenta ? (cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)) : "No asignada", icon: CreditCard },
    { label: "Estado de cuenta", value: cuenta?.estado.toUpperCase() ?? "INACTIVA", icon: verificado ? CheckCircle : AlertTriangle },
  ];

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateUsuario(u.id_usuario, {
        cedula,
        fecha_expedicion: fechaExp,
        fecha_vencimiento: fechaVenc,
        pais_expedicion: paisExp,
        fecha_nacimiento: fechaNac
      });
      guardarSesion(sesion!.token, res);
      setSesion({ ...sesion!, usuario: res });
      setEditing(false);
    } catch (err) {
      alert("Error al actualizar perfil");
    } finally {
      setLoading(false);
    }
  }

  async function handleCambiarClave(e: React.FormEvent) {
    e.preventDefault();
    setClaveOk(null);
    setClaveError(null);
    if (claveNueva.length < 6) {
      setClaveError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (claveNueva !== claveConfirm) {
      setClaveError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    setCambiando(true);
    try {
      const res = await cambiarClave(u.id_usuario, claveActual, claveNueva);
      setClaveOk(res?.mensaje ?? "Contraseña actualizada correctamente.");
      setClaveActual("");
      setClaveNueva("");
      setClaveConfirm("");
    } catch (err: unknown) {
      setClaveError(err instanceof Error ? err.message : "No fue posible cambiar la contraseña.");
    } finally {
      setCambiando(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-black text-slate-800">Mi Perfil</h1>
      <p className="text-lg text-slate-500">Aqui puede ver sus datos personales registrados.</p>

      {incomplete && !editing && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <AlertTriangle size={36} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-xl font-black text-amber-800">Informacion Incompleta</p>
              <p className="text-sm mt-1 text-amber-700">Debe completar su informacion personal para finalizar el proceso KYC.</p>
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl whitespace-nowrap transition">
            Completar Perfil
          </button>
        </div>
      )}

      {editing ? (
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8">
          <h2 className="text-xl font-bold mb-6">Completar Datos</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cédula</label>
                <input required type="text" inputMode="numeric" minLength={6} maxLength={10} pattern="[0-9]{6,10}" title="Solo números, entre 6 y 10 dígitos" value={cedula} onChange={e=>setCedula(e.target.value.replace(/\D/g, "").slice(0, 10))} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">País Expedición</label>
                <input required type="text" value={paisExp} onChange={e=>setPaisExp(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Expedición</label>
                <input required type="date" value={fechaExp} onChange={e=>setFechaExp(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Vencimiento</label>
                <input required type="date" value={fechaVenc} onChange={e=>setFechaVenc(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Nacimiento</label>
                <input required type="date" value={fechaNac} onChange={e=>setFechaNac(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={()=>setEditing(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl font-bold bg-brand-500 text-white hover:bg-brand-600 flex items-center gap-2">
                <Save size={18}/> {loading ? 'Guardando...' : 'Guardar Datos'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className={`rounded-2xl p-6 flex items-center gap-4 ${
            verificado ? "bg-green-50 border-2 border-green-300" : "bg-blue-50 border-2 border-blue-300"
          }`}>
            {verificado ? <CheckCircle size={36} className="text-green-600 flex-shrink-0" /> : <Clock size={36} className="text-blue-600 flex-shrink-0" />}
            <div>
              <p className={`text-xl font-black ${verificado ? "text-green-800" : "text-blue-800"}`}>
                {verificado ? "Identidad Verificada" : "KYC Pendiente"}
              </p>
              <p className={`text-sm mt-1 ${verificado ? "text-green-700" : "text-blue-700"}`}>
                {verificado ? "Su identidad ha sido verificada exitosamente." : "Estamos validando su identidad o requiere atención de un asesor."}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
            <div className="bg-brand-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Datos Personales</h2>
              {!incomplete && (
                <button onClick={() => setEditing(true)} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded font-semibold transition">
                  Editar
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {campos.map((campo) => (
                <div key={campo.label} className="px-6 py-5 flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-2xl text-slate-500">
                    <campo.icon size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{campo.label}</p>
                    <p className="text-base font-medium text-slate-800 mt-0.5">{campo.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
        <div className="bg-brand-600 text-white px-6 py-4 flex items-center gap-2">
          <Lock size={20} />
          <h2 className="text-lg font-bold">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handleCambiarClave} className="p-6 space-y-4">
          {claveOk && (
            <div className="bg-brand-50 border-2 border-brand-100 text-brand-700 rounded-2xl p-4 flex gap-2 items-center font-semibold">
              <CheckCircle size={20} className="flex-shrink-0" /> {claveOk}
            </div>
          )}
          {claveError && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-2xl p-4 flex gap-2 items-center font-semibold">
              <AlertTriangle size={20} className="flex-shrink-0" /> {claveError}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña actual</label>
            <input required type="password" autoComplete="current-password" value={claveActual} onChange={e=>setClaveActual(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nueva contraseña</label>
            <input required type="password" minLength={6} autoComplete="new-password" value={claveNueva} onChange={e=>setClaveNueva(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar nueva contraseña</label>
            <input required type="password" minLength={6} autoComplete="new-password" value={claveConfirm} onChange={e=>setClaveConfirm(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-brand-500 outline-none" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={cambiando} className="px-6 py-2.5 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white flex items-center gap-2 transition">
              <Save size={18}/> {cambiando ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
