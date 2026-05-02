import type React from "react";

export const STORAGE_KEY = "invoices";
export const API_BASE = "/api/invoices";

export const formatCurrency = (n?: number | string) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-ES", {
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
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

export const safeText = (v?: string | null) =>
  v && String(v).trim().length ? v : "—";

export const toInputDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fromInputDate = (value?: string) => {
  if (!value) return "";
  return `${value}T00:00:00`;
};

export const getFacturaAnuladaInfo = (value: unknown) => {
  const raw = String(value ?? "").trim().toUpperCase();

  const isNotCancelled = [
    "NO_ANULADA",
    "NO ANULADA",
    "NO",
    "FALSE",
    "0",
    "N",
    "NOT_CANCELLED",
    "NO_CANCELADA",
    "NO CANCELADA",
  ].includes(raw);

  const isCancelled = [
    "ANULADA",
    "SI",
    "SÍ",
    "YES",
    "TRUE",
    "1",
    "CANCELADA",
    "CANCELLED",
  ].includes(raw);

  if (isNotCancelled) {
    return {
      label: "NO ANULADA",
      isCancelled: false,
      color: "#166534",
      bg: "#dcfce7",
      border: "#86efac",
    };
  }

  if (isCancelled) {
    return {
      label: "ANULADA",
      isCancelled: true,
      color: "#991b1b",
      bg: "#fee2e2",
      border: "#fca5a5",
    };
  }

  return {
    label: raw || "SIN ESTADO",
    isCancelled: raw ? true : false,
    color: raw ? "#991b1b" : "#92400e",
    bg: raw ? "#fee2e2" : "#fef3c7",
    border: raw ? "#fca5a5" : "#fcd34d",
  };
};

export const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const emptyItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  kind: "",
  serviceDescription: "",
  quantity: 1,
  unitPrice: 0,
  rate: 0,
  total: 0,
});

export const normalizeInvoiceForEdit = (invoice: any) => {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  return {
    ...deepClone(invoice ?? {}),
    date: invoice?.date ? toInputDate(invoice.date) : "",
    items: items.map((it: any) => ({
      id:
        it?.id ??
        `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: it?.name ?? "",
      kind: it?.kind ?? "",
      serviceDescription: it?.serviceDescription ?? "",
      quantity: Number(it?.quantity ?? 1),
      unitPrice: Number(it?.unitPrice ?? it?.rate ?? 0),
      rate: Number(it?.rate ?? it?.unitPrice ?? 0),
      total: Number(
        it?.total ??
          Number(it?.quantity ?? 1) * Number(it?.unitPrice ?? it?.rate ?? 0)
      ),
    })),
    customer: {
      partyType: invoice?.customer?.partyType ?? "NATURAL",
      name: invoice?.customer?.name ?? "",
      phone: invoice?.customer?.phone ?? "",
      email: invoice?.customer?.email ?? "",
      address: invoice?.customer?.address ?? "",
      city: invoice?.customer?.city ?? "",
      state: invoice?.customer?.state ?? "",
      country: invoice?.customer?.country ?? "",
      rif: invoice?.customer?.rif ?? "",
      nit: invoice?.customer?.nit ?? "",
      companyId: invoice?.customer?.companyId ?? "",
    },
    payment: {
      method: invoice?.payment?.method ?? "",
      reference: invoice?.payment?.reference ?? "",
    },
  };
};

export const recalcItemTotal = (item: any) => {
  const qty = Number(item?.quantity ?? 0);
  const unit = Number(item?.unitPrice ?? item?.rate ?? 0);
  const total =
    item?.total !== "" && item?.total !== null && item?.total !== undefined
      ? Number(item.total)
      : qty * unit;

  return {
    ...item,
    quantity: qty,
    unitPrice: unit,
    rate: unit,
    total: Number.isFinite(total) ? total : qty * unit,
  };
};

export const recalcInvoiceTotals = (inv: any) => {
  const items = Array.isArray(inv?.items) ? inv.items.map(recalcItemTotal) : [];
  const subtotalFromItems = items.reduce(
    (acc: number, it: any) => acc + Number(it.total ?? 0),
    0
  );

  const subtotal = Number(
    inv?.amount !== "" && inv?.amount !== null && inv?.amount !== undefined
      ? inv.amount
      : subtotalFromItems
  );

  const ivaPercent = Number(inv?.ivaPercent ?? 0);
  const iva = Number(
    inv?.iva !== "" && inv?.iva !== null && inv?.iva !== undefined
      ? inv.iva
      : subtotal * (ivaPercent / 100)
  );

  const ivaRetenidoPercent = Number(inv?.ivaRetenidoPercent ?? 0);
  const ivaRetenido = Number(
    inv?.ivaRetenido !== "" &&
      inv?.ivaRetenido !== null &&
      inv?.ivaRetenido !== undefined
      ? inv.ivaRetenido
      : subtotal * (ivaRetenidoPercent / 100)
  );

  const islrPercent = Number(inv?.islrPercent ?? 0);
  const islr = Number(
    inv?.islr !== "" && inv?.islr !== null && inv?.islr !== undefined
      ? inv.islr
      : subtotal * (islrPercent / 100)
  );

  const total =
    inv?.total !== "" && inv?.total !== null && inv?.total !== undefined
      ? Number(inv.total)
      : subtotal + iva - ivaRetenido - islr;

  return {
    ...inv,
    items,
    amount: subtotal,
    iva,
    ivaRetenido,
    islr,
    total,
  };
};

export const getRealVoucherUrl = (current: any) => {
  if (!current) return "";

  const raw =
    current?.effectiveVoucherUrl ||
    current?.voucherUrl ||
    current?.voucherAddress ||
    "";

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
};

export const createInputStyle = (): React.CSSProperties => ({
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  background: "#fff",
  color: "#111827",
  boxSizing: "border-box",
});