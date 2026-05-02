import type { Invoice } from "@/types/invoice";

export function makeInvoiceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `inv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureInvoiceIdLocal(
  invoice: Invoice,
  existingIds?: Set<string>
): Invoice {
  const currentId = typeof invoice.id === "string" ? invoice.id.trim() : "";
  let id = currentId || makeInvoiceId();

  if (existingIds) {
    while (existingIds.has(id)) {
      id = makeInvoiceId();
    }
    existingIds.add(id);
  }

  return {
    ...invoice,
    id,
  };
}

export function normalizeInvoicesWithUniqueIds(invoices: Invoice[]): Invoice[] {
  const seen = new Set<string>();
  return invoices.map((invoice) => ensureInvoiceIdLocal(invoice, seen));
}

export function createDerivedInvoice(
  inv: Invoice,
  mode: "clone" | "debit" | "credit"
): Invoice {
  const prefix =
    mode === "clone"
      ? "Copia de "
      : mode === "debit"
      ? "Nota débito de "
      : "Nota crédito de ";

  return {
    ...inv,
    id: makeInvoiceId(),
    invoiceName: `${prefix}${inv.invoiceName || "Sin nombre"}`,
  };
}