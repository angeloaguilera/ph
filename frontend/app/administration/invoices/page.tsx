// app/administration/invoices/page.tsx
import fs from "fs/promises";
import path from "path";
import React from "react";
import InvoicesList from "@components/administration/InvoicesList";
import InvoiceDetail from "@components/administration/InvoiceDetail";

type SavedFile = {
  fileName: string;
  mtime: string;
  invoice: any;
};

async function readSavedInvoices(): Promise<SavedFile[]> {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const entries = await fs.readdir(dataDir);
    const invoiceFiles = entries.filter((n) => /^invoice-.*\.json$/.test(n));
    const out: SavedFile[] = [];

    for (const fname of invoiceFiles) {
      try {
        const full = path.join(dataDir, fname);
        const txt = await fs.readFile(full, "utf-8");
        const parsed = JSON.parse(txt);
        const invoice = parsed?.invoice ?? parsed;
        const stats = await fs.stat(full);
        out.push({ fileName: fname, mtime: stats.mtime.toISOString(), invoice });
      } catch (err) {
        console.warn("Failed to read invoice file", fname, err);
      }
    }

    out.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
    return out;
  } catch (err) {
    return [];
  }
}

export default async function Page() {
  const saved = await readSavedInvoices();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Facturas guardadas</h1>
        <p className="text-sm text-gray-600 mt-1">
          Lista de facturas procesadas (data/*.json). Haz clic en una factura para verla con las fotos adjuntas.
        </p>
      </header>

      {/* Server -> Client props */}
      <main>
        <div id="invoices-root">
          {/* InvoicesList and InvoiceDetail are client components; pass initialSaved as prop */}
          <InvoicesList initialSaved={saved} />
        </div>
      </main>
    </div>
  );
}
