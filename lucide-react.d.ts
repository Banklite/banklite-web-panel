// La version instalada de lucide-react no trae sus declaraciones de tipos
// completas en este entorno (dist/lucide-react.d.ts no se publico). Esto
// solo afecta el chequeo de tipos de TypeScript, no el funcionamiento real
// en el navegador (los iconos son componentes de React normales en tiempo
// de ejecucion). Este shim le dice a TypeScript que confie en el modulo.
declare module "lucide-react";
