// app/api/accounting/process-invoice/route.ts
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { Invoice } from "@/types/invoice";

import * as bankReconciliation from "@/lib/accounting/modules/bank-reconciliation-hub";
import * as cashFlowAnalytics from "@/lib/accounting/modules/cash-flow-analytics";
import * as cashManagement from "@/lib/accounting/modules/cash-management-flow";
import * as chartOfAccounts from "@/lib/accounting/modules/chart-of-accounts-core";
import * as financialPosition from "@/lib/accounting/modules/financial-position-dashboard";
import * as profitLoss from "@/lib/accounting/modules/profit-loss-insights";
import * as journalEntries from "@/lib/accounting/modules/smart-journal-entries";
import * as vatControl from "@/lib/accounting/modules/vat-tax-control";

export const runtime = "nodejs";

/**
 * Intento seguro de parseo JSON: primero JSON.parse, si falla intenta extraer
 * el primer {...} o [...] del texto. Lanza en caso de no poder parsear.
 */
function safeParsePossibleJson(text: string): any {
  const trimmed = text?.trim?.();
  if (!trimmed) throw new Error("Empty body");

  try {
    return JSON.parse(trimmed);
  } catch {
    // Extraer primer objeto JSON {...}
    const objMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        // continue
      }
    }
    // Extraer primer array JSON [...]
    const arrMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[0]);
      } catch {
        // continue
      }
    }
    throw new Error("Invalid JSON payload");
  }
}

/**
 * Extrae el objeto Invoice del request. Maneja:
 *  - multipart/form-data con campo "invoice" (string o Blob/File)
 *  - application/json (objeto directo o { invoice: {...} })
 *  - otros content-types (intenta leer texto y extraer JSON)
 */
async function extractInvoiceFromRequest(req: Request): Promise<Invoice | undefined> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  // multipart/form-data
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const invoiceField = form.get("invoice");
      if (!invoiceField) return undefined;

      // si es string
      if (typeof invoiceField === "string") {
        return safeParsePossibleJson(invoiceField) as Invoice;
      }

      // si es Blob / File-like (en Node/Next puede ser Blob)
      if (invoiceField && typeof (invoiceField as any).text === "function") {
        const txt = await (invoiceField as any).text();
        return safeParsePossibleJson(txt) as Invoice;
      }

      // si vino como algún otro tipo, intentar convertir a string
      try {
        const maybe = String(invoiceField);
        return safeParsePossibleJson(maybe) as Invoice;
      } catch {
        return undefined;
      }
    } catch (e: any) {
      throw new Error(`Error parsing multipart/form-data: ${e?.message ?? String(e)}`);
    }
  }

  // application/json
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      if (body == null) throw new Error("Empty JSON body");
      if (body?.invoice) return body.invoice as Invoice;
      return body as Invoice;
    } catch (e) {
      // fallback: leer como texto y hacer parse más tolerante
      const txt = await req.text();
      // log truncado para debugging del servidor
      console.error("process-invoice: req.json() failed; raw text (truncated):", txt.slice(0, 2000));
      const parsed = safeParsePossibleJson(txt);
      if (parsed?.invoice) return parsed.invoice as Invoice;
      return parsed as Invoice;
    }
  }

  // otros content-types: intentar leer texto y buscar JSON
  try {
    const txt = await req.text();
    console.error("process-invoice: non-JSON content-type; raw body (truncated):", txt.slice(0, 2000));
    const parsed = safeParsePossibleJson(txt);
    if (parsed?.invoice) return parsed.invoice as Invoice;
    return parsed as Invoice;
  } catch (e) {
    throw new Error(`Unsupported content type or malformed body: ${(e as any)?.message ?? String(e)}`);
  }
}

/* --- Helpers para escribir en disco --- */
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
async function writeJsonFile(dir: string, filename: string, data: any) {
  await ensureDir(dir);
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

/** Mapeo módulo -> carpeta (en data/accounting/<folder>) */
const MODULE_TO_FOLDER: Record<string, string> = {
  journalEntries: "asientos-contables",
  profitLoss: "estados-de-resultados",
  bankReconciliation: "conciliacion-bancaria",
  cashFlowAnalytics: "flujo-de-efectivo",
  chartOfAccounts: "plan-de-cuentas",
  financialPosition: "balance-general",
  cashManagementFlow: "flujo-de-caja",
  vat: "iva",
};

export async function POST(req: Request) {
  try {
    const invoice = await extractInvoiceFromRequest(req);
    if (!invoice) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing or invalid invoice payload. Envía JSON con { invoice: {...} } o el objeto invoice directamente.",
        },
        { status: 400 }
      );
    }

    if (!invoice.id) {
      return NextResponse.json({ ok: false, error: "Invoice inválido: falta 'id'." }, { status: 400 });
    }

    // Detectar si es RECIBO (docKind puede venir en mayúsculas/minúsculas)
    const rawDocKind = (invoice as any).docKind ?? (invoice as any).docType ?? "";
    const isRecibo = String(rawDocKind).toUpperCase() === "RECIBO";

    // -----------------------------
    //  Registrar cliente/proveedor como cuentas en plan-de-cuentas
    // -----------------------------
    const createdAccounts: Record<string, any> = {};
    try {
      if ((invoice as any).customer) {
        const party = (invoice as any).customer;
        const created = await chartOfAccounts.ensurePartyAccount(
          {
            name: party.name,
            rif: party.rif ?? party.nit ?? null,
            phone: party.phone ?? null,
            email: party.email ?? null,
          },
          "CLIENTE"
        );
        createdAccounts.customerAccount = created;
      }

      if ((invoice as any).supplier) {
        const party = (invoice as any).supplier;
        const created = await chartOfAccounts.ensurePartyAccount(
          {
            name: party.name,
            rif: party.rif ?? party.nit ?? null,
            phone: party.phone ?? null,
            email: party.email ?? null,
          },
          "PROVEEDOR"
        );
        createdAccounts.supplierAccount = created;
      }
    } catch (e) {
      console.error("Error asegurando cuentas de party:", e);
    }

    // -----------------------------
    // Ejecutar módulos en paralelo (omitimos VAT si es recibo)
    // -----------------------------
    const bankRecPromise = bankReconciliation.generateFromInvoice(invoice).catch((err) => ({ error: String(err) }));
    const cashFlowPromise = cashFlowAnalytics.generateFromInvoice(invoice).catch((err) => ({ error: String(err) }));
    const cashMgmtPromise = cashManagement.generateFromInvoice(invoice).catch((err) => ({ error: String(err) }));
    const coaPromise = chartOfAccounts.updateOrGenerateFromInvoice(invoice).catch((err) => ({ error: String(err) }));
    const finPosPromise = financialPosition.generateFromInvoice(invoice).catch((err) => ({ error: String(err) }));
    const profitLossPromise = profitLoss.generateFromInvoice(invoice).catch((err) => ({ error: String(err) }));
    const journalPromise = journalEntries.createJournalEntryFromInvoice(invoice).catch((err) => ({ error: String(err) }));
    const vatPromise =
      !isRecibo ? vatControl.generateVatRecords(invoice).catch((err) => ({ error: String(err) })) : Promise.resolve(null);

    const [
      bankRec,
      cashFlow,
      cashMgmt,
      coa,
      finPos,
      profitLossReport,
      journal,
      vatRecords,
    ] = await Promise.all([
      bankRecPromise,
      cashFlowPromise,
      cashMgmtPromise,
      coaPromise,
      finPosPromise,
      profitLossPromise,
      journalPromise,
      vatPromise,
    ]);

    // Base dir y filename consistentes
    const baseDir = path.join(process.cwd(), "data", "accounting");
    const filename = `invoice-${invoice.id}.json`;
    const generated: Record<string, string | null> = {};

    // Escribir cada módulo (cada uno en su carpeta)
    try {
      const dir = path.join(baseDir, MODULE_TO_FOLDER.bankReconciliation);
      generated.conciliacion = await writeJsonFile(dir, filename, bankRec);
    } catch (e) {
      generated.conciliacion = null;
      console.error("Error writing conciliacion:", e);
    }

    try {
      const dir = path.join(baseDir, MODULE_TO_FOLDER.cashFlowAnalytics);
      generated.flujoEfectivo = await writeJsonFile(dir, filename, cashFlow);
    } catch (e) {
      generated.flujoEfectivo = null;
      console.error("Error writing flujo-de-efectivo:", e);
    }

    try {
      const dir = path.join(baseDir, MODULE_TO_FOLDER.cashManagementFlow);
      generated.flujoCaja = await writeJsonFile(dir, filename, cashMgmt);
    } catch (e) {
      generated.flujoCaja = null;
      console.error("Error writing flujo-de-caja:", e);
    }

    try {
      const dir = path.join(baseDir, MODULE_TO_FOLDER.chartOfAccounts);
      generated.planDeCuentas = await writeJsonFile(dir, filename, coa);
    } catch (e) {
      generated.planDeCuentas = null;
      console.error("Error writing plan-de-cuentas:", e);
    }

    try {
      const dir = path.join(baseDir, MODULE_TO_FOLDER.financialPosition);
      generated.balanceGeneral = await writeJsonFile(dir, filename, finPos);
    } catch (e) {
      generated.balanceGeneral = null;
      console.error("Error writing balance-general:", e);
    }

    try {
      const dir = path.join(baseDir, MODULE_TO_FOLDER.profitLoss);
      generated.estadosResultados = await writeJsonFile(dir, filename, profitLossReport);
    } catch (e) {
      generated.estadosResultados = null;
      console.error("Error writing estados-de-resultados:", e);
    }

    try {
      const dir = path.join(baseDir, MODULE_TO_FOLDER.journalEntries);
      generated.asientosContables = await writeJsonFile(dir, filename, journal);
    } catch (e) {
      generated.asientosContables = null;
      console.error("Error writing asientos-contables:", e);
    }

    if (!isRecibo && vatRecords) {
      try {
        const dir = path.join(baseDir, MODULE_TO_FOLDER.vat);
        generated.iva = await writeJsonFile(dir, filename, vatRecords);
      } catch (e) {
        generated.iva = null;
        console.error("Error writing iva:", e);
      }
    } else {
      generated.iva = null;
    }

    // Guardar original (opcional)
    try {
      const dir = path.join(baseDir, "originals");
      generated.originalInvoice = await writeJsonFile(dir, filename, invoice);
    } catch (e) {
      generated.originalInvoice = null;
      console.error("Error writing original invoice:", e);
    }

    // Respuesta final
    return NextResponse.json(
      {
        ok: true,
        invoiceId: invoice.id,
        isRecibo,
        createdAccounts,
        generatedFiles: generated,
        outputs: {
          bankReconciliation: bankRec,
          cashFlowAnalytics: cashFlow,
          cashManagementFlow: cashMgmt,
          chartOfAccounts: coa,
          financialPosition: finPos,
          profitLossInsights: profitLossReport,
          journalEntries: journal,
          vatRecords: vatRecords ?? null,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("process-invoice error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
