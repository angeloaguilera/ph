// app/finance/accounting/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Financial Position Dashboard",
  description: "Demo para evitar hydration mismatches",
};

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return (
      <main>{children}</main>
  );
}
