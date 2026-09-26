import { ClienteShell } from "@/components/ClienteShell";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return <ClienteShell>{children}</ClienteShell>;
}
