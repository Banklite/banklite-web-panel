import { ClienteShell } from "@/components/ClienteShell";
import { ClaveDinamicaProvider } from "@/context/ClaveDinamicaContext";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClaveDinamicaProvider>
      <ClienteShell>{children}</ClienteShell>
    </ClaveDinamicaProvider>
  );
}
