// app/finance/layout.tsx  (NO "use client" aquí — el menu es cliente)
import ClientOnly from "@/components/ClientOnly";
import AccountingMenu from "@/components/AccountingMenu";
import Clock from "@/components/Clock";

export const metadata = {
  title: "Finance",
  description: "Demo para evitar hydration mismatches",
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="finance-layout">
      <header className="p-4 border-b">
        <div className="flex items-start justify-between gap-6">
          {/* Menu numerado (cliente) */}
          <ClientOnly>
            <div className="w-full max-w-xl">
              <AccountingMenu />
            </div>
          </ClientOnly>

          {/* Resto del header (ej. Clock) */}
          <div className="ml-4 flex-shrink-0">
            <ClientOnly>
              <Clock />
            </ClientOnly>
          </div>
        </div>
      </header>

      <main className="p-4">{children}</main>
    </div>
  );
}
