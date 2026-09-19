import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "BankLite — Panel",
  description: "Panel web de BankLite: Identidad, Cuentas, Ledger y Transferencias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-slate-800">
        <header className="bg-gradient-to-r from-brand-700 to-brand-600 text-white sticky top-0 z-10 shadow-md">
          <div className="max-w-6xl mx-auto px-6 pt-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center font-bold text-lg">
                B
              </div>
              <div>
                <h1 className="text-xl font-semibold leading-tight">BankLite</h1>
                <p className="text-brand-100 text-xs">
                  Panel operativo — Identity · Account · Ledger · Transfer
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Nav />
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-6 pb-8 text-xs text-slate-400">
          BankLite · Arquitectura y Modelamiento de Software · Universidad Cooperativa de Colombia
        </footer>
      </body>
    </html>
  );
}
