// lib/accounting/modules/cash-flow-analytics.ts
import type { Invoice } from "@/types/invoice";

export async function generateFromInvoice(invoice: Invoice) {
  // ejemplo: agrega evento de flujo (entrada o salida)
  const type = invoice.type === "VENTA" ? "INFLOW" : "OUTFLOW";
  return {
    invoiceId: invoice.id,
    type,
    date: invoice.date,
    amount: invoice.total,
    description: invoice.invoiceName,
  };
}