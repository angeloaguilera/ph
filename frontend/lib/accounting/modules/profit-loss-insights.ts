// lib/accounting/modules/profit-loss-insights.ts
import type { Invoice } from "@/types/invoice";

export async function generateFromInvoice(invoice: Invoice) {
  // ejemplo: línea para estado de resultados
  const line = invoice.type === "VENTA"
    ? { account: "Ventas", amount: invoice.amount }
    : { account: "Compras", amount: invoice.amount };

  return {
    invoiceId: invoice.id,
    line,
    net: invoice.type === "VENTA" ? invoice.amount - invoice.iva : -(invoice.amount + invoice.iva),
  };
}