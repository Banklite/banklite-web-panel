/**
 * Cliente HTTP minimo hacia los dos microservicios.
 * Las URLs se leen de variables de entorno para no dejarlas fijas en el codigo:
 * en Docker, cada servicio tiene su propio nombre de host; en tu maquina, localhost.
 */

const IDENTITY_URL =
  process.env.NEXT_PUBLIC_IDENTITY_API_URL ?? "http://localhost:8001";
const ACCOUNT_URL =
  process.env.NEXT_PUBLIC_ACCOUNT_API_URL ?? "http://localhost:8002";
const LEDGER_URL =
  process.env.NEXT_PUBLIC_LEDGER_API_URL ?? "http://localhost:8003";
const TRANSFER_URL =
  process.env.NEXT_PUBLIC_TRANSFER_API_URL ?? "http://localhost:8004";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const detail =
      (body && (body.detail ?? JSON.stringify(body))) ?? `Error HTTP ${res.status}`;
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }
  return body as T;
}

// ---------- Identity Service (tablas: usuario, documento_identidad, verificacion_kyc, evaluacion_riesgo) ----------

export type Usuario = {
  id_usuario: string;
  nombre: string;
  apellido: string | null;
  email: string;
  telefono: string;
  pais_residencia: string;
  estado: string;
  fecha_registro: string;
  fecha_nacimiento?: string | null;
  servicio_solicitado?: string | null;
  cedula?: string | null;
  fecha_expedicion?: string | null;
  fecha_vencimiento?: string | null;
  pais_expedicion?: string | null;
  estado_kyc?: string | null;
  representante_nombre?: string | null;
  representante_documento?: string | null;
  tipo_documento?: string | null;
  representante_tipo_documento?: string | null;
  representante_parentesco?: string | null;
  representante_telefono?: string | null;
  representante_email?: string | null;
  role: "admin" | "cliente";
};

export function createUsuario(data: {
  nombre: string;
  apellido?: string;
  email: string;
  telefono: string;
  pais_residencia: string;
  password: string;
  fecha_nacimiento?: string;
  servicio_solicitado?: string;
  cedula?: string;
  fecha_expedicion?: string;
  fecha_vencimiento?: string;
  pais_expedicion?: string;
  tipo_documento?: string;
  representante_nombre?: string;
  representante_documento?: string;
  representante_tipo_documento?: string;
  representante_parentesco?: string;
  representante_telefono?: string;
  representante_email?: string;
}) {
  return request<Usuario>(`${IDENTITY_URL}/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Admin: reintenta la verificación KYC de un usuario pendiente o con error. */
export function reverificarUsuario(id_usuario: string) {
  const sesion = obtenerSesion();
  return request<Usuario>(`${IDENTITY_URL}/users/${id_usuario}/reverificar`, {
    method: "POST",
    headers: sesion ? { Authorization: `Bearer ${sesion.token}` } : {},
  });
}


export function updateUsuario(id_usuario: string, data: {
  cedula?: string;
  fecha_nacimiento?: string;
  fecha_expedicion?: string;
  fecha_vencimiento?: string;
  pais_expedicion?: string;
}) {
  return request<Usuario>(`${IDENTITY_URL}/users/${id_usuario}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function cambiarClave(idUsuario: string, claveActual: string, claveNueva: string) {
  return request<{mensaje: string}>(`${IDENTITY_URL}/users/${idUsuario}/cambiar-clave`, {
    method: "PUT",
    body: JSON.stringify({ clave_actual: claveActual, clave_nueva: claveNueva }),
  });
}

import { obtenerSesion } from "./auth";

export function listUsuarios(limit?: number, offset?: number) {
  const sesion = obtenerSesion();
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return request<Usuario[]>(`${IDENTITY_URL}/users${qs ? `?${qs}` : ""}`, {
    headers: sesion ? { Authorization: `Bearer ${sesion.token}` } : {},
  });
}

// ---------- Autenticación (POST /auth/login en identity-service) ----------

export type LoginResponse = {
  access_token: string;
  token_type: string;
  usuario: Usuario;
};

export function login(email: string, password: string) {
  return request<LoginResponse>(`${IDENTITY_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export type LoginIniciarResponse = {
  requiere_2fa: boolean;
  id_usuario: string;
  nombre: string;
  email_enmascarado: string;
  telefono_enmascarado: string;
  mensaje: string;
  codigo_debug?: string | null;
};

export function solicitarCodigoLogin(identificador: string, password: string, telefono?: string) {
  return request<LoginIniciarResponse>(`${IDENTITY_URL}/auth/login/solicitar-codigo`, {
    method: "POST",
    body: JSON.stringify({ identificador, password, telefono }),
  });
}

export function confirmarCodigoLogin(id_usuario: string, codigo: string) {
  return request<LoginResponse>(`${IDENTITY_URL}/auth/login/confirmar-codigo`, {
    method: "POST",
    body: JSON.stringify({ id_usuario, codigo }),
  });
}

export type EvaluacionRiesgo = {
  id_evaluacion: string;
  nivel_riesgo: string;
  score: string;
  fecha_evaluacion: string;
};

export function verificarKyc(data: {
  id_usuario: string;
  tipo_documento: string;
  numero_documento: string;
  pais_emision: string;
  fecha_expiracion: string;
}) {
  return request<{
    verificacion: { resultado: string; proveedor_externo: string; evaluaciones: EvaluacionRiesgo[] };
    estado_usuario: string;
    event_published: boolean;
  }>(`${IDENTITY_URL}/kyc/verify`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------- Account Service (tablas: cuenta, limite_operativo, restriccion_regulatoria) ----------

export type Cuenta = {
  id_cuenta: string;
  numero_cuenta: string | null;
  id_usuario: string;
  tipo_cuenta: string;
  moneda: string;
  estado: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
};

export type LimiteOperativo = {
  id_limite: string;
  tipo_limite: string;
  monto_maximo: string;
  periodo: string;
};

export type RestriccionRegulatoria = {
  id_restriccion: string;
  pais: string;
  descripcion: string | null;
  fecha_aplicacion: string;
};

export function openAccount(data: { id_usuario: string; moneda?: string }) {
  return request<{
    cuenta: Cuenta;
    limites: LimiteOperativo[];
    restriccion: RestriccionRegulatoria;
    validado_via: string;
    evento_proyeccion_encontrada: boolean;
  }>(`${ACCOUNT_URL}/accounts`, { method: "POST", body: JSON.stringify(data) });
}

export function listAccounts(limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return request<Cuenta[]>(`${ACCOUNT_URL}/accounts${qs ? `?${qs}` : ""}`);
}

export function getAccountLimits(idCuenta: string) {
  return request<LimiteOperativo[]>(`${ACCOUNT_URL}/accounts/${idCuenta}/limits`);
}

export function updateAccountStatus(idCuenta: string, estado: string) {
  return request<Cuenta>(`${ACCOUNT_URL}/accounts/${idCuenta}/status`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export type UsuarioVerificado = {
  id_usuario: string;
  email: string;
  pais_residencia: string;
  verificado_en: string;
  recibido_en: string;
};

export function listVerifiedUsers() {
  return request<UsuarioVerificado[]>(`${ACCOUNT_URL}/verified-users`);
}

export type TransferenciaRecibida = {
  id_transferencia: string;
  id_cuenta_origen: string;
  monto: string;
  estado: string;
  recibido_en: string;
};

export function listTransfersReceived() {
  return request<TransferenciaRecibida[]>(`${ACCOUNT_URL}/transfers-received`);
}

// ---------- Ledger Service (tablas: transaccion, asiento_contable, cuenta_contable) ----------

// Cuenta contable especial que usa el panel para "depositar" dinero de prueba:
// debe coincidir con CUENTA_PUENTE_EXTERNA en ledger-service y transfer-service.
export const CUENTA_PUENTE_EXTERNA = "00000000-0000-0000-0000-000000000001";

export type CuentaContable = {
  id_cuenta_contable: string;
  id_cuenta: string;
  saldo_actual: string;
  moneda: string;
  fecha_actualizacion: string;
};

export async function getLedgerBalance(idCuenta: string): Promise<CuentaContable | null> {
  try {
    return await request<CuentaContable>(`${LEDGER_URL}/ledger/accounts/${idCuenta}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** "Depositar" fondos de prueba: acredita la cuenta y debita la cuenta puente.
 * Es un atajo del panel sobre POST /ledger/entries, no un endpoint aparte. */
export function depositar(idCuenta: string, monto: string) {
  return request<{ id_transaccion: string; estado: string }>(`${LEDGER_URL}/ledger/entries`, {
    method: "POST",
    body: JSON.stringify({
      tipo_transaccion: "deposito",
      referencia: `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      movimientos: [
        { id_cuenta: idCuenta, tipo_movimiento: "credito", monto },
        { id_cuenta: CUENTA_PUENTE_EXTERNA, tipo_movimiento: "debito", monto },
      ],
    }),
  });
}

// ---------- Transfer Service (tablas: transferencia, beneficiario, riel_pago, transferencia_programada) ----------

export type RielPago = {
  id_riel: string;
  tipo: string;
  pais: string | null;
  activo: boolean;
};

export function createRail(data: { tipo: string; pais?: string }) {
  return request<RielPago>(`${TRANSFER_URL}/payment-rails`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listRails() {
  return request<RielPago[]>(`${TRANSFER_URL}/payment-rails`);
}

export type Beneficiario = {
  id_beneficiario: string;
  id_usuario: string;
  nombre: string | null;
  cuenta_destino: string;
  banco_destino: string | null;
  favorito?: boolean;
  alias?: string | null;
};

export function createBeneficiary(data: {
  id_usuario: string;
  nombre?: string;
  cuenta_destino: string;
  banco_destino?: string;
  favorito?: boolean;
  alias?: string;
}) {
  return request<Beneficiario>(`${TRANSFER_URL}/beneficiaries`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listBeneficiaries(id_usuario?: string) {
  const q = id_usuario ? `?id_usuario=${id_usuario}` : "";
  return request<Beneficiario[]>(`${TRANSFER_URL}/beneficiaries${q}`);
}

export function updateBeneficiary(id: string, data: { favorito?: boolean; alias?: string; nombre?: string }) {
  return request<Beneficiario>(`${TRANSFER_URL}/beneficiaries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteBeneficiary(id: string): Promise<void> {
  const res = await fetch(`${TRANSFER_URL}/beneficiaries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(`Error HTTP ${res.status}`, res.status);
}

export type Transferencia = {
  id_transferencia: string;
  id_cuenta_origen: string;
  id_beneficiario: string;
  id_riel: string;
  monto: string;
  estado: string;
  fecha_solicitud: string;
  concepto?: string | null;
  referencia?: string | null;
};

export function createTransfer(data: {
  id_cuenta_origen: string;
  id_beneficiario: string;
  id_riel: string;
  monto: string;
  concepto?: string;
  idempotency_key?: string;
}) {
  return request<{
    transferencia: Transferencia;
    id_transaccion_ledger: string;
    validado_via: string;
    event_published: boolean;
  }>(`${TRANSFER_URL}/transfers`, { method: "POST", body: JSON.stringify(data) });
}

export function listTransfers(limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return request<Transferencia[]>(`${TRANSFER_URL}/transfers${qs ? `?${qs}` : ""}`);
}


const CARD_URL =
  process.env.NEXT_PUBLIC_CARD_API_URL ?? "http://localhost:8005";
const FRAUD_URL =
  process.env.NEXT_PUBLIC_FRAUD_API_URL ?? "http://localhost:8006";
const COMPLIANCE_URL =
  process.env.NEXT_PUBLIC_COMPLIANCE_API_URL ?? "http://localhost:8008";

const NOTIFICATION_URL =
  process.env.NEXT_PUBLIC_NOTIFICATION_API_URL ?? "http://localhost:8007";

// ---------- Notification Service (tabla: notificacion) ----------

export type Notificacion = {
  id_notificacion: string;
  id_usuario: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  correo_enviado: boolean;
  fecha: string;
};

export function listNotificaciones(idUsuario: string) {
  return request<Notificacion[]>(`${NOTIFICATION_URL}/notifications?id_usuario=${idUsuario}`);
}

export function marcarNotificacionLeida(id: string) {
  return request<Notificacion>(`${NOTIFICATION_URL}/notifications/${id}/read`, { method: "PATCH" });
}

export async function marcarTodasLeidas(idUsuario: string): Promise<void> {
  const res = await fetch(`${NOTIFICATION_URL}/notifications/read-all?id_usuario=${idUsuario}`, { method: "POST" });
  if (!res.ok) throw new ApiError(`Error HTTP ${res.status}`, res.status);
}

// ---------- Card Service (tablas: tarjeta, autorizacion, bloqueo) ----------

export type Bloqueo = {
  id_bloqueo: string;
  id_tarjeta: string;
  motivo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
};

export type Tarjeta = {
  id_tarjeta: string;
  numero_tarjeta: string | null;
  id_cuenta: string;
  tipo_tarjeta: string;
  procesador_externo: string;
  estado: "activa" | "bloqueada" | "vencida" | "congelada";
  fecha_emision: string;
  bloqueos?: Bloqueo[];
};

export type Autorizacion = {
  id_autorizacion: string;
  id_tarjeta: string;
  monto: number;
  comercio: string;
  resultado: "aprobada" | "rechazada";
  fecha_hora: string;
};

export function createCard(data: {
  id_cuenta: string;
  tipo_tarjeta?: string;
  procesador_externo?: string;
  estado?: "activa" | "bloqueada" | "vencida" | "congelada";
}) {
  return request<Tarjeta>(`${CARD_URL}/cards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listCards(idCuenta?: string) {
  const url = idCuenta ? `${CARD_URL}/cards?id_cuenta=${idCuenta}` : `${CARD_URL}/cards`;
  return request<Tarjeta[]>(url);
}

export function getCard(idTarjeta: string) {
  return request<Tarjeta>(`${CARD_URL}/cards/${idTarjeta}`);
}

export function blockCard(idTarjeta: string, motivo: string) {
  return request<Bloqueo>(`${CARD_URL}/cards/${idTarjeta}/bloquear`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
}

export function unblockCard(idTarjeta: string) {
  return request<Tarjeta>(`${CARD_URL}/cards/${idTarjeta}/desbloquear`, {
    method: "POST",
  });
}

export function authorizeCardTransaction(data: {
  id_tarjeta: string;
  monto: number;
  comercio: string;
}) {
  return request<Autorizacion>(`${CARD_URL}/cards/autorizar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listCardAuthorizations(idTarjeta: string) {
  return request<Autorizacion[]>(`${CARD_URL}/cards/${idTarjeta}/autorizaciones`);
}

export function listAllAuthorizations() {
  return request<Autorizacion[]>(`${CARD_URL}/cards/all/autorizaciones`);
}

/** Revela el número completo de tarjeta al propietario autenticado.
 * El backend valida que el id_usuario es el dueño de la tarjeta. */
export async function revelarNumeroTarjeta(
  idTarjeta: string,
  idUsuario: string
): Promise<{ id_tarjeta: string; numero_tarjeta: string; numero_formateado: string }> {
  return request(`${CARD_URL}/cards/${idTarjeta}/numero?id_usuario=${encodeURIComponent(idUsuario)}`);
}

export function toggleFreezeCard(idTarjeta: string) {
  return request<Tarjeta>(`${CARD_URL}/cards/${idTarjeta}/toggle-freeze`, { method: "PATCH" });
}

/** El administrador puede eliminar (marcar como vencida) una tarjeta. */
export async function eliminarTarjeta(idTarjeta: string): Promise<void> {
  const res = await fetch(`${CARD_URL}/cards/${idTarjeta}`, { method: "DELETE" });
  if (!res.ok) {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await res.json() : null;
    throw new ApiError(body?.detail ?? `Error ${res.status}`, res.status);
  }
}

// ---------- Fraud Service (tablas: regla_fraude, evaluacion_fraude, alerta_fraude) ----------

export type ReglaFraude = {
  id_regla: string;
  nombre: string;
  tipo: string;
  umbral: number;
  activa: boolean;
};

export type AlertaFraude = {
  id_alerta: string;
  id_evaluacion: string;
  estado: string;
  prioridad: "baja" | "media" | "alta";
  fecha_generacion: string;
  motivo?: string | null;
  monto?: number | null;
};

export type EvaluacionFraude = {
  id_evaluacion: string;
  id_transaccion: string;
  id_regla: string;
  score_riesgo: number;
  resultado: string;
  fecha_evaluacion: string;
  alertas?: AlertaFraude[];
};

export function createFraudRule(data: {
  nombre: string;
  tipo?: string;
  umbral: number;
  activa?: boolean;
}) {
  return request<ReglaFraude>(`${FRAUD_URL}/fraud/rules`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listFraudRules() {
  return request<ReglaFraude[]>(`${FRAUD_URL}/fraud/rules`);
}

export function evaluateTransactionManual(data: {
  id_transaccion: string;
  monto_transaccion: number;
}) {
  return request<EvaluacionFraude>(`${FRAUD_URL}/fraud/evaluate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listFraudEvaluations() {
  return request<EvaluacionFraude[]>(`${FRAUD_URL}/fraud/evaluations`);
}

export function listFraudAlerts(limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return request<AlertaFraude[]>(`${FRAUD_URL}/fraud/alerts${qs ? `?${qs}` : ""}`);
}

export function resolveFraudAlert(idAlerta: string) {
  return request<AlertaFraude>(`${FRAUD_URL}/fraud/alerts/${idAlerta}/resolve`, {
    method: "PATCH",
  });
}

// ---------- Self-service: El usuario solicita su propia tarjeta (POST /cards/solicitar) ----------

export function solicitarTarjetaCliente(data: {
  id_usuario: string;
  id_cuenta: string;
  tipo_tarjeta?: "virtual" | "fisica";
}) {
  return request<Tarjeta>(`${CARD_URL}/cards/solicitar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------- Buscar cuenta por número para transferencias ----------

export type DestinatarioPublico = {
  id_cuenta: string;
  numero_cuenta_enmascarado: string;
  tipo_cuenta: string;
  moneda: string;
  nombre_titular: string;
};

export function getCuentaPublica(idCuenta: string) {
  return request<DestinatarioPublico>(`${ACCOUNT_URL}/accounts/${idCuenta}/public`);
}

export async function buscarCuentaPorNumero(numeroCuenta: string): Promise<DestinatarioPublico | null> {
  try {
    return await request<DestinatarioPublico>(`${ACCOUNT_URL}/accounts/by-numero/${numeroCuenta}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 409)) return null;
    throw err;
  }
}

// ---------- Admin Stats (GET /stats de cada servicio) ----------

export type AdminStats = {
  identity: { total_usuarios: number; usuarios_aprobados: number; usuarios_pendientes: number };
  account: { total_cuentas: number; cuentas_activas: number };
  transfer: { total_transferencias: number; transferencias_hoy: number };
  fraud: { total_alertas: number; alertas_pendientes: number };
  card: { total_tarjetas: number; tarjetas_activas: number };
  ledger: { total_transacciones: number };
  notification: { total_notificaciones: number };
  compliance: { total_reportes: number; total_sospechosas: number; sospechosas_pendientes: number; total_auditorias: number };
};

export async function fetchAdminStats(): Promise<AdminStats> {
  const safe = async <T>(url: string, fallback: T): Promise<T> => {
    try { return await request<T>(`${url}/stats`); } catch { return fallback; }
  };
  const [identity, account, transfer, fraud, card, ledger, notification, compliance] = await Promise.all([
    safe(IDENTITY_URL, { total_usuarios: 0, usuarios_aprobados: 0, usuarios_pendientes: 0 }),
    safe(ACCOUNT_URL, { total_cuentas: 0, cuentas_activas: 0 }),
    safe(TRANSFER_URL, { total_transferencias: 0, transferencias_hoy: 0 }),
    safe(FRAUD_URL, { total_alertas: 0, alertas_pendientes: 0 }),
    safe(CARD_URL, { total_tarjetas: 0, tarjetas_activas: 0 }),
    safe(LEDGER_URL, { total_transacciones: 0 }),
    safe(NOTIFICATION_URL, { total_notificaciones: 0 }),
    safe(COMPLIANCE_URL, { total_reportes: 0, total_sospechosas: 0, sospechosas_pendientes: 0, total_auditorias: 0 }),
  ]);
  return { identity, account, transfer, fraud, card, ledger, notification, compliance };
}

export function solicitarReset(email: string) {
  return request<{mensaje: string; codigo_debug?: string}>(`${IDENTITY_URL}/auth/solicitar-reset`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetClave(email: string, codigo: string, nueva_clave: string) {
  return request<{mensaje: string}>(`${IDENTITY_URL}/auth/reset-clave`, {
    method: "POST",
    body: JSON.stringify({ email, codigo, nueva_clave }),
  });
}

// ---------- Compliance & Analytics Service ----------

export type ReporteRegulatorio = {
  id_reporte: string;
  tipo_reporte: string;
  periodo: string;
  fecha_generacion: string;
  estado: string;
  contenido: string | null;
  generado_por: string | null;
};

export type TransaccionSospechosa = {
  id_sospecha: string;
  id_transferencia: string;
  id_cuenta_origen: string;
  id_usuario: string;
  motivo: string;
  nivel_riesgo: string;
  monto: number | null;
  fecha_deteccion: string;
  id_reporte: string | null;
  estado: string;
};

export type AuditoriaCompliance = {
  id_auditoria: string;
  id_sospecha: string;
  auditor: string | null;
  resultado: string;
  notas: string | null;
  fecha_auditoria: string;
};

export function listReportesRegulatorios(tipo?: string, estado?: string) {
  const params = new URLSearchParams();
  if (tipo) params.set("tipo_reporte", tipo);
  if (estado) params.set("estado", estado);
  const qs = params.toString();
  return request<ReporteRegulatorio[]>(`${COMPLIANCE_URL}/compliance/reportes${qs ? "?" + qs : ""}`);
}

export function createReporteRegulatorio(data: { tipo_reporte: string; periodo: string; contenido?: string; generado_por?: string }) {
  return request<ReporteRegulatorio>(`${COMPLIANCE_URL}/compliance/reportes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateReporteEstado(idReporte: string, estado: string) {
  return request<ReporteRegulatorio>(`${COMPLIANCE_URL}/compliance/reportes/${idReporte}`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export function listTransaccionesSospechosas(estado?: string, nivel?: string) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (nivel) params.set("nivel_riesgo", nivel);
  const qs = params.toString();
  return request<TransaccionSospechosa[]>(`${COMPLIANCE_URL}/compliance/sospechosas${qs ? "?" + qs : ""}`);
}

export function flagTransaccionSospechosa(data: {
  id_transferencia: string;
  id_cuenta_origen: string;
  id_usuario: string;
  motivo: string;
  nivel_riesgo: string;
  monto?: number;
}) {
  return request<TransaccionSospechosa>(`${COMPLIANCE_URL}/compliance/sospechosas`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSospechaEstado(idSospecha: string, estado: string) {
  return request<TransaccionSospechosa>(`${COMPLIANCE_URL}/compliance/sospechosas/${idSospecha}`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export function listAuditoriasCompliance(idSospecha?: string) {
  const qs = idSospecha ? `?id_sospecha=${idSospecha}` : "";
  return request<AuditoriaCompliance[]>(`${COMPLIANCE_URL}/compliance/auditorias${qs}`);
}

export function createAuditoriaCompliance(data: { id_sospecha: string; auditor?: string; resultado: string; notas?: string }) {
  return request<AuditoriaCompliance>(`${COMPLIANCE_URL}/compliance/auditorias`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================================================
// NUEVAS APIS ESTILO NEQUI Y NOTIFICACIONES
// ============================================================================

// 1. Notificaciones (Email Gmail/Resend y WhatsApp)
export function getNotificationChannelsStatus() {
  return request<{
    gmail_configured: boolean;
    resend_configured: boolean;
    whatsapp_configured: boolean;
    email_sandbox_active: boolean;
    whatsapp_sandbox_active: boolean;
  }>(`${NOTIFICATION_URL}/notifications/channels/status`);
}

export function sendDirectEmail(data: { to_email: string; subject: string; message: string; html_content?: string }) {
  return request<{ ok: boolean; canal: string; detalle: string }>(`${NOTIFICATION_URL}/notifications/send-email`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function sendDirectWhatsApp(data: { to_phone: string; message: string }) {
  return request<{ ok: boolean; canal: string; detalle: string; phone: string }>(`${NOTIFICATION_URL}/notifications/send-whatsapp`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 2. Bolsillos de Ahorro (Nequi Pockets)
export type Bolsillo = {
  id_bolsillo: string;
  id_cuenta: string;
  nombre: string;
  emoji: string;
  monto_meta: number | null;
  saldo_actual: number;
  bloqueado: boolean;
  fecha_creacion: string;
  progreso_porcentaje?: number | null;
};

export function listBolsillos(idCuenta: string) {
  return request<Bolsillo[]>(`${ACCOUNT_URL}/accounts/${idCuenta}/bolsillos`);
}

export function createBolsillo(idCuenta: string, data: { nombre: string; emoji?: string; monto_meta?: number; bloqueado?: boolean }) {
  return request<Bolsillo>(`${ACCOUNT_URL}/accounts/${idCuenta}/bolsillos`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function meterPlataBolsillo(idBolsillo: string, monto: number) {
  return request<Bolsillo>(`${ACCOUNT_URL}/accounts/bolsillos/${idBolsillo}/meter-plata`, {
    method: "POST",
    body: JSON.stringify({ monto }),
  });
}

export function sacarPlataBolsillo(idBolsillo: string, monto: number) {
  return request<Bolsillo>(`${ACCOUNT_URL}/accounts/bolsillos/${idBolsillo}/sacar-plata`, {
    method: "POST",
    body: JSON.stringify({ monto }),
  });
}

export function deleteBolsillo(idBolsillo: string) {
  return fetch(`${ACCOUNT_URL}/accounts/bolsillos/${idBolsillo}`, { method: "DELETE" });
}

// 3. Saca Plata / Retiro sin Tarjeta (Nequi Cashout)
export type TokenRetiro = {
  id_token: string;
  id_cuenta: string;
  codigo_retiro: string;
  monto: number;
  estado: string;
  fecha_creacion: string;
  fecha_expiracion: string;
};

export function generarTokenRetiro(idCuenta: string, monto: number) {
  return request<TokenRetiro>(`${ACCOUNT_URL}/accounts/${idCuenta}/retiro-token`, {
    method: "POST",
    body: JSON.stringify({ monto }),
  });
}

// 4. Servicios Públicos y Facturas (Nequi "Paga tus servicios")
export type ConvenioServicio = {
  codigo: string;
  nombre: string;
  categoria: string;
  logo_emoji: string;
};

export function listConveniosServicios() {
  return request<ConvenioServicio[]>(`${TRANSFER_URL}/transfers/servicios/convenios`);
}

export function consultarFacturaServicio(convenioCodigo: string, referenciaPago: string) {
  return request<{
    convenio_codigo: string;
    nombre_convenio: string;
    referencia_pago: string;
    monto: number;
    fecha_vencimiento: string;
    estado_factura: string;
  }>(`${TRANSFER_URL}/transfers/servicios/consultar`, {
    method: "POST",
    body: JSON.stringify({ convenio_codigo: convenioCodigo, referencia_pago: referenciaPago }),
  });
}

export function pagarServicioPublico(data: { id_cuenta_origen: string; convenio_codigo: string; referencia_pago: string; monto: number }) {
  return request<{
    id_pago: string;
    comprobante: string;
    nombre_convenio: string;
    referencia_pago: string;
    monto: number;
    fecha_pago: string;
    estado: string;
  }>(`${TRANSFER_URL}/transfers/servicios/pagar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 5. Pagos con Código QR (Nequi QR / Bre-B)
export function generarCodigoQR(data: { id_cuenta_destino: string; nombre_titular: string; monto?: number; concepto?: string }) {
  return request<{
    qr_payload: string;
    qr_token: string;
    cuenta_destino: string;
    nombre_titular: string;
    monto: number | null;
    concepto: string | null;
  }>(`${TRANSFER_URL}/transfers/qr/generar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function decodificarQR(qrPayload: string) {
  return request<{
    valido: boolean;
    id_cuenta_destino: string;
    nombre_titular: string;
    token_qr: string;
    monto_sugerido: number | null;
    concepto: string | null;
  }>(`${TRANSFER_URL}/transfers/qr/decodificar?qr_payload=${encodeURIComponent(qrPayload)}`, {
    method: "POST",
  });
}

export function pagarConQR(data: { id_cuenta_origen: string; qr_payload: string; monto?: number }) {
  return request<any>(`${TRANSFER_URL}/transfers/qr/pagar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 6. Clave Dinámica / OTP (2FA)
export function generarOTP(idUsuario: string, operacion = "general") {
  return request<{ valido: boolean; mensaje: string; codigo_debug?: string }>(`${IDENTITY_URL}/auth/otp/generar`, {
    method: "POST",
    body: JSON.stringify({ id_usuario: idUsuario, operacion }),
  });
}

export function validarOTP(idUsuario: string, codigo: string, operacion = "general") {
  return request<{ valido: boolean; mensaje: string }>(`${IDENTITY_URL}/auth/otp/validar`, {
    method: "POST",
    body: JSON.stringify({ id_usuario: idUsuario, codigo, operacion }),
  });
}

