import type { Invoice } from "@/types/invoice";

export type InvoiceDocumentPayload = {
  invoice: Partial<Invoice> & {
    type?: string;
    docKind?: string;
    invoiceName?: string;
    date?: string;
    amount?: number;
    iva?: number;
    ivaPercent?: number;
    total?: number;
    numeroFactura?: string;
    numeroControl?: string;
    voucherAddress?: string;
    customer?: Record<string, any>;
    payment?: Record<string, any>;
    bank?: string;
    items?: any[];
  };
  inventoryResult?: {
    inventory?: any[];
    changes?: {
      created?: any[];
      updated?: any[];
    };
  };
};

type ApiErrorBody = {
  ok?: boolean;
  message?: string;
  error?: string;
  details?: any;
};

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const hasBody =
    init.body !== undefined &&
    init.body !== null &&
    !(typeof init.body === "string" && init.body.length === 0);

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data: ApiErrorBody | T | null = null;
  const text = await res.text();

  if (text) {
    if (isJson) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    } else {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data as ApiErrorBody | null)?.message ||
      (data as ApiErrorBody | null)?.error ||
      (typeof text === "string" && text.trim() ? text : "") ||
      `Error en la API (${res.status} ${res.statusText})`;

    throw new Error(message);
  }

  return (data as T) ?? ({} as T);
}

export async function createInvoice(payload: InvoiceDocumentPayload) {
  const res = await requestJson<{ ok: true; data: any }>("/api/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.data;
}

export async function updateInvoice(id: string, payload: InvoiceDocumentPayload) {
  const res = await requestJson<{ ok: true; data: any }>(`/api/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return res.data;
}

export async function getInvoice(id: string) {
  const res = await requestJson<{ ok: true; data: any }>(`/api/invoices/${id}`, {
    method: "GET",
  });

  return res.data;
}

export async function deleteInvoice(id: string) {
  const res = await requestJson<{ ok: true; data: any }>(`/api/invoices/${id}`, {
    method: "DELETE",
  });

  return res.data;
}