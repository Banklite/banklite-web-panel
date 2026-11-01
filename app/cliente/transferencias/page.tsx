"use client";
import { useEffect, useState } from "react";
import { obtenerSesion } from "@/lib/auth";
import {
  listAccounts, listRails, createBeneficiary, createTransfer,
  getLedgerBalance, buscarCuentaPorNumero, buscarCuentaPorTelefono, buscarCuentaPorLlave,
  listBeneficiaries, updateBeneficiary, deleteBeneficiary, getCuentaPublica,
  Cuenta, RielPago, CuentaContable, DestinatarioPublico, Beneficiario,
} from "@/lib/api";
import {
  ArrowRightLeft, CheckCircle, AlertCircle, Send,
  ChevronRight, ChevronLeft, Loader2, RefreshCw, Search, User, Star,
  Copy, Check, Share2, KeyRound, ShieldCheck, Wallet, Sparkles,
  Phone, BookUser, Plus, Trash2, Smartphone, Building2, X,
} from "lucide-react";

const RIEL_INTERNO_ID = "00000000-0000-0000-0000-000000000101";

type Paso = "elegir_cuenta" | "buscar_destinatario" | "detalles" | "confirmar" | "procesando" | "exito" | "error_final";

function formatCOP(v: string | number | null | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

function maskNumeroCuenta(nc: string | null | undefined) {
  if (!nc) return "••••••••";
  return "****" + nc.slice(-4);
}

function formatTelefono(tel: string | null | undefined) {
  if (!tel) return "";
  const clean = tel.replace(/\D/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return tel;
}

const PASOS_LABELS = ["Cuenta", "Destinatario", "Monto", "Confirmar"];
const PASOS_KEYS: Paso[] = ["elegir_cuenta", "buscar_destinatario", "detalles", "confirmar"];

const MONTOS_RAPIDOS = [20000, 50000, 100000, 200000, 500000];

export default function ClienteTransferenciasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [rieles, setRieles] = useState<RielPago[]>([]);
  const [ledgers, setLedgers] = useState<Record<string, CuentaContable | null>>({});
  const [paso, setPaso] = useState<Paso>("elegir_cuenta");

  const [cuentaOrigen, setCuentaOrigen] = useState("");
  
  // Método de búsqueda: "telefono" (Nequi / Bre-B) o "cuenta"
  const [metodoBusqueda, setMetodoBusqueda] = useState<"telefono" | "cuenta">("telefono");
  const [telefonoDest, setTelefonoDest] = useState("");
  const [numeroCuentaDest, setNumeroCuentaDest] = useState("");
  
  const [buscando, setBuscando] = useState(false);
  const [destinatario, setDestinatario] = useState<DestinatarioPublico | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  
  // Agenda de contactos
  const [contactos, setContactos] = useState<Beneficiario[]>([]);
  const [favoritos, setFavoritos] = useState<Beneficiario[]>([]);
  const [filtroContacto, setFiltroContacto] = useState("");
  const [idBeneficiarioUsado, setIdBeneficiarioUsado] = useState<string | null>(null);
  const [esFavorito, setEsFavorito] = useState(false);

  // Modal / Drawer de nuevo contacto
  const [mostrarModalContacto, setMostrarModalContacto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [errorNuevoContacto, setErrorNuevoContacto] = useState<string | null>(null);

  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ monto: string; destinatario: string; telefono?: string; referencia: string; fecha: string; montoNum: number } | null>(null);
  const [copiadoRef, setCopiadoRef] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    async function cargar() {
      try {
        const [todasCuentas, r] = await Promise.all([
          listAccounts(),
          listRails().catch(() => [] as RielPago[])
        ]);
        const misCuentas = todasCuentas.filter((c) => c.id_usuario === sesion?.usuario.id_usuario && c.estado === "activa");
        setCuentas(misCuentas);
        setRieles(r);
        const ledgerMap: Record<string, CuentaContable | null> = {};
        await Promise.all(misCuentas.map(async (c) => {
          try { ledgerMap[c.id_cuenta] = await getLedgerBalance(c.id_cuenta); } catch { ledgerMap[c.id_cuenta] = null; }
        }));
        setLedgers(ledgerMap);
        if (sesion) {
          const bs = await listBeneficiaries(sesion.usuario.id_usuario).catch(() => [] as Beneficiario[]);
          setContactos(bs);
          setFavoritos(bs.filter((b) => b.favorito));
        }
      } catch {
        setError("No pudimos cargar tu información.");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  function getRielInternoId() {
    const rielApi = rieles.find((r) => r.tipo === "interno" && r.activo);
    return rielApi ? rielApi.id_riel : RIEL_INTERNO_ID;
  }

  // Búsqueda por llave Bre-B: celular, cédula o correo
  async function handleBuscarPorTelefono() {
    const llave = telefonoDest.trim();
    if (llave.length < 5) {
      setErrorBusqueda("Ingresa un celular, una cédula o un correo electrónico.");
      return;
    }
    setBuscando(true);
    setErrorBusqueda(null);
    setDestinatario(null);
    try {
      const dest = await buscarCuentaPorLlave(llave);
      const cuentaOrig = cuentas.find((c) => c.id_cuenta === cuentaOrigen);
      if (cuentaOrig?.id_cuenta === dest.id_cuenta) {
        setErrorBusqueda("No puedes transferir a tu propia cuenta.");
      } else {
        setDestinatario(dest);
      }
    } catch (err: unknown) {
      setErrorBusqueda(err instanceof Error ? err.message : "No se encontró ningún usuario con esa llave Bre-B.");
    } finally {
      setBuscando(false);
    }
  }

  // Búsqueda por número de cuenta (tradicional)
  async function handleBuscarPorCuenta() {
    if (!numeroCuentaDest.trim()) return;
    setBuscando(true);
    setErrorBusqueda(null);
    setDestinatario(null);
    try {
      const dest = await buscarCuentaPorNumero(numeroCuentaDest.trim());
      if (!dest) {
        setErrorBusqueda("No se encontró ninguna cuenta activa con ese número.");
      } else {
        const cuentaOrig = cuentas.find((c) => c.id_cuenta === cuentaOrigen);
        if (cuentaOrig?.numero_cuenta === numeroCuentaDest.trim()) {
          setErrorBusqueda("No puedes transferir a tu propia cuenta.");
        } else {
          setDestinatario(dest);
        }
      }
    } catch {
      setErrorBusqueda("Error al buscar la cuenta.");
    } finally {
      setBuscando(false);
    }
  }

  // Elegir contacto de la agenda
  async function elegirContacto(b: Beneficiario) {
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      let dest: DestinatarioPublico | null = null;
      if (b.telefono) {
        try {
          dest = await buscarCuentaPorTelefono(b.telefono);
        } catch {
          dest = null;
        }
      }
      if (!dest) {
        dest = await getCuentaPublica(b.cuenta_destino);
      }
      if (dest) {
        if (b.telefono && !dest.telefono) dest.telefono = b.telefono;
        setDestinatario(dest);
        if (b.telefono) {
          setTelefonoDest(b.telefono);
          setMetodoBusqueda("telefono");
        } else {
          setNumeroCuentaDest("");
        }
      } else {
        setErrorBusqueda("Este contacto no tiene una cuenta activa disponible.");
      }
    } catch {
      setDestinatario(null);
      setErrorBusqueda("No se pudo obtener la información de este contacto.");
    } finally {
      setBuscando(false);
    }
  }

  // Guardar nuevo contacto en la agenda (Skill de Contactos de Teléfono)
  async function handleCrearContacto() {
    const cleanTel = nuevoTelefono.replace(/\D/g, "");
    if (cleanTel.length < 10) {
      setErrorNuevoContacto("El número de celular debe tener 10 dígitos.");
      return;
    }
    setGuardandoContacto(true);
    setErrorNuevoContacto(null);
    try {
      const sesion = obtenerSesion();
      if (!sesion) throw new Error("Sesión no válida");
      
      // Valida existencia mediante búsqueda por teléfono
      const dest = await buscarCuentaPorTelefono(cleanTel);
      
      const nuevo = await createBeneficiary({
        id_usuario: sesion.usuario.id_usuario,
        nombre: dest.nombre_titular,
        alias: nuevoNombre.trim() || undefined,
        cuenta_destino: dest.id_cuenta,
        banco_destino: "BankLite",
        telefono: cleanTel,
        favorito: true,
      });

      setContactos((prev) => [nuevo, ...prev.filter((c) => c.id_beneficiario !== nuevo.id_beneficiario)]);
      setFavoritos((prev) => [nuevo, ...prev.filter((c) => c.id_beneficiario !== nuevo.id_beneficiario)]);
      setMostrarModalContacto(false);
      setNuevoNombre("");
      setNuevoTelefono("");
      setDestinatario(dest);
      setTelefonoDest(cleanTel);
    } catch (err: unknown) {
      setErrorNuevoContacto(err instanceof Error ? err.message : "No se encontró ningún usuario registrado con ese celular.");
    } finally {
      setGuardandoContacto(false);
    }
  }

  // Alternar favorito de un contacto
  async function alternarFavoritoContacto(c: Beneficiario, e: React.MouseEvent) {
    e.stopPropagation();
    const nuevoFav = !c.favorito;
    try {
      const updated = await updateBeneficiary(c.id_beneficiario, { favorito: nuevoFav });
      setContactos((prev) => prev.map((item) => (item.id_beneficiario === c.id_beneficiario ? { ...item, favorito: nuevoFav } : item)));
      setFavoritos((prev) => nuevoFav ? [updated, ...prev.filter((x) => x.id_beneficiario !== c.id_beneficiario)] : prev.filter((x) => x.id_beneficiario !== c.id_beneficiario));
    } catch {
      // fallo no critico
    }
  }

  // Eliminar contacto de la agenda
  async function eliminarContacto(c: Beneficiario, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar a ${c.alias || c.nombre || "este contacto"} de tu agenda?`)) return;
    try {
      await deleteBeneficiary(c.id_beneficiario);
      setContactos((prev) => prev.filter((item) => item.id_beneficiario !== c.id_beneficiario));
      setFavoritos((prev) => prev.filter((item) => item.id_beneficiario !== c.id_beneficiario));
    } catch {
      // fallo no critico
    }
  }

  async function alternarFavoritoTransaccion() {
    if (!idBeneficiarioUsado) return;
    const nuevo = !esFavorito;
    try {
      const b = await updateBeneficiary(idBeneficiarioUsado, { favorito: nuevo });
      setEsFavorito(nuevo);
      setFavoritos((prev) => nuevo ? [b, ...prev.filter((x) => x.id_beneficiario !== b.id_beneficiario)] : prev.filter((x) => x.id_beneficiario !== b.id_beneficiario));
    } catch {
      // no crítico
    }
  }

  async function handleTransferir() {
    if (!destinatario) return;
    setEnviando(true);
    setPaso("procesando");
    setError(null);
    const idRiel = getRielInternoId();
    try {
      const sesion = obtenerSesion();
      const celAsociado = destinatario.telefono ?? (metodoBusqueda === "telefono" && /^\d{10}$/.test(telefonoDest.replace(/\D/g, "")) && !telefonoDest.includes("@") ? telefonoDest.replace(/\D/g, "") : null);
      
      const beneficiario = await createBeneficiary({
        id_usuario: sesion!.usuario.id_usuario,
        nombre: destinatario.nombre_titular,
        cuenta_destino: destinatario.id_cuenta,
        banco_destino: "BankLite",
        telefono: celAsociado,
      });

      setIdBeneficiarioUsado(beneficiario.id_beneficiario);
      setEsFavorito(!!beneficiario.favorito);

      const res = await createTransfer({
        id_cuenta_origen: cuentaOrigen,
        id_beneficiario: beneficiario.id_beneficiario,
        id_riel: idRiel,
        monto,
        concepto,
        idempotency_key: crypto.randomUUID(),
      });

      if (res.transferencia.estado !== "completada") {
        throw new Error(`La transferencia no se completó (estado: ${res.transferencia.estado}).`);
      }

      setResultado({
        monto: formatCOP(monto),
        montoNum: Number(monto),
        destinatario: destinatario.nombre_titular,
        telefono: celAsociado ?? undefined,
        referencia: res.transferencia.referencia ?? "BL-" + Date.now(),
        fecha: new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" }),
      });

      // Recargar lista de contactos
      listBeneficiaries(sesion!.usuario.id_usuario).then((bs) => {
        setContactos(bs);
        setFavoritos(bs.filter((b) => b.favorito));
      }).catch(() => {});

      setPaso("exito");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setPaso("error_final");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setPaso("elegir_cuenta");
    setMonto("");
    setConcepto("");
    setCuentaOrigen("");
    setNumeroCuentaDest("");
    setTelefonoDest("");
    setDestinatario(null);
    setErrorBusqueda(null);
    setError(null);
    setResultado(null);
    setIdBeneficiarioUsado(null);
    setEsFavorito(false);
  }

  function compartirWhatsApp() {
    if (!resultado) return;
    const celTexto = resultado.telefono ? `📱 *Celular:* ${formatTelefono(resultado.telefono)}\n` : "";
    const texto = `🏦 *BankLite - Comprobante de Transferencia*\n\n` +
      `✅ *Estado:* Completada con éxito\n` +
      `💰 *Monto:* ${resultado.monto} COP\n` +
      `👤 *Destinatario:* ${resultado.destinatario}\n` +
      celTexto +
      `🔢 *Referencia:* ${resultado.referencia}\n` +
      `📅 *Fecha:* ${resultado.fecha}\n\n` +
      `🔐 Transacción respaldada por Fogafín & Red Inmediata Bre-B BankLite.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, "_blank");
  }

  function copiarReferencia() {
    if (!resultado) return;
    navigator.clipboard.writeText(resultado.referencia);
    setCopiadoRef(true);
    setTimeout(() => setCopiadoRef(false), 2000);
  }

  const cuentaSelect = cuentas.find((c) => c.id_cuenta === cuentaOrigen);
  const pasoIndex = PASOS_KEYS.indexOf(paso);

  const contactosFiltrados = contactos.filter((c) => {
    if (!filtroContacto.trim()) return true;
    const term = filtroContacto.toLowerCase();
    const nom = (c.nombre || "").toLowerCase();
    const alias = (c.alias || "").toLowerCase();
    const tel = (c.telefono || "").replace(/\D/g, "");
    return nom.includes(term) || alias.includes(term) || tel.includes(term);
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 size={40} className="text-sky-600 animate-spin" />
      <p className="text-sm text-slate-500 font-semibold">Cargando información…</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="apple-icon-badge h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
          <ArrowRightLeft size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Transferir Dinero</h1>
          <p className="text-xs text-slate-500">Pasa plata por celular Bre-B, guarda contactos o usa cuenta bancaria</p>
        </div>
      </div>

      {/* Barra de progreso */}
      {pasoIndex >= 0 && (
        <div className="flex gap-2">
          {PASOS_LABELS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${i <= pasoIndex ? "bg-gradient-to-r from-sky-500 to-blue-600" : "bg-slate-200"}`} />
              <p className={`text-[10px] font-bold mt-1.5 ${i <= pasoIndex ? "text-slate-900" : "text-slate-400"}`}>{i + 1}. {label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error global */}
      {error && paso !== "error_final" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-600 shadow-sm animate-fade-in">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* PROCESANDO */}
      {paso === "procesando" && (
        <div className="apple-glass-card rounded-[32px] p-16 text-center space-y-4 border border-white/95 shadow-xl">
          <Loader2 size={56} className="text-sky-600 animate-spin mx-auto" />
          <h2 className="text-xl font-black text-slate-950">Procesando de forma segura…</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">Validando en riel de pagos inmediatos Bre-B y aplicando doble partida contable por Ledger.</p>
        </div>
      )}

      {/* ÉXITO */}
      {paso === "exito" && resultado && (
        <div className="apple-glass-card rounded-[32px] p-8 space-y-6 animate-fade-in border border-white/95 shadow-xl">
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-950">¡Transferencia exitosa!</h2>
            <p className="text-xs text-slate-500">Tu dinero fue enviado y acreditado al instante.</p>
          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
            {[
              { label: "Monto", value: resultado.monto },
              { label: "Destinatario", value: resultado.destinatario },
              ...(resultado.telefono ? [{ label: "Celular asociado", value: `+57 ${formatTelefono(resultado.telefono)}` }] : []),
              { label: "Referencia", value: resultado.referencia },
              { label: "Fecha y hora", value: resultado.fecha },
              { label: "Canal", value: resultado.telefono ? "Bre-B / Transferencia Celular Inmediata" : "Riel Interno ACH Inmediato" },
              { label: "Estado", value: "Completada" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-slate-200/70 pb-3 last:border-0 last:pb-0">
                <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                <span className="font-extrabold text-slate-950 text-right text-xs sm:text-sm">{item.value}</span>
              </div>
            ))}
          </div>

          {/* ACCIONES: COMPARTIR POR WHATSAPP & COPIAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={compartirWhatsApp}
              className="w-full flex items-center justify-center gap-2 font-black px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-lg shadow-emerald-600/25"
            >
              <Share2 size={16} /> Compartir por WhatsApp
            </button>
            <button
              onClick={copiarReferencia}
              className="w-full flex items-center justify-center gap-2 font-black px-4 py-3.5 rounded-2xl apple-glass-button text-slate-800 hover:text-slate-950 text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm"
            >
              {copiadoRef ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copiadoRef ? "¡Referencia copiada!" : "Copiar referencia"}
            </button>
          </div>

          <button onClick={alternarFavoritoTransaccion} className={`w-full flex items-center justify-center gap-2 font-extrabold px-6 py-3 rounded-2xl border transition-all duration-200 active:scale-[0.97] hover:scale-[1.01] text-xs ${esFavorito ? "border-amber-200 bg-amber-50 text-amber-700 shadow-xs" : "border-slate-200 bg-white/70 text-slate-600 hover:text-slate-950"}`}>
            <Star size={15} className={esFavorito ? "fill-amber-400 text-amber-500" : ""} />
            {esFavorito ? "Contacto guardado en favoritos" : "Guardar destinatario en favoritos"}
          </button>

          <button onClick={reiniciar} className="w-full apple-primary-button font-black px-8 py-3.5 rounded-2xl text-sm transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-lg shadow-sky-500/20">
            Hacer otra transferencia
          </button>
        </div>
      )}

      {/* ERROR FINAL */}
      {paso === "error_final" && (
        <div className="apple-glass-card rounded-[32px] p-8 space-y-6 text-center border border-white/95 shadow-xl">
          <div className="inline-flex p-4 rounded-3xl bg-red-50 border border-red-200 text-red-600 shadow-sm">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-black text-slate-950">No se pudo procesar</h2>
          <p className="text-xs text-slate-500">Tu dinero no fue descontado. Puedes intentarlo de nuevo.</p>
          {error && <p className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-red-600 text-xs font-mono text-left">{error}</p>}
          <div className="space-y-2">
            <button onClick={() => { setError(null); setPaso("confirmar"); }} className="w-full apple-glass-button rounded-2xl py-3.5 text-xs font-black text-slate-800 hover:text-slate-950 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm">
              <RefreshCw size={16} /> Intentar de nuevo
            </button>
            <button onClick={reiniciar} className="text-xs text-slate-400 hover:text-slate-600 font-bold transition-all duration-200 active:scale-[0.97]">Cancelar y comenzar de nuevo</button>
          </div>
        </div>
      )}

      {/* PASO 1: CUENTA ORIGEN */}
      {paso === "elegir_cuenta" && (
        <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-5 border border-white/95 shadow-xl">
          <div>
            <h2 className="text-base font-black text-slate-950 mb-1">Selecciona la cuenta de origen</h2>
            <p className="text-xs text-slate-500">¿Desde dónde quieres enviar el dinero?</p>
          </div>
          {cuentas.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No tienes cuentas activas disponibles.</p>
          ) : (
            <div className="space-y-3">
              {cuentas.map((c) => {
                const saldo = ledgers[c.id_cuenta]?.saldo_actual;
                const selected = cuentaOrigen === c.id_cuenta;
                return (
                  <button key={c.id_cuenta} onClick={() => setCuentaOrigen(c.id_cuenta)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${selected ? "border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-500/20" : "border-slate-200/80 hover:border-slate-300 bg-white/80 hover:bg-slate-50 shadow-xs"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-slate-950 text-sm capitalize">{c.tipo_cuenta} — {maskNumeroCuenta(c.numero_cuenta)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{c.moneda}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black font-mono ${selected ? "text-slate-950" : "text-slate-700"}`}>
                          {saldo != null ? formatCOP(saldo) : "—"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end">
            <button disabled={!cuentaOrigen} onClick={() => setPaso("buscar_destinatario")}
              className="apple-primary-button disabled:opacity-40 font-black px-7 py-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-md shadow-sky-500/25">
              Continuar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: BUSCAR DESTINATARIO (NEQUI / BRE-B POR CELULAR + AGENDA DE CONTACTOS) */}
      {paso === "buscar_destinatario" && (
        <div className="space-y-5">
          <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-6 border border-white/95 shadow-xl">
            <button onClick={() => { setPaso("elegir_cuenta"); setDestinatario(null); setErrorBusqueda(null); }} className="text-xs font-bold text-slate-500 hover:text-slate-950 flex items-center gap-1 transition-all duration-200 active:scale-[0.97]">
              <ChevronLeft size={14} /> Volver a cuentas
            </button>

            <div>
              <h2 className="text-lg font-black text-slate-950 mb-1">¿A quién vas a enviar dinero?</h2>
              <p className="text-xs text-slate-500">Pasa plata al instante con la llave Bre-B (celular, cédula o correo) o con el número de cuenta.</p>
            </div>

            {/* SELECTOR DE MÉTODO: POR CELULAR vs POR NÚMERO DE CUENTA */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 border border-slate-200/80 rounded-2xl">
              <button
                type="button"
                onClick={() => { setMetodoBusqueda("telefono"); setErrorBusqueda(null); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all duration-200 active:scale-[0.97] ${
                  metodoBusqueda === "telefono"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <Smartphone size={16} />
                <span>Por Llave Bre-B</span>
              </button>

              <button
                type="button"
                onClick={() => { setMetodoBusqueda("cuenta"); setErrorBusqueda(null); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all duration-200 active:scale-[0.97] ${
                  metodoBusqueda === "cuenta"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <Building2 size={16} />
                <span>Por Cuenta</span>
              </button>
            </div>

            {/* FORMULARIO DE BÚSQUEDA SEGÚN MÉTODO */}
            {metodoBusqueda === "telefono" ? (
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Llave Bre-B del destinatario
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="Celular, cédula o correo"
                    value={telefonoDest}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTelefonoDest(val);
                      setDestinatario(null);
                      setErrorBusqueda(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleBuscarPorTelefono(); }}
                    className="flex-1 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-base font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
                  />
                  <button
                    onClick={handleBuscarPorTelefono}
                    disabled={buscando || telefonoDest.trim().length < 5}
                    className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-black px-5 py-3.5 rounded-2xl flex items-center gap-2 text-xs transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm shadow-sky-500/15"
                  >
                    {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Busca por celular, número de cédula o correo electrónico: la cuenta activa de BankLite vinculada a esa llave.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Número de cuenta de ahorros o corriente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Número de cuenta (10 dígitos)"
                    value={numeroCuentaDest}
                    onChange={(e) => {
                      setNumeroCuentaDest(e.target.value.replace(/\D/g, ""));
                      setDestinatario(null);
                      setErrorBusqueda(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleBuscarPorCuenta(); }}
                    className="flex-1 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-base font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
                  />
                  <button
                    onClick={handleBuscarPorCuenta}
                    disabled={buscando || numeroCuentaDest.length < 6}
                    className="apple-glass-button rounded-2xl px-5 py-3.5 text-slate-800 hover:text-slate-950 font-black flex items-center gap-2 text-xs disabled:opacity-40 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm"
                  >
                    {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error de búsqueda */}
            {errorBusqueda && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-600 animate-fade-in shadow-xs">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold">{errorBusqueda}</p>
              </div>
            )}

            {/* TARJETA DE DESTINATARIO VERIFICADO ENCONTRADO */}
            {destinatario && (
              <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-[28px] p-5 space-y-4 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className="apple-avatar-badge h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20">
                        {destinatario.nombre_titular.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black text-slate-950">{destinatario.nombre_titular}</p>
                        <ShieldCheck size={16} className="text-emerald-600" />
                      </div>
                      <p className="text-xs text-emerald-700 font-bold">Destinatario Verificado en BankLite</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                    Listo para enviar
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-emerald-200/80">
                  {destinatario.telefono ? (
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Celular asociado</span>
                      <span className="font-mono text-slate-900 font-bold flex items-center gap-1 mt-0.5">
                        <Phone size={12} className="text-sky-600" /> +57 {formatTelefono(destinatario.telefono)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Número de cuenta</span>
                      <span className="font-mono text-slate-900 font-bold">{destinatario.numero_cuenta_enmascarado}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Tipo de cuenta</span>
                    <span className="text-slate-900 font-bold capitalize">{destinatario.tipo_cuenta} · {destinatario.moneda}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                disabled={!destinatario}
                onClick={() => setPaso("detalles")}
                className="apple-primary-button disabled:opacity-40 font-black px-7 py-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-md shadow-sky-500/25"
              >
                Continuar al monto <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SKILL: AGENDA DE CONTACTOS DE TELÉFONO (NEQUI STYLE)     */}
          {/* ======================================================== */}
          <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-4 border border-white/95 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="apple-icon-badge h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white shadow-xs">
                  <BookUser size={19} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                    Mis Contactos Guardados
                    <span className="text-[10px] bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-700 font-bold border border-slate-200">
                      {contactos.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Toca un contacto para pasarle dinero al instante</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setMostrarModalContacto(true); setErrorNuevoContacto(null); }}
                className="apple-glass-button flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-black text-slate-800 hover:text-slate-950 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm"
              >
                <Plus size={14} />
                <span>Nuevo</span>
              </button>
            </div>

            {/* Barra de búsqueda de contactos si hay más de 2 */}
            {contactos.length > 2 && (
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre, alias o celular…"
                  value={filtroContacto}
                  onChange={(e) => setFiltroContacto(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
                />
              </div>
            )}

            {/* LISTADO DE CONTACTOS */}
            {contactos.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl p-6 space-y-2">
                <Smartphone size={28} className="text-slate-400 mx-auto" />
                <p className="text-xs text-slate-700 font-bold">No tienes contactos guardados todavía</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-medium">
                  Agrega a tus amigos o familiares con su número de celular para transferirles en un solo clic.
                </p>
                <button
                  type="button"
                  onClick={() => setMostrarModalContacto(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 text-xs font-bold transition-all duration-200 active:scale-[0.97]"
                >
                  <Plus size={14} /> Agregar primer contacto
                </button>
              </div>
            ) : contactosFiltrados.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">No hay contactos que coincidan con la búsqueda.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {contactosFiltrados.map((c) => {
                  const initial = (c.alias || c.nombre || "C").charAt(0).toUpperCase();
                  const isFav = !!c.favorito;
                  const isCurrentDest = destinatario?.id_cuenta === c.cuenta_destino;
                  return (
                    <div
                      key={c.id_beneficiario}
                      onClick={() => elegirContacto(c)}
                      className={`group p-3.5 rounded-2xl border transition-all duration-200 text-left flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                        isCurrentDest
                          ? "border-emerald-500/80 bg-emerald-50/80 shadow-md scale-[1.01]"
                          : "border-slate-200/80 hover:border-slate-300 bg-white/80 hover:bg-slate-50 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className={`apple-avatar-badge h-11 w-11 rounded-2xl bg-gradient-to-tr ${
                            ["from-sky-400 to-blue-600", "from-purple-400 to-indigo-600", "from-emerald-400 to-teal-600", "from-amber-400 to-orange-500", "from-rose-400 to-pink-600"][
                              (c.nombre || c.alias || "C").charCodeAt(0) % 5
                            ]
                          } text-white font-black text-sm flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                            {initial}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="En línea para recibir" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-950 truncate flex items-center gap-1.5">
                            {c.alias || c.nombre || "Contacto"}
                            {isFav && <span className="text-[10px] text-amber-500">★</span>}
                          </p>
                          {c.telefono ? (
                            <p className="text-[11px] font-mono text-sky-600 flex items-center gap-1 mt-0.5 font-bold">
                              <Smartphone size={11} /> {formatTelefono(c.telefono)}
                            </p>
                          ) : (
                            <p className="text-[11px] font-mono text-slate-400 font-medium">
                              {c.banco_destino || "BankLite"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => alternarFavoritoContacto(c, e)}
                          title={isFav ? "Quitar de favoritos" : "Marcar favorito"}
                          className={`p-1.5 rounded-xl transition-all duration-200 active:scale-90 hover:scale-110 ${
                            isFav ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          <Star size={15} className={isFav ? "fill-amber-400" : ""} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => eliminarContacto(c, e)}
                          title="Eliminar contacto"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90 hover:scale-110"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR NUEVO CONTACTO DE TELÉFONO */}
      {mostrarModalContacto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="apple-glass-card border border-white/90 rounded-[32px] p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => { setMostrarModalContacto(false); setErrorNuevoContacto(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-xl transition-all duration-200 active:scale-[0.97]"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="apple-icon-badge h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xs">
                <BookUser size={19} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">Nuevo Contacto</h3>
                <p className="text-xs text-slate-500">Guarda a alguien con su número de teléfono</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Nombre o Alias (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mamá, Carlos Amigo, Arriendo…"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Número de celular
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 px-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700">
                    <span>🇨🇴</span> +57
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="300 123 4567"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Se buscará la cuenta BankLite vinculada a este número de celular.
                </p>
              </div>

              {errorNuevoContacto && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-red-600 text-xs flex gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{errorNuevoContacto}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setMostrarModalContacto(false); setErrorNuevoContacto(null); }}
                className="apple-glass-button flex-1 py-3 rounded-2xl text-xs font-black text-slate-700 hover:text-slate-950 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardandoContacto || nuevoTelefono.length < 10}
                onClick={handleCrearContacto}
                className="flex-1 py-3 rounded-2xl apple-primary-button disabled:opacity-40 text-xs font-black flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-sm shadow-sky-500/15"
              >
                {guardandoContacto ? <Loader2 size={14} className="animate-spin text-white" /> : <Check size={14} />}
                <span>Guardar contacto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASO 3: MONTO CON CHIPS RÁPIDOS Y CALCULADORA DE SALDO REMANENTE */}
      {paso === "detalles" && (() => {
        const saldoRaw = cuentaSelect ? ledgers[cuentaSelect.id_cuenta]?.saldo_actual : null;
        const saldoDisponible = saldoRaw != null ? parseFloat(String(saldoRaw)) : 0;
        const montoNum = monto ? Number(monto) : 0;
        const excedeSaldo = saldoDisponible > 0 && montoNum > saldoDisponible;
        const saldoRemanente = saldoDisponible - montoNum;

        return (
          <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-5 animate-fade-in border border-white/95 shadow-xl">
            <button onClick={() => setPaso("buscar_destinatario")} className="text-xs font-bold text-slate-500 hover:text-slate-950 flex items-center gap-1 transition-all duration-200 active:scale-[0.97]">
              <ChevronLeft size={14} /> Volver a destinatario
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950 mb-0.5">¿Cuánto vas a enviar?</h2>
                <p className="text-xs text-slate-500 font-medium">Saldo disponible: <strong className="text-slate-950 font-mono">{formatCOP(saldoDisponible)}</strong></p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-black">
                COP
              </span>
            </div>

            {/* Input Grande de Monto */}
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-2xl pl-10 pr-4 py-4 text-3xl font-black font-mono text-slate-950 focus:outline-none focus:bg-white shadow-sm transition ${
                    excedeSaldo ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200/90 focus:border-sky-500"
                  }`}
                />
              </div>

              {/* SELECTOR RÁPIDO DE MONTOS (QUICK CHIPS) */}
              <div className="flex flex-wrap gap-2.5 mt-3.5">
                {MONTOS_RAPIDOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonto(m.toString())}
                    className={`px-4 py-2.5 rounded-2xl border text-xs font-black transition-all duration-200 active:scale-95 ${
                      monto === m.toString()
                        ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm shadow-sky-500/15 scale-105"
                        : "border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 shadow-xs hover:scale-[1.02]"
                    }`}
                  >
                    ${(m / 1000).toFixed(0)}k
                  </button>
                ))}
                {saldoDisponible > 0 && (
                  <button
                    type="button"
                    onClick={() => setMonto(Math.floor(saldoDisponible).toString())}
                    className="px-4 py-2.5 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-black text-amber-800 transition-all duration-200 active:scale-95 hover:scale-[1.02] shadow-xs"
                  >
                    Todo mi saldo
                  </button>
                )}
              </div>

              {/* CALCULADORA DE SALDO REMANENTE */}
              {montoNum > 0 && (
                <div className="mt-3.5 p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between text-xs shadow-xs">
                  <span className="text-slate-500 font-medium">Te quedará en tu cuenta:</span>
                  <span className={`font-mono font-black ${excedeSaldo ? "text-red-600" : "text-emerald-600"}`}>
                    {excedeSaldo ? "Saldo insuficiente" : formatCOP(saldoRemanente)}
                  </span>
                </div>
              )}

              {excedeSaldo && (
                <div className="flex items-center gap-2 mt-2 text-red-600 animate-fade-in">
                  <AlertCircle size={15} />
                  <p className="text-xs font-semibold">El monto supera tu saldo disponible</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">Concepto o motivo (opcional)</label>
              <input type="text" placeholder="Ej: Arriendo, almuerzo, cuota…" value={concepto} onChange={(e) => setConcepto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm transition"
              />
            </div>

            <div className="flex justify-end">
              <button disabled={!monto || Number(monto) <= 0 || excedeSaldo} onClick={() => setPaso("confirmar")}
                className="apple-primary-button disabled:opacity-40 font-black px-7 py-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-md shadow-sky-500/25">
                Revisar <ChevronRight size={18} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* PASO 4: CONFIRMAR CON SEGURIDAD FOGAFÍN Y CANAL INMEDIATO */}
      {paso === "confirmar" && destinatario && (
        <div className="apple-glass-card rounded-[32px] p-6 sm:p-8 space-y-5 animate-fade-in border border-white/95 shadow-xl">
          <button onClick={() => setPaso("detalles")} className="text-xs font-bold text-slate-500 hover:text-slate-950 flex items-center gap-1 transition-all duration-200 active:scale-[0.97]">
            <ChevronLeft size={14} /> Volver a monto
          </button>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">Confirma tu transferencia</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-extrabold uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
              <ShieldCheck size={14} className="text-emerald-600" /> Fogafín
            </div>
          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
            {[
              { label: "Monto a enviar", value: formatCOP(monto), big: true },
              { label: "Destinatario", value: destinatario.nombre_titular },
              ...(destinatario.telefono ? [{ label: "Celular receptor", value: `+57 ${formatTelefono(destinatario.telefono)}` }] : []),
              { label: "Cuenta acreditada", value: `${destinatario.tipo_cuenta.toUpperCase()} · ${destinatario.numero_cuenta_enmascarado}` },
              { label: "Desde tu cuenta", value: `${cuentaSelect?.tipo_cuenta ?? ""} · ${maskNumeroCuenta(cuentaSelect?.numero_cuenta)}` },
              { label: "Canal de liquidación", value: destinatario.telefono ? "Bre-B Celular Inmediato" : "ACH Riel Interno Inmediato" },
              { label: "Concepto", value: concepto || "Sin concepto" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-slate-200/70 pb-3 last:border-0 last:pb-0">
                <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                <span className={`font-black text-slate-950 text-right ${item.big ? "text-xl text-emerald-600 font-mono" : "text-xs sm:text-sm"}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-3.5 shadow-xs">
            <div className="apple-icon-badge h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex-shrink-0 shadow-xs">
              <KeyRound size={20} />
            </div>
            <div className="text-xs">
              <p className="font-black text-slate-950">Autorización Protegida</p>
              <p className="text-slate-500 mt-0.5 font-medium leading-relaxed">
                Esta transacción se valida mediante tu Clave Dinámica activa y genera comprobante contable automático en Ledger.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={reiniciar} className="apple-glass-button flex-1 font-black py-4 rounded-2xl text-xs sm:text-sm text-slate-700 hover:text-slate-950 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02]">
              Cancelar
            </button>
            <button onClick={handleTransferir} disabled={enviando}
              className="flex-1 apple-primary-button disabled:opacity-40 font-black py-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] shadow-lg shadow-sky-500/25">
              <Send size={16} /> Confirmar y Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
