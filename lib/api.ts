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
