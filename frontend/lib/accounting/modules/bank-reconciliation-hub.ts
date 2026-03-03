// lib/accounting/modules/bank-reconciliation-hub.ts
import type { Invoice } from "@/types/invoice";

export async function generateFromInvoice(invoice: Invoice) {
  // ejemplo: crea un registro de conciliación
  return {
    invoiceId: invoice.id,
    bank: invoice.bank || null,
    date: invoice.date,
    amount: invoice.total,
    status: invoice.bank ? "READY_TO_RECONCILE" : "NO_BANK",
    notes: invoice.bank ? "Pago registrado por banco" : "Factura sin banco asignado",
  };
}