"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { listCards, listAccounts, Tarjeta, Cuenta } from "@/lib/api";
import { CreditCard, Eye, EyeOff, Lock, CheckCircle, AlertCircle, Plus, Send } from "lucide-react";

const TIPOS_TARJETA = [
  "Tarjeta de Crédito Gold",
  "Tarjeta de Crédito Platinum",
  "Tarjeta Débito Contactless",
  "Tarjeta Virtual Digital",
];

export default function ClienteTarjetasPage() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [mostrarNumero, setMostrarNumero] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tipoSolicitado, setTipoSolicitado] = useState(TIPOS_TARJETA[0]);
  const [motivoSolicitud, setMotivoSolicitud] = useState("");
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    async function cargar() {
      try {
        const [t, c] = await Promise.all([listCards(), listAccounts()]);
        const misCuentas = new Set(c.filter(cu => cu.id_usuario === sesion?.usuario.id_usuario).map(cu => cu.id_cuenta));
        setTarjetas(t.filter(ta => misCuentas.has(ta.id_cuenta)));
        setCuentas(c);
      } catch {
        setError("No pudimos cargar sus tarjetas. Intente nuevamente o contacte soporte.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  function toggleNumero(id: string) {
    setMostrarNumero(prev => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) return <div className="text-center py-16 text-2xl text-slate-400 animate-pulse">Cargando sus tarjetas...</div>;
  if (error) return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 flex items-center gap-4">
      <AlertCircle size={32} className="text-red-500 flex-shrink-0" />
      <p className="text-red-800 text-lg font-semibold">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Mis Tarjetas</h1>
          <p className="text-lg text-slate-500">Aqui puede ver todas sus tarjetas bancarias.</p>
        </div>
        <button
          onClick={() => { setMostrarModal(true); setSolicitudEnviada(false); setMotivoSolicitud(""); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-colors text-base"
        >
          <Plus size={20} /> Solicitar Tarjeta
        </button>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-5">
            {solicitudEnviada ? (
              <div className="text-center py-4">
                <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-green-700 mb-2">Solicitud Enviada</h2>
                <p className="text-slate-600 mb-6">Su solicitud de tarjeta <strong>{tipoSolicitado}</strong> ha sido registrada. Un asesor le contactará pronto.</p>
                <button onClick={() => setMostrarModal(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-2xl transition-colors">Entendido</button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Solicitar Tarjeta</h2>
                  <p className="text-slate-500 text-sm mt-1">Elija el tipo de tarjeta que desea y le contactaremos.</p>
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-700 mb-2">Tipo de tarjeta</label>
                  <select value={tipoSolicitado} onChange={(e) => setTipoSolicitado(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:border-indigo-600 focus:outline-none">
                    {TIPOS_TARJETA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-700 mb-2">Para que la usara? (opcional)</label>
                  <textarea value={motivoSolicitud} onChange={(e) => setMotivoSolicitud(e.target.value)} rows={3} placeholder="Ej: Compras en linea, viajes..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:border-indigo-600 focus:outline-none resize-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMostrarModal(false)} className="flex-1 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 rounded-2xl transition-colors">Cancelar</button>
                  <button onClick={() => setSolicitudEnviada(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"><Send size={18} /> Enviar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tarjetas.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-600">Aun no tiene tarjetas</h2>
          <p className="text-slate-500 mt-2 text-lg">Use el boton "Solicitar Tarjeta" para pedir una.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tarjetas.map((tarjeta) => {
            const verNumero = mostrarNumero[tarjeta.id_tarjeta];
            const cuenta = cuentas.find(c => c.id_cuenta === tarjeta.id_cuenta);
            return (
              <div key={tarjeta.id_tarjeta} className="rounded-3xl overflow-hidden shadow-xl">
                <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-7 relative">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest">BankLite</p>
                      <p className="text-xs text-blue-300 mt-1">{tarjeta.tipo_tarjeta}</p>
                    </div>
                    <CreditCard size={36} className="text-white/60" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <p className="text-2xl font-mono font-bold tracking-widest">
                      {verNumero
                        ? `4532 ${tarjeta.id_tarjeta.replace(/-/g, "").slice(0, 4).toUpperCase()} ${tarjeta.id_tarjeta.replace(/-/g, "").slice(4, 8).toUpperCase()} ${tarjeta.id_tarjeta.slice(-4).toUpperCase()}`
                        : `**** **** **** ${tarjeta.id_tarjeta.slice(-4).toUpperCase()}`}
                    </p>
                    <button onClick={() => toggleNumero(tarjeta.id_tarjeta)} className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors" title={verNumero ? "Ocultar" : "Ver numero"}>
                      {verNumero ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-blue-300 text-xs">Vence</p>
                      <p className="font-bold">{tarjeta.fecha_emision ? new Date(new Date(tarjeta.fecha_emision).setFullYear(new Date(tarjeta.fecha_emision).getFullYear() + 4)).toISOString().slice(0,7).replace("-","/") : "12/28"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-300 text-xs">Moneda</p>
                      <p className="font-bold">{cuenta?.moneda ?? "COP"}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 border border-slate-100 rounded-b-3xl">
                  <div className="flex items-center gap-2">
                    {tarjeta.estado === "activa" ? <CheckCircle size={22} className="text-green-500" /> : <Lock size={22} className="text-red-400" />}
                    <span className={`text-lg font-bold ${tarjeta.estado === "activa" ? "text-green-700" : "text-red-600"}`}>
                      {tarjeta.estado === "activa" ? "✅ Tarjeta Activa" : "❌ Tarjeta " + tarjeta.estado}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-2">Procesador: <span className="font-bold text-slate-700">{tarjeta.procesador_externo}</span></p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
