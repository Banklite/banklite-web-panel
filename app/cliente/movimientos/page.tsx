"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import { listAccounts, getLedgerBalance, listTransfers, listBeneficiaries, Cuenta, CuentaContable, Transferencia, Beneficiario } from "@/lib/api";
import { FileText, TrendingUp, Wallet, AlertCircle, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export default function ClienteMovimientosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [saldos, setSaldos] = useState<Record<string, CuentaContable | null>>({});
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        // Mostrar transferencias enviadas desde mis cuentas
        const misTransferencias = todasTrans.filter(t => miIdsCuentas.includes(t.id_cuenta_origen));
        misTransferencias.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime());
        setTransferencias(misTransferencias);
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
                <p className="text-sm font-mono text-indigo-300 mb-4">{c.id_cuenta}</p>
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
              const benef = beneficiarios.find(b => b.id_beneficiario === t.id_beneficiario);
              const isError = t.estado === "error" || t.estado === "fallida" || t.estado === "rechazada";
              return (
                <div key={t.id_transferencia} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isError ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <ArrowUpRight size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">
                        A: {benef ? benef.nombre : "Desconocido"}
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
                    <p className={`text-xl font-black ${isError ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      -${Number(t.monto).toLocaleString()}
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
    </div>
  );
}

function short(id: string) {
  return id.split("-")[0];
}
