import { NextResponse } from "next/server";
import {
  deleteInvoiceRecordById,
  readInvoiceRecordById,
  saveInvoiceRecord,
} from "@/lib/server/invoiceStorage";

export const runtime = "nodejs";

type AnyObj = Record<string, any>;
type RouteContext = {
  params: Promise<{ id: string }>;
};

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
  const invoice = isObject(source.invoice) ? source.invoice : undefined;

  return firstNonEmptyString(
    source.voucherUrl,
    source.effectiveVoucherUrl,
    source.voucherAddress,
    source.voucherURL,
    source.effectiveVoucherURL,
    source.voucherDireccion,
    source.comprobanteUrl,
    source.comprobanteURL,

    invoice?.voucherUrl,
    invoice?.effectiveVoucherUrl,
    invoice?.voucherAddress,
    invoice?.voucherURL,
    invoice?.effectiveVoucherURL,
    invoice?.voucherDireccion,
    invoice?.comprobanteUrl,
    invoice?.comprobanteURL,

    storage?.fileUrl,
    storage?.publicUrl,
    storage?.url,
    storage?.effectiveVoucherUrl,
    storage?.effectiveVoucherURL
  );
}

function injectVoucher(record: AnyObj) {
  const voucherUrl = resolveVoucherUrl(record);

  if (!voucherUrl) return record;

  const invoice = isObject(record.invoice) ? record.invoice : {};

  return {
    ...record,
    voucherUrl,
    voucherAddress: voucherUrl,
    invoice: {
      ...invoice,
      voucherUrl,
      voucherAddress: voucherUrl,
    },
  };
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const found = await readInvoiceRecordById(id);

    if (!found) {
      return NextResponse.json(
        { ok: false, message: "Factura no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: injectVoucher(found.data ?? found),
    });
  } catch (error) {
    console.error("[GET /api/invoices/[id]] error:", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo cargar la factura" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const found = await readInvoiceRecordById(id);

    const existing =
      found?.data ?? {
        invoice: { id },
        inventoryResult: { inventory: [], changes: { created: [], updated: [] } },
      };

    const rawInvoice = isObject(body?.invoice) ? body.invoice : {};

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
      body.comprobanteURL
    );

    const payload: AnyObj = {
      ...body,
      voucherUrl,
      voucherAddress: voucherUrl,
      invoice: {
        ...rawInvoice,
        id,
        voucherUrl,
        voucherAddress: voucherUrl,
      },
    };

    const { record } = await saveInvoiceRecord(payload, existing, found?.filePath);

    return NextResponse.json({ ok: true, data: injectVoucher(record) });
  } catch (error) {
    console.error("[PUT /api/invoices/[id]] error:", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo actualizar la factura" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  return PUT(req, ctx);
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteInvoiceRecordById(id);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: "Factura no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    console.error("[DELETE /api/invoices/[id]] error:", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo eliminar la factura" },
      { status: 500 }
    );
  }
}