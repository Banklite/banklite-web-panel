"use client";

/**
 * Sesión del panel — agregado a pedido del profesor para tener un login
 * real (valida contra identity-service, POST /auth/login) en vez de una
 * pantalla de acceso simulada. El token JWT y los datos del usuario se
 * guardan en localStorage del navegador (no es un artifact de chat, es la
 * app real desplegada, así que localStorage funciona normalmente aquí).
 */

import { Usuario } from "./api";

const TOKEN_KEY = "banklite_token";
const USUARIO_KEY = "banklite_usuario";

export type Sesion = {
  token: string;
  usuario: Usuario;
};

export function guardarSesion(token: string, usuario: Usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function obtenerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const usuarioRaw = localStorage.getItem(USUARIO_KEY);
  if (!token || !usuarioRaw) return null;
  try {
    return { token, usuario: JSON.parse(usuarioRaw) as Usuario };
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}
