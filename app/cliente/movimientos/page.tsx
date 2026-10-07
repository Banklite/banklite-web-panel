"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { listAccounts, getLedgerBalance, listTransfers, listBeneficiaries, Cuenta, CuentaContable, Transferencia, Beneficiario, buscarCuentaPorNumero } from "@/lib/api";
import { FileText, TrendingUp, Wallet, AlertCircle, ArrowUpRight, ArrowDownLeft, X, Download } from "lucide-react";

export default function ClienteMovimientosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [saldos, setSaldos] = useState<Record<string, CuentaContable | null>>({});
  const [transferencias, setTransferencias] = useState<(Transferencia & { esIngreso: boolean; benefInfo?: Beneficiario })[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal de Comprobante
  const [selectedTx, setSelectedTx] = useState<(Transferencia & { esIngreso: boolean; benefInfo?: Beneficiario }) | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    async function cargar() {
      try {
        const todasCuentas = await listAccounts();
        const misCuentas = todasCuentas.filter(c => c.id_usuario === sesion?.usuario.id_usuario);
        setCuentas(misCuentas);
        
        // Cargar saldo de cada cuenta
        const saldosMap: Record<string, CuentaContable | null> = {};
        await Promise.all(misCuentas.map(async (c) => {
          try {
            saldosMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta);
          } catch {
            saldosMap[c.id_cuenta] = null;
          }
        }));
        setSaldos(saldosMap);

        // Cargar transferencias y beneficiarios
        const [todasTrans, todosBenef] = await Promise.all([listTransfers(), listBeneficiaries()]);
        const miIdsCuentas = misCuentas.map(c => c.id_cuenta);
        
        // Mostrar transferencias enviadas Y recibidas
        const misMovs = todasTrans.map(t => {
          const benef = todosBenef.find(b => b.id_beneficiario === t.id_beneficiario);
          const soyOrigen = miIdsCuentas.includes(t.id_cuenta_origen);
          const soyDestino = benef && miIdsCuentas.includes(benef.cuenta_destino);
          
          if (soyOrigen) return { ...t, esIngreso: false, benefInfo: benef };
          if (soyDestino) return { ...t, esIngreso: true, benefInfo: benef };
          return null;
        }).filter(Boolean) as (Transferencia & { esIngreso: boolean; benefInfo?: Beneficiario })[];
        
        misMovs.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime());
        setTransferencias(misMovs);
        setBeneficiarios(todosBenef);

      } catch {
        setError("No pudimos cargar sus movimientos. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  if (loading) return <div className="text-center py-16 text-2xl text-slate-400 animate-pulse">Consultando sus cuentas...</div>;
  if (error) return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 flex items-center gap-4">
      <AlertCircle size={32} className="text-red-500 flex-shrink-0" />
      <p className="text-red-800 text-lg">{error}</p>
    </div>
  );

  if (cuentas.length === 0) return (
    <div className="text-center py-16">
      <Wallet size={64} className="mx-auto text-slate-300 mb-4" />
      <h2 className="text-2xl font-bold text-slate-600">Aun no tiene cuentas</h2>
      <p className="text-slate-500 mt-2 text-lg">Comuniquese con un asesor para abrir su cuenta.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-800">Mis Movimientos</h1>
        <p className="text-lg text-slate-500">Consulte el saldo y movimientos de sus cuentas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cuentas.map(c => {
          const s = saldos[c.id_cuenta];
          return (
            <div key={c.id_cuenta} className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Wallet size={80} />
              </div>
              <div className="relative z-10">
                <p className="text-indigo-200 font-semibold mb-1">Cuenta {c.moneda}</p>
                <p className="text-sm font-mono text-indigo-300 mb-4">{c.numero_cuenta ?? c.id_cuenta}</p>
                <p className="text-indigo-100 text-sm mb-1">Saldo Disponible</p>
                {s ? (
                  <p className="text-4xl font-black">${Number(s.saldo_actual).toLocaleString()}</p>
                ) : (
                  <p className="text-2xl font-bold text-indigo-300">Saldo no disponible</p>
                )}
                <div className="mt-6 flex items-center gap-2 text-indigo-200 bg-black/10 w-max px-3 py-1.5 rounded-lg">
                  <TrendingUp size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">{c.estado}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <FileText size={24} className="text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">Ultimas Transferencias</h2>
        </div>
        
        {transferencias.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-lg">No has realizado ninguna transferencia todavia.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transferencias.map(t => {
              const benef = t.benefInfo;
              const isError = t.estado === "error" || t.estado === "fallida" || t.estado === "rechazada";
              return (
                <div 
                  key={t.id_transferencia} 
                  onClick={() => setSelectedTx(t)}
                  className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isError ? 'bg-red-100 text-red-600' : t.esIngreso ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {t.esIngreso ? <ArrowDownLeft size={24} strokeWidth={2.5} /> : <ArrowUpRight size={24} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">
                        {t.esIngreso ? `De: Cuenta ${short(t.id_cuenta_origen)}` : `A: ${benef ? benef.nombre : "Desconocido"}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        Ref: {t.referencia || short(t.id_transferencia)} • {new Date(t.fecha_solicitud).toLocaleDateString()}
                      </p>
                      {t.concepto && (
                        <p className="text-sm font-medium text-slate-600 mt-1">"{t.concepto}"</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${isError ? 'text-slate-400 line-through' : t.esIngreso ? 'text-green-600' : 'text-slate-800'}`}>
                      {t.esIngreso ? '+' : '-'}${Number(t.monto).toLocaleString()}
                    </p>
                    <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${isError ? 'text-red-500' : 'text-green-600'}`}>
                      {t.estado}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL COMPROBANTE */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FileText className="text-indigo-600" /> Comprobante
              </h3>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Valor de la transacción</p>
                <p className={`text-4xl font-black ${selectedTx.esIngreso ? 'text-green-600' : 'text-slate-800'}`}>
                  ${Number(selectedTx.monto).toLocaleString()} COP
                </p>
              </div>

              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Fecha y hora</span>
                  <span className="font-bold text-slate-800">{new Date(selectedTx.fecha_solicitud).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Referencia</span>
                  <span className="font-mono text-slate-800">{selectedTx.referencia || selectedTx.id_transferencia}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Tipo</span>
                  <span className="font-bold text-slate-800">{selectedTx.esIngreso ? 'Transferencia Recibida' : 'Transferencia Enviada'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Estado</span>
                  <span className={`font-bold uppercase ${selectedTx.estado === 'completada' ? 'text-green-600' : 'text-red-500'}`}>{selectedTx.estado}</span>
                </div>
                {!selectedTx.esIngreso && selectedTx.benefInfo && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Destinatario</span>
                    <span className="font-bold text-slate-800 text-right">{selectedTx.benefInfo.nombre}</span>
                  </div>
                )}
                {selectedTx.concepto && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Concepto</span>
                    <span className="font-bold text-slate-800 text-right">{selectedTx.concepto}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => window.print()} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
              >
                <Download size={18} /> Guardar / Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function short(id: string) {
  return id.split("-")[0];
}
