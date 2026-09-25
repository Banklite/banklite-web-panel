"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  listAccounts, listBeneficiaries, listRails, createBeneficiary, createTransfer,
  Cuenta, Beneficiario, RielPago
} from "@/lib/api";
import { ArrowRightLeft, CheckCircle, AlertCircle, Plus, Send, ChevronRight, ChevronLeft } from "lucide-react";

type Paso = "elegir_cuenta" | "elegir_beneficiario" | "detalles" | "confirmar" | "exito";

export default function ClienteTransferenciasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [rieles, setRieles] = useState<RielPago[]>([]);
  
  const [paso, setPaso] = useState<Paso>("elegir_cuenta");
  
  const [cuentaOrigen, setCuentaOrigen] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCuentaDest, setNuevaCuentaDest] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    async function cargar() {
      try {
        const [todasCuentas, b, r] = await Promise.all([listAccounts(), listBeneficiaries(), listRails()]);
        const misCuentas = todasCuentas.filter(c => c.id_usuario === sesion?.usuario.id_usuario && c.estado === "activa");
        setCuentas(misCuentas);
        setBeneficiarios(b.filter(be => be.id_usuario === sesion?.usuario.id_usuario));
        setRieles(r);
      } catch {
        setError("No pudimos cargar su informacion. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  async function handleAgregarBeneficiario() {
    if (!nuevoNombre || !nuevaCuentaDest) return setError("Complete el nombre y la cuenta del destinatario.");
    const sesion = obtenerSesion();
    setError(null);
    try {
      await createBeneficiary({
        id_usuario: sesion!.usuario.id_usuario,
        nombre: nuevoNombre,
        cuenta_destino: nuevaCuentaDest,
        banco_destino: "BankLite",
      });
      const b = await listBeneficiaries();
      setBeneficiarios(b.filter(be => be.id_usuario === sesion?.usuario.id_usuario));
      setNuevoNombre("");
      setNuevaCuentaDest("");
    } catch {
      setError("No se pudo agregar el destinatario.");
    }
  }

  async function handleTransferir() {
    const rielInterno = rieles.find(r => r.tipo === "interno");
    if (!rielInterno) return setError("No hay canal de pago disponible. Contacte soporte.");
    
    setEnviando(true);
    setError(null);
    try {
      await createTransfer({
        id_cuenta_origen: cuentaOrigen,
        id_beneficiario: beneficiario,
        id_riel: rielInterno.id_riel,
        monto,
        concepto,
        idempotency_key: crypto.randomUUID(),
      });
      const benefNombre = beneficiarios.find(b => b.id_beneficiario === beneficiario)?.nombre ?? "destinatario";
      setResultado(`Transferencia de $${Number(monto).toLocaleString()} enviada exitosamente a ${benefNombre}.`);
      setPaso("exito");
    } catch {
      setError("No pudimos procesar la transferencia en este momento. Tu dinero no fue descontado.");
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-2xl text-slate-400 animate-pulse">Cargando...</div>;

  const benefSelect = beneficiarios.find(b => b.id_beneficiario === beneficiario);
  const cuentaSelect = cuentas.find(c => c.id_cuenta === cuentaOrigen);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
          <ArrowRightLeft size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Transferir Dinero</h1>
          <p className="text-lg text-slate-500">Envie dinero de forma rapida y segura.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
          <AlertCircle size={24} className="flex-shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {paso === "exito" && (
        <div className="text-center py-16 bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <CheckCircle size={80} className="text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-green-700 mb-3">Transferencia Exitosa!</h2>
          <p className="text-lg text-slate-600 mb-8">{resultado}</p>
          <button
            onClick={() => { setPaso("elegir_cuenta"); setMonto(""); setConcepto(""); setBeneficiario(""); setCuentaOrigen(""); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold px-8 py-4 rounded-2xl shadow-lg transition-colors"
          >
            Hacer otra transferencia
          </button>
        </div>
      )}

      {paso === "elegir_cuenta" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-700 mb-6">Paso 1: ¿De qué cuenta deseas enviar el dinero?</h2>
          <div className="space-y-4">
            {cuentas.map(c => (
              <button
                key={c.id_cuenta}
                onClick={() => setCuentaOrigen(c.id_cuenta)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  cuentaOrigen === c.id_cuenta ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                <p className="font-bold text-lg">{c.moneda} - {c.estado}</p>
                <p className="text-slate-500 font-mono text-sm mt-1">ID: {c.id_cuenta}</p>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <button 
              disabled={!cuentaOrigen} 
              onClick={() => setPaso("elegir_beneficiario")}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {paso === "elegir_beneficiario" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <button onClick={() => setPaso("elegir_cuenta")} className="text-indigo-600 font-bold flex items-center gap-1 mb-6 hover:underline">
            <ChevronLeft size={20} /> Volver a cuentas
          </button>
          <h2 className="text-xl font-bold text-slate-700 mb-6">Paso 2: ¿A quién le deseas transferir?</h2>
          <div className="space-y-4 mb-8">
            {beneficiarios.map(b => (
              <button
                key={b.id_beneficiario}
                onClick={() => setBeneficiario(b.id_beneficiario)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  beneficiario === b.id_beneficiario ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                <p className="font-bold text-lg">{b.nombre}</p>
                <p className="text-slate-500 font-mono text-sm mt-1">Cuenta Destino: {b.cuenta_destino}</p>
              </button>
            ))}
            
            <details className="mt-6 bg-slate-50 rounded-2xl p-4 border-2 border-slate-200">
              <summary className="font-bold text-indigo-600 cursor-pointer flex items-center gap-2">
                <Plus size={20} /> Añadir nuevo destinatario
              </summary>
              <div className="pt-4 space-y-3">
                <input type="text" placeholder="Nombre completo" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} className="w-full border-2 border-slate-300 rounded-xl px-4 py-3" />
                <input type="text" placeholder="Número de cuenta destino" value={nuevaCuentaDest} onChange={e => setNuevaCuentaDest(e.target.value)} className="w-full border-2 border-slate-300 rounded-xl px-4 py-3 font-mono" />
                <button onClick={handleAgregarBeneficiario} className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl w-full">Guardar destinatario</button>
              </div>
            </details>
          </div>
          <div className="flex justify-end">
            <button 
              disabled={!beneficiario} 
              onClick={() => setPaso("detalles")}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2"
            >
              Continuar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {paso === "detalles" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <button onClick={() => setPaso("elegir_beneficiario")} className="text-indigo-600 font-bold flex items-center gap-1 mb-6 hover:underline">
            <ChevronLeft size={20} /> Volver a destinatario
          </button>
          <h2 className="text-xl font-bold text-slate-700 mb-6">Paso 3: Detalles de la transferencia</h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-lg font-bold text-slate-700 block mb-2">Monto a enviar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                <input type="number" min="1" step="1" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} className="w-full border-2 border-slate-300 rounded-xl pl-10 pr-4 py-4 text-2xl font-bold focus:border-indigo-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-lg font-bold text-slate-700 block mb-2">Concepto (Opcional)</label>
              <input type="text" placeholder="Ej: Pago de alquiler, cena..." value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full border-2 border-slate-300 rounded-xl px-4 py-4 text-lg focus:border-indigo-600 focus:outline-none" />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button 
              disabled={!monto || Number(monto) <= 0} 
              onClick={() => setPaso("confirmar")}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2"
            >
              Revisar Transferencia <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {paso === "confirmar" && (
        <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8">
          <button onClick={() => setPaso("detalles")} className="text-indigo-600 font-bold flex items-center gap-1 mb-6 hover:underline">
            <ChevronLeft size={20} /> Volver a detalles
          </button>
          <h2 className="text-2xl font-black text-slate-800 mb-6">Verifica tu transferencia</h2>
          
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-6 space-y-4 mb-8">
            <div className="flex justify-between border-b border-indigo-200 pb-4">
              <span className="text-indigo-700 font-semibold">Monto a enviar</span>
              <span className="text-2xl font-black text-indigo-900">${Number(monto).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-indigo-200 pb-4">
              <span className="text-indigo-700 font-semibold">Para</span>
              <span className="font-bold text-indigo-900 text-right">{benefSelect?.nombre} <br/><span className="text-sm font-mono text-indigo-600">{benefSelect?.cuenta_destino}</span></span>
            </div>
            <div className="flex justify-between border-b border-indigo-200 pb-4">
              <span className="text-indigo-700 font-semibold">Desde tu cuenta</span>
              <span className="font-bold text-indigo-900 text-right">{cuentaSelect?.moneda} <br/><span className="text-sm font-mono text-indigo-600">{short(cuentaSelect?.id_cuenta || "")}</span></span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-700 font-semibold">Concepto</span>
              <span className="font-bold text-indigo-900">{concepto || "Sin concepto"}</span>
            </div>
          </div>
          
          <button 
            onClick={handleTransferir}
            disabled={enviando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xl font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
          >
            <Send size={24} />
            {enviando ? "Procesando de forma segura..." : "Confirmar y Enviar"}
          </button>
        </div>
      )}
    </div>
  );
}

function short(id: string) {
  return id.split("-")[0];
}
