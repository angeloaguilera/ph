// components/administration/InvoicesList.tsx
"use client";

import React from "react";
import InvoiceDetail from "./InvoiceDetail";

type Invoice = any;
type SavedFile = {
  fileName: string;
  mtime: string;
  invoice: Invoice;
};

type Props = {
  initialSaved: SavedFile[];
};

export default function InvoicesList({ initialSaved }: Props) {
  const [saved, setSaved] = React.useState<SavedFile[]>(initialSaved);
  const [filter, setFilter] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);

  React.useEffect(() => setSaved(initialSaved), [initialSaved]);

  const filtered = React.useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return saved;
    return saved.filter((s) => {
      const inv = s.invoice;
      const name = String(inv?.invoiceName ?? "").toLowerCase();
      const id = String(inv?.id ?? "").toLowerCase();
      const anyItem = Array.isArray(inv?.items) ? inv.items.map((it: any) => String(it?.name ?? "").toLowerCase()).join(" ") : "";
      return name.includes(t) || id.includes(t) || anyItem.includes(t) || s.fileName.toLowerCase().includes(t);
    });
  }, [saved, filter]);

  React.useEffect(() => {
    // ensure selectedIndex is within range after filtering
    if (filtered.length === 0) setSelectedIndex(-1);
    else if (selectedIndex < 0) setSelectedIndex(0);
    else if (selectedIndex >= filtered.length) setSelectedIndex(0);
  }, [filtered, selectedIndex]);

  const downloadInvoice = (index: number) => {
    const payload = filtered[index]?.invoice;
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${payload.id ?? index}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-1 border rounded p-3 max-h-[70vh] overflow-auto">
        <div className="flex items-center gap-2 mb-3">
          <input
            placeholder="Buscar por factura, id o artículo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 border rounded px-2 py-1"
          />
          <button onClick={() => setFilter("")} className="ml-2 px-2 py-1 bg-gray-100 rounded">
            Limpiar
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-gray-500">No se encontraron facturas.</div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((s, i) => (
              <li
                key={s.fileName}
                className={`p-2 rounded cursor-pointer ${i === selectedIndex ? "bg-sky-50 border" : "hover:bg-gray-50"}`}
                onClick={() => setSelectedIndex(i)}
              >
                <div className="text-sm font-medium">{s.invoice?.invoiceName ?? s.fileName}</div>
                <div className="text-xs text-gray-500">ID: {String(s.invoice?.id ?? "-")}</div>
                <div className="text-xs text-gray-400 mt-1">Guardado: {new Date(s.mtime).toLocaleString()}</div>
                <div className="mt-1 text-xs text-gray-600">Items: {(s.invoice?.items ?? []).length}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadInvoice(i);
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 rounded"
                  >
                    Descargar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="col-span-2">
        {selectedIndex >= 0 && filtered[selectedIndex] ? (
          <InvoiceDetail invoice={filtered[selectedIndex].invoice} />
        ) : (
          <div className="border rounded p-4 text-gray-500">Selecciona una factura para ver el detalle.</div>
        )}
      </div>
    </div>
  );
}
