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
};

export function createUsuario(data: {
  nombre: string;
  apellido?: string;
  email: string;
  telefono: string;
  pais_residencia: string;
  password: string;
}) {
  return request<Usuario>(`${IDENTITY_URL}/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listUsuarios() {
  return request<Usuario[]>(`${IDENTITY_URL}/users`);
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

export function listAccounts() {
  return request<Cuenta[]>(`${ACCOUNT_URL}/accounts`);
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
};

export function createBeneficiary(data: {
  id_usuario: string;
  nombre?: string;
  cuenta_destino: string;
  banco_destino?: string;
}) {
  return request<Beneficiario>(`${TRANSFER_URL}/beneficiaries`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listBeneficiaries() {
  return request<Beneficiario[]>(`${TRANSFER_URL}/beneficiaries`);
}

export type Transferencia = {
  id_transferencia: string;
  id_cuenta_origen: string;
  id_beneficiario: string;
  id_riel: string;
  monto: string;
  estado: string;
  fecha_solicitud: string;
};

export function createTransfer(data: {
  id_cuenta_origen: string;
  id_beneficiario: string;
  id_riel: string;
  monto: string;
}) {
  return request<{
    transferencia: Transferencia;
    id_transaccion_ledger: string;
    validado_via: string;
    event_published: boolean;
  }>(`${TRANSFER_URL}/transfers`, { method: "POST", body: JSON.stringify(data) });
}

export function listTransfers() {
  return request<Transferencia[]>(`${TRANSFER_URL}/transfers`);
}


const CARD_URL =
  process.env.NEXT_PUBLIC_CARD_API_URL ?? "http://localhost:8005";
const FRAUD_URL =
  process.env.NEXT_PUBLIC_FRAUD_API_URL ?? "http://localhost:8006";

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
  id_cuenta: string;
  tipo_tarjeta: string;
  procesador_externo: string;
  estado: "activa" | "bloqueada" | "vencida";
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
  estado?: "activa" | "bloqueada" | "vencida";
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

export function listFraudAlerts() {
  return request<AlertaFraude[]>(`${FRAUD_URL}/fraud/alerts`);
}

export function resolveFraudAlert(idAlerta: string) {
  return request<AlertaFraude>(`${FRAUD_URL}/fraud/alerts/${idAlerta}/resolve`, {
    method: "PATCH",
  });
}
