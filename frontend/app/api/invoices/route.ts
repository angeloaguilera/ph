import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { saveInvoiceRecord } from "@/lib/server/invoiceStorage";

export const runtime = "nodejs";

type AnyObj = Record<string, any>;

function isObject(value: unknown): value is AnyObj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const str = String(value ?? "").trim();
    if (str) return str;
  }
  return "";
}

function resolveVoucherUrl(source: AnyObj | undefined): string {
  if (!isObject(source)) return "";

  const storage = isObject(source.storage) ? source.storage : undefined;

  return firstNonEmptyString(
    source.voucherUrl,
    source.effectiveVoucherUrl,
    source.voucherAddress,
    source.voucherURL,
    source.effectiveVoucherURL,
    source.voucherDireccion,
    source.comprobanteUrl,
    source.comprobanteURL,
    storage?.fileUrl,
    storage?.publicUrl,
    storage?.url,
    storage?.effectiveVoucherUrl,
    storage?.effectiveVoucherURL
  );
}

function normalizeInvoiceFileContent(parsed: any) {
  if (!parsed) return null;

  if (parsed?.invoice && isObject(parsed.invoice)) {
    const invoice = { ...parsed.invoice };
    const voucherUrl = resolveVoucherUrl({
      ...parsed,
      ...invoice,
      storage: parsed?.storage ?? invoice?.storage,
    });

    if (voucherUrl) {
      invoice.voucherUrl = voucherUrl;  // Aquí se asigna correctamente el voucherUrl
      invoice.voucherAddress = voucherUrl;
    }

    return invoice;
  }

  if (
    isObject(parsed) &&
    (parsed.invoiceName || parsed.total || parsed.date || parsed.customer)
  ) {
    const invoice = { ...parsed };
    const voucherUrl = resolveVoucherUrl(invoice);

    if (voucherUrl) {
      invoice.voucherUrl = voucherUrl;  // Aquí también se asegura que se asigne correctamente
      invoice.voucherAddress = voucherUrl;
    }

    return invoice;
  }

  return null;
}

async function readJsonFile(filePath: string) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function readInvoiceFilesFromFolder(folderPath: string) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = entries.filter(
    (e) => e.isFile() && e.name.toLowerCase().endsWith(".json")
  );

  const invoices: any[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(folderPath, file.name);
      const parsed = await readJsonFile(fullPath);
      const invoice = normalizeInvoiceFileContent(parsed);
      if (invoice) invoices.push(invoice);
    } catch (err) {
      console.error(`Error leyendo archivo ${file.name}:`, err);
    }
  }

  return invoices;
}

export async function GET() {
  try {
    const dataRoot = path.join(process.cwd(), "data");
    const companyFolder = "splendor_mantenimiento_c_a";
    const invoicesFolder = path.join(dataRoot, companyFolder, "invoices");

    const invoices = await readInvoiceFilesFromFolder(invoicesFolder);

    return NextResponse.json(
      {
        ok: true,
        data: invoices,
        count: invoices.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en GET /api/invoices:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error leyendo facturas",
        error: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, message: "Body inválido" },
        { status: 400 }
      );
    }

    const rawInvoice = isObject(body.invoice) ? body.invoice : {};

    // Resolviendo voucherUrl y asignándolo
    const voucherUrl = firstNonEmptyString(
      rawInvoice.voucherUrl,
      rawInvoice.effectiveVoucherUrl,
      rawInvoice.voucherAddress,
      rawInvoice.voucherURL,
      rawInvoice.effectiveVoucherURL,
      rawInvoice.voucherDireccion,
      rawInvoice.comprobanteUrl,
      rawInvoice.comprobanteURL,
      body.voucherUrl,
      body.effectiveVoucherUrl,
      body.voucherAddress,
      body.voucherURL,
      body.effectiveVoucherURL,
      body.voucherDireccion,
      body.comprobanteUrl,
      body.comprobanteURL,
      isObject(body.storage) ? body.storage.fileUrl : "",
      isObject(body.storage) ? body.storage.publicUrl : "",
      isObject(body.storage) ? body.storage.url : "",
      isObject(body.storage) ? body.storage.effectiveVoucherUrl : "",
      isObject(body.storage) ? body.storage.effectiveVoucherURL : "",
      isObject(rawInvoice.storage) ? rawInvoice.storage.fileUrl : "",
      isObject(rawInvoice.storage) ? rawInvoice.storage.publicUrl : "",
      isObject(rawInvoice.storage) ? rawInvoice.storage.url : "",
      isObject(rawInvoice.storage) ? rawInvoice.storage.effectiveVoucherUrl : "",
      isObject(rawInvoice.storage) ? rawInvoice.storage.effectiveVoucherURL : ""
    );

    const invoiceWithId = {
      ...rawInvoice,
      id: rawInvoice.id || randomUUID(),
      voucherUrl, // Asignando correctamente voucherUrl aquí
      voucherAddress: voucherUrl,
    };

    const payload: AnyObj = {
      ...body,
      voucherUrl,
      voucherAddress: voucherUrl,
      invoice: invoiceWithId,
    };

    const result = await saveInvoiceRecord(payload, undefined, undefined);

    return NextResponse.json(
      {
        ok: true,
        data: result.record,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/invoices:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo crear la factura",
        error: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}