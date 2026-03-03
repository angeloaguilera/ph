// app/finance/accounting/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Administration",
  description: "Demo para evitar hydration mismatches",
};

export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
      <main>{children}</main>
  );
}
