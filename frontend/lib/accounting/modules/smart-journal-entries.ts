// lib/accounting/modules/smart-journal-entries.ts
import type { Invoice } from "@/types/invoice";

export async function createJournalEntryFromInvoice(invoice: Invoice) {
  // asientos básicos (ejemplo)
  if (invoice.type === "VENTA") {
    return {
      invoiceId: invoice.id,
      entries: [
        { account: "1000", debit: invoice.total, credit: 0, label: "Caja / Banco" },
        { account: "4000", debit: 0, credit: invoice.amount, label: "Ingresos por ventas" },
        { account: "2100", debit: 0, credit: invoice.iva, label: "IVA trasladado" },
      ],
    };
  } else {
    return {
      invoiceId: invoice.id,
      entries: [
        { account: "5000", debit: invoice.amount, credit: 0, label: "Gastos / Compras" },
        { account: "1200", debit: invoice.iva, credit: 0, label: "IVA acreditable" },
        { account: "1000", debit: 0, credit: invoice.total, label: "Caja / Banco" },
      ],
    };
  }
}
