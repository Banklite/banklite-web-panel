'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { obtenerClaveDinamica } from "@/lib/api";

interface ClaveDinamicaContextType {
  /** Clave real entregada por el servidor, o "" mientras no haya una (nunca un valor inventado). */
  clave: string;
  cargando: boolean;
  segundosRestantes: number;
  /** Mensaje de error si el servidor no pudo entregar la clave. */
  error: string | null;
  /** forzar=true emite una clave nueva aunque la actual siga vigente. */
  regenerar: (forzar?: boolean) => Promise<void>;
  idUsuario: string | null;
  setIdUsuario: (id: string | null) => void;
}

const ClaveDinamicaContext = createContext<ClaveDinamicaContextType | undefined>(undefined);

export function ClaveDinamicaProvider({ children }: { children: React.ReactNode }) {
  const [idUsuario, setIdUsuario] = useState<string | null>(null);
  const [clave, setClave] = useState<string>("");
  const [cargando, setCargando] = useState<boolean>(false);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const regenerandoRef = useRef(false);

  // La clave la deriva el servidor (HMAC por usuario y ventana de 60 s) y se valida
  // con /auth/otp/validar. No se envia por correo ni WhatsApp, y si la consulta
  // falla se muestra el error: jamas se genera un numero en el navegador.
  const regenerar = useCallback(async (forzar = false) => {
    if (!idUsuario || regenerandoRef.current) return;
    regenerandoRef.current = true;
    setCargando(true);
    try {
      const res = await obtenerClaveDinamica(forzar);
      setClave(res.codigo);
      setSegundosRestantes(res.segundos_restantes);
      setError(null);
    } catch (e) {
      setClave("");
      setSegundosRestantes(10); // reintenta pronto
      setError(e instanceof Error ? e.message : "No se pudo obtener la clave dinámica.");
    } finally {
      setCargando(false);
      regenerandoRef.current = false;
    }
  }, [idUsuario]);

  useEffect(() => {
    if (idUsuario) regenerar();
  }, [idUsuario, regenerar]);

  useEffect(() => {
    if (!idUsuario) return;
    const timer = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          regenerar();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [idUsuario, regenerar]);

  return (
    <ClaveDinamicaContext.Provider
      value={{ clave, cargando, segundosRestantes, error, regenerar, idUsuario, setIdUsuario }}
    >
      {children}
    </ClaveDinamicaContext.Provider>
  );
}

export function useClaveDinamica() {
  const ctx = useContext(ClaveDinamicaContext);
  if (!ctx) throw new Error("useClaveDinamica debe usarse dentro de ClaveDinamicaProvider");
  return ctx;
}
