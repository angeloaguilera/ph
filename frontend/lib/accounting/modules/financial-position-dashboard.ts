// lib/accounting/modules/financial-position-dashboard.ts
import type { Invoice } from "@/types/invoice";

export async function generateFromInvoice(invoice: Invoice) {
  // ejemplo: datos resumidos para balance / posición financiera
  return {
    invoiceId: invoice.id,
    impact: invoice.type === "VENTA" ? { assets: invoice.total } : { liabilities: invoice.total },
    summary: `Impacto en posición financiera por ${invoice.invoiceName}`,
  };
}