// app/administration/suppliers/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Auxiliary",
  description: "Demo para evitar hydration mismatches",
};

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return (
      <main>{children}</main>
  );
}
