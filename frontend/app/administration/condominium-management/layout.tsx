// app/administration/condominium-management/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Condominium Management",
  description: "Demo para evitar hydration mismatches",
};

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return (
      <main>{children}</main>
  );
}
