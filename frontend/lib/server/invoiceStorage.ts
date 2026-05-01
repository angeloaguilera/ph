import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const DATA_ROOT = path.join(process.cwd(), "data");

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function safeFolderName(value: string, fallback = "sin_empresa") {
  const cleaned = stripAccents(String(value || ""))
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return cleaned || fallback;
}

function safeFilePart(value: string, fallback = "invoice") {
  const cleaned = stripAccents(String(value || ""))
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return cleaned || fallback;
}

export function extractInvoice(body: any) {
  if (body && typeof body === "object" && body.invoice && typeof body.invoice === "object") {
    return body.invoice;
  }
  return body ?? {};
}

export function normalizeRecord(body: any, existing?: any) {
  const base = existing
    ? {
        ...existing,
        ...body,
        invoice: {
          ...(existing.invoice ?? {}),
          ...(body?.invoice ?? {}),
        },
      }
    : body;

  const invoice = extractInvoice(base);

  const now = new Date().toISOString();
  const invoiceId = String(invoice.id ?? base.id ?? crypto.randomUUID());

  const customer = invoice.customer ?? base.customer ?? {};
  const companyName =
    customer.name ||
    base.companyName ||
    invoice.companyName ||
    "sin_empresa";

  const numeroFactura =
    invoice.numeroFactura ??
    base.numeroFactura ??
    invoice.invoiceNumber ??
    base.invoiceNumber ??
    "";

  const numeroControl =
    invoice.numeroControl ??
    base.numeroControl ??
    invoice.controlNumber ??
    base.controlNumber ??
    "";

  const voucherAddress =
    invoice.voucherAddress ??
    base.voucherAddress ??
    invoice.voucherUrl ??
    base.voucherUrl ??
    invoice.voucherDireccion ??
    base.voucherDireccion ??
    "";

  const normalizedInvoice = {
    ...invoice,
    id: invoiceId,
    customer,
    companyName,
    numeroFactura,
    numeroControl,
    voucherAddress,
    createdAt:
      invoice.createdAt ??
      existing?.invoice?.createdAt ??
      now,
    updatedAt: now,
  };

  const inventoryResult =
    base.inventoryResult ??
    existing?.inventoryResult ??
    {
      inventory: [],
      changes: {
        created: [],
        updated: [],
      },
    };

  return {
    invoice: normalizedInvoice,
    inventoryResult,
    meta: base.meta ?? existing?.meta ?? {},
  };
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  const result: string[] = [];

  let entries: any[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkJsonFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      result.push(full);
    }
  }

  return result;
}

export async function findInvoiceFileById(id: string) {
  const files = await walkJsonFiles(DATA_ROOT);

  for (const file of files) {
    if (file.includes(`${id}.json`)) return file;

    try {
      const txt = await fs.readFile(file, "utf8");
      const data = JSON.parse(txt);
      const currentId = String(data?.invoice?.id ?? data?.id ?? "");
      if (currentId === String(id)) return file;
    } catch {
      // ignore
    }
  }

  return null;
}

export async function saveInvoiceRecord(body: any, existing?: any, oldPath?: string) {
  const normalized = normalizeRecord(body, existing);
  const companyFolder = safeFolderName(
    normalized.invoice.customer?.name ||
      normalized.invoice.companyName ||
      "sin_empresa"
  );

  const invoiceLabel = safeFilePart(
    normalized.invoice.numeroFactura ||
      normalized.invoice.invoiceName ||
      normalized.invoice.id ||
      "invoice"
  );

  const dir = path.join(DATA_ROOT, companyFolder, "invoices");
  const fileName = `${invoiceLabel}-${normalized.invoice.id}.json`;
  const filePath = path.join(dir, fileName);

  await ensureDir(filePath);

  const record = {
    ...normalized,
    storage: {
      companyFolder,
      fileName,
      filePath,
      savedAt: new Date().toISOString(),
    },
  };

  await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");

  if (oldPath && oldPath !== filePath) {
    try {
      await fs.unlink(oldPath);
    } catch {
      // ignore
    }
  }

  return { record, filePath };
}

export async function readInvoiceRecordById(id: string) {
  const filePath = await findInvoiceFileById(id);
  if (!filePath) return null;

  const txt = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(txt);
  return { filePath, data };
}

export async function deleteInvoiceRecordById(id: string) {
  const filePath = await findInvoiceFileById(id);
  if (!filePath) return null;

  await fs.unlink(filePath);
  return { filePath };
}