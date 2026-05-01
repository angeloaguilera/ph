import type { Invoice } from "@/types/invoice";

export const STORAGE_KEY = "invoices";

export type SortKey = "date" | "invoiceName" | "total" | "bank" | "type";
export type FeedbackType = "success" | "error" | "info";
export type ContextAction =
  | "view"
  | "edit"
  | "clone"
  | "debit"
  | "credit"
  | "download"
  | "delete";

export type FeedbackState = {
  type: FeedbackType;
  message: string;
};

export type ContextMenuState = {
  x: number;
  y: number;
  invoice: Invoice;
} | null;

export const genId = () =>
  typeof globalThis !== "undefined" &&
  (globalThis as any).crypto &&
  "randomUUID" in (globalThis as any).crypto
    ? (globalThis as any).crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function ensureInvoiceId(inv: Partial<Invoice> | any): Invoice {
  if (inv?.id) return inv as Invoice;
  return { ...(inv as Invoice), id: genId() } as Invoice;
}

export function normalizeApiResponseToInvoices(data: any): Invoice[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((x: Partial<Invoice>) => ensureInvoiceId(x));
  }

  if (Array.isArray(data?.invoices)) {
    return data.invoices.map((x: Partial<Invoice>) => ensureInvoiceId(x));
  }

  if (data?.invoice && typeof data.invoice === "object") {
    return [ensureInvoiceId(data.invoice)];
  }

  if (typeof data === "object" && !Array.isArray(data)) {
    const looksLikeInvoice =
      "invoiceName" in data ||
      "total" in data ||
      "date" in data ||
      "numeroFactura" in data ||
      "customer" in data;

    if (looksLikeInvoice) {
      return [ensureInvoiceId(data)];
    }
  }

  return [];
}

export function readFromLocalStorage(): Invoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ensureInvoiceId(p));
  } catch {
    return [];
  }
}

export function writeToLocalStorage(invoices: Invoice[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error("Error guardando en localStorage:", e);
  }
}

export const formatCurrency = (n?: number | string) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

export const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
};

export const escapeCsv = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export function toCSV(rows: Invoice[]) {
  const headers = [
    "id",
    "type",
    "invoiceName",
    "date",
    "bank",
    "amount",
    "iva",
    "total",
    "description",
  ];

  const lines = [headers.join(",")];

  for (const r of rows) {
    const vals = [
      escapeCsv(r.id ?? ""),
      escapeCsv(r.type ?? ""),
      escapeCsv(r.invoiceName ?? ""),
      escapeCsv(r.date ?? ""),
      escapeCsv(r.bank ?? ""),
      Number(r.amount ?? 0).toFixed(2),
      Number(r.iva ?? 0).toFixed(2),
      Number(r.total ?? 0).toFixed(2),
      escapeCsv(String(r.description ?? "")),
    ];
    lines.push(vals.join(","));
  }

  return lines.join("\n");
}

export function createDerivedInvoice(
  base: Invoice,
  kind: "clone" | "debit" | "credit"
): Invoice {
  const typeByKind: Record<typeof kind, string> = {
    clone: base.type ?? "Clon",
    debit: "Nota débito",
    credit: "Nota crédito",
  };

  const suffixByKind: Record<typeof kind, string> = {
    clone: " (copia)",
    debit: " (nota débito)",
    credit: " (nota crédito)",
  };

  return ensureInvoiceId({
    ...base,
    id: genId(),
    type: typeByKind[kind],
    invoiceName: `${base.invoiceName ?? "Sin nombre"}${suffixByKind[kind]}`,
  });
}

export function sortInvoices(
  invoices: Invoice[],
  sortBy: SortKey,
  sortDir: "asc" | "desc"
) {
  const dir = sortDir === "asc" ? 1 : -1;

  return [...invoices].sort((a, b) => {
    if (sortBy === "date") {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return (da - db) * dir;
    }

    if (sortBy === "total") {
      return (Number(a.total ?? 0) - Number(b.total ?? 0)) * dir;
    }

    if (sortBy === "invoiceName") {
      return (
        String(a.invoiceName ?? "").localeCompare(String(b.invoiceName ?? "")) *
        dir
      );
    }

    if (sortBy === "bank") {
      return String(a.bank ?? "").localeCompare(String(b.bank ?? "")) * dir;
    }

    if (sortBy === "type") {
      return String(a.type ?? "").localeCompare(String(b.type ?? "")) * dir;
    }

    return 0;
  });
}

export function filterInvoices(invoices: Invoice[], filter: string) {
  const q = filter.trim().toLowerCase();

  return invoices.filter((inv) => {
    if (!q) return true;

    return (
      (inv.invoiceName ?? "").toLowerCase().includes(q) ||
      String(inv.description ?? "").toLowerCase().includes(q) ||
      (inv.bank ?? "").toLowerCase().includes(q) ||
      (inv.date ?? "").toLowerCase().includes(q) ||
      (inv.type ?? "").toLowerCase().includes(q)
    );
  });
}