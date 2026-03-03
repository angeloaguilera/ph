// lib/accounting/modules/cash-management-flow.ts
import type { Invoice } from "@/types/invoice";

export async function generateFromInvoice(invoice: Invoice) {
  // ejemplo: genera instrucción para tesorería
  return {
    invoiceId: invoice.id,
    suggestedAccount: "1000", // ejemplo: caja y bancos
    plannedDate: invoice.date,
    amount: invoice.total,
    note: invoice.type === "VENTA" ? "Depositar ingreso" : "Preparar pago",
  };
}
