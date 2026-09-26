"use client";
import { useEffect, useState } from "react";
import { obtenerSesion, Sesion, guardarSesion } from "@/lib/auth";
import { User, Mail, Phone, MapPin, Calendar, CheckCircle, Clock, AlertTriangle, Save } from "lucide-react";
import { updateUsuario } from "@/lib/api";

export default function ClientePerfilPage() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
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
    { label: "Servicio solicitado", value: u.servicio_solicitado ?? "No especificado", icon: User },
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
                <input required type="text" value={cedula} onChange={e=>setCedula(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-indigo-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">País Expedición</label>
                <input required type="text" value={paisExp} onChange={e=>setPaisExp(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-indigo-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Expedición</label>
                <input required type="date" value={fechaExp} onChange={e=>setFechaExp(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-indigo-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Vencimiento</label>
                <input required type="date" value={fechaVenc} onChange={e=>setFechaVenc(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-indigo-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha Nacimiento</label>
                <input required type="date" value={fechaNac} onChange={e=>setFechaNac(e.target.value)} className="w-full border-2 rounded-xl p-2.5 focus:border-indigo-600 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={()=>setEditing(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
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
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
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
    </div>
  );
}
