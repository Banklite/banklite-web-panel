"use client";
import { useState } from "react";
import {
  HelpCircle, ChevronDown, ChevronUp, Phone, Mail, Shield, CreditCard, ArrowRightLeft, User,
} from "lucide-react";

type Faq = { q: string; a: string };
type Categoria = { titulo: string; icon: typeof User; items: Faq[] };

const CATEGORIAS: Categoria[] = [
  {
    titulo: "Cuenta y Registro",
    icon: User,
    items: [
      {
        q: "¿Qué es la verificación KYC?",
        a: "KYC (Conozca a su Cliente) es el proceso con el que validamos su identidad usando su documento y datos personales. Es obligatorio por regulación y es necesario para abrir una cuenta, solicitar tarjetas y realizar transferencias.",
      },
      {
        q: "¿Cómo completo mi perfil?",
        a: "Ingrese a \"Mi Perfil\" y pulse \"Completar Perfil\". Diligencie su cédula, país y fechas de expedición y vencimiento, y fecha de nacimiento. Al guardar, su identidad se validará automáticamente.",
      },
      {
        q: "¿Por qué mi estado aparece como KYC pendiente?",
        a: "Significa que aún estamos validando sus datos o que un asesor debe revisarlos. Verifique que su información esté completa y correcta; si el estado persiste, contáctenos.",
      },
      {
        q: "¿Cómo veo el número de mi cuenta?",
        a: "En \"Mi Perfil\", dentro de Datos Personales, encontrará el número, el tipo y el estado de su cuenta bancaria.",
      },
    ],
  },
  {
    titulo: "Transferencias",
    icon: ArrowRightLeft,
    items: [
      {
        q: "¿Cómo realizo una transferencia?",
        a: "Vaya a la sección de Transferencias, elija la cuenta de origen, seleccione o agregue un beneficiario, indique el monto y el concepto, y confirme. Verá el estado de la operación en su historial.",
      },
      {
        q: "¿Cuáles son los límites de transferencia?",
        a: "Puede transferir hasta $5.000.000 COP por transacción y hasta $10.000.000 COP por día. Los montos que superen estos límites serán rechazados.",
      },
      {
        q: "¿Qué pasa si una transferencia es marcada como posible fraude?",
        a: "Nuestro sistema evalúa cada operación en tiempo real. Si detecta un patrón inusual, la transferencia se retiene y se genera una alerta para revisión del equipo de seguridad. Le notificaremos el resultado y, si es una operación legítima, será liberada.",
      },
      {
        q: "¿Puedo guardar beneficiarios frecuentes?",
        a: "Sí. Al crear un beneficiario puede asignarle un alias y marcarlo como favorito para encontrarlo más rápido en futuras transferencias.",
      },
    ],
  },
  {
    titulo: "Tarjetas",
    icon: CreditCard,
    items: [
      {
        q: "¿Cómo solicito una tarjeta?",
        a: "En \"Mis Tarjetas\" pulse \"Solicitar Tarjeta\", elija la cuenta asociada y el tipo (virtual o física). Necesita tener su identidad verificada y una cuenta activa.",
      },
      {
        q: "¿Cómo congelo o descongelo mi tarjeta?",
        a: "En \"Mis Tarjetas\", debajo de la tarjeta, pulse \"Congelar tarjeta\". Mientras esté congelada no se aprobarán compras. Para reactivarla, pulse \"Descongelar tarjeta\"; el cambio es inmediato.",
      },
      {
        q: "¿Cómo veo el número completo de mi tarjeta?",
        a: "Pulse el ícono del ojo sobre la tarjeta. El número se muestra solo a usted como titular y puede ocultarlo de nuevo con el mismo botón.",
      },
      {
        q: "¿Qué hago si pierdo mi tarjeta?",
        a: "Congélela de inmediato desde \"Mis Tarjetas\" y comuníquese con nuestra línea de atención para solicitar una reposición.",
      },
    ],
  },
  {
    titulo: "Seguridad",
    icon: Shield,
    items: [
      {
        q: "¿Cómo cambio mi contraseña?",
        a: "Vaya a \"Mi Perfil\" y baje hasta la sección \"Cambiar contraseña\". Ingrese su contraseña actual, la nueva (mínimo 6 caracteres) y confírmela.",
      },
      {
        q: "¿Cómo creo una contraseña segura?",
        a: "Use una combinación de letras, números y símbolos, evite datos personales como fechas o nombres y no reutilice contraseñas de otros servicios.",
      },
      {
        q: "¿BankLite me pedirá mi clave por correo o teléfono?",
        a: "Nunca. Ningún funcionario le solicitará su contraseña ni códigos. Si recibe un mensaje sospechoso, no responda y repórtelo a nuestro correo de soporte.",
      },
      {
        q: "Noto movimientos que no reconozco, ¿qué hago?",
        a: "Congele sus tarjetas, cambie su contraseña y contáctenos de inmediato para revisar la actividad y abrir una investigación.",
      },
    ],
  },
];

export default function AyudaPage() {
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <div className="space-y-8 max-w-3xl pb-10">
      <div className="flex items-center gap-4">
        <div className="bg-brand-100 p-3 rounded-2xl text-brand-600">
          <HelpCircle size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Centro de Ayuda</h1>
          <p className="text-lg text-slate-500">Encuentre respuestas a las preguntas más frecuentes.</p>
        </div>
      </div>

      {CATEGORIAS.map((cat) => (
        <section key={cat.titulo} className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
          <div className="bg-brand-600 text-white px-6 py-4 flex items-center gap-3">
            <cat.icon size={22} />
            <h2 className="text-lg font-bold">{cat.titulo}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {cat.items.map((item) => {
              const id = `${cat.titulo}::${item.q}`;
              const open = abierto === id;
              return (
                <div key={id}>
                  <button
                    type="button"
                    onClick={() => setAbierto(open ? null : id)}
                    aria-expanded={open}
                    className={`w-full flex items-center justify-between gap-4 text-left px-6 py-4 transition-colors hover:bg-brand-50 ${
                      open ? "bg-brand-50" : ""
                    }`}
                  >
                    <span className={`font-semibold ${open ? "text-brand-700" : "text-slate-800"}`}>{item.q}</span>
                    {open ? (
                      <ChevronUp size={20} className="text-brand-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="px-6 pb-5 pt-1 text-slate-600 leading-relaxed bg-brand-50">{item.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="bg-brand-900 text-white rounded-3xl p-8 space-y-4">
        <h2 className="text-2xl font-black">¿Necesita más ayuda?</h2>
        <p className="text-brand-100">Nuestro equipo de soporte está disponible para atenderle.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-5 py-4 flex-1">
            <Phone size={22} className="text-brand-100" />
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-100">Línea de atención</p>
              <p className="font-bold">+57 601 555 0123</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-5 py-4 flex-1">
            <Mail size={22} className="text-brand-100" />
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-100">Correo</p>
              <p className="font-bold">soporte@banklite.com</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
