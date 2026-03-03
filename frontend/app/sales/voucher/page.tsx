// app/sales/voucher/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import InvoiceForm from "@/components/forms/InvoiceForm";
import ServicesList from "@/components/ServicesList";
import type { Invoice } from "@/types/invoice";

const STORAGE_KEY = "invoices";

/** Generador de id único: usa crypto.randomUUID() si está disponible,
 *  sino un fallback con timestamp + aleatorio */
const genId = () =>
  typeof globalThis !== "undefined" && (globalThis as any).crypto && "randomUUID" in (globalThis as any).crypto
    ? (globalThis as any).crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Asegura que una factura tenga id (mutación mínima) */
function ensureInvoiceId(inv: Partial<Invoice>): Invoice {
  if ((inv as Invoice).id) return inv as Invoice;
  return { ...(inv as Invoice), id: genId() } as Invoice;
}

/** Helper de formato */
const formatCurrency = (n?: number | string) => {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type SortKey = "date" | "invoiceName" | "total" | "bank" | "type";

export default function BillingNotesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // companyId para ServicesList (lo leemos de localStorage por defecto)
  const [companyId, setCompanyId] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const withIds = parsed.map((p) => ensureInvoiceId(p));
          const needsPersist = withIds.some((w, i) => !parsed[i].id || parsed[i].id !== w.id);
          setInvoices(withIds);
          if (needsPersist) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(withIds));
            } catch (e) {
              console.error("Error re-guardando invoices con ids:", e);
            }
          }
        } else {
          setInvoices([]);
        }
      }
    } catch (err) {
      console.error("Error reading invoices from storage:", err);
    }

    // Leer companyId de localStorage (si existe)
    try {
      const cid = localStorage.getItem("companyId") ?? "";
      setCompanyId(cid);
    } catch (e) {
      // ignore
    }
  }, []);

  // Guardar facturas en localStorage
  const persist = (next: Invoice[]) => {
    setInvoices(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Error saving invoices to storage:", err);
    }
  };

  // Maneja tanto invoice directo como wrapper { invoice: ... }
  const handleSave = (invoiceOrWrapper: any) => {
    setLoading(true);
    try {
      const invoice = invoiceOrWrapper?.invoice ?? invoiceOrWrapper;
      if (!invoice) throw new Error("Invoice vacío en handleSave");

      const invoiceWithId = ensureInvoiceId(invoice);

      // Prepend para que las más recientes queden arriba
      const next = [invoiceWithId, ...invoices];
      persist(next);
      setTimeout(() => {
        setLoading(false);
        // abrir detalle automáticamente
        setSelected(invoiceWithId);
      }, 200);
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Error al guardar la factura.");
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    const next = invoices.filter((i) => i.id !== id);
    persist(next);
    if (selected?.id === id) setSelected(null);
  };

  const handleClearAll = () => {
    if (!confirm("¿Eliminar todas las notas? Esta acción no se puede deshacer.")) return;
    persist([]);
    setSelected(null);
  };

  const downloadInvoice = (inv: Invoice) => {
    const blob = new Blob([JSON.stringify(inv, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    const blob = new Blob([JSON.stringify(invoices, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-all-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV helpers
  const toCSV = (rows: Invoice[]) => {
    const headers = ["id", "type", "invoiceName", "date", "bank", "amount", "iva", "total", "description"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const vals = [
        `"${String(r.id ?? "")}"`,
        `"${String(r.type ?? "")}"`,
        `"${String(r.invoiceName ?? "")}"`,
        `"${String(r.date ?? "")}"`,
        `"${String(r.bank ?? "")}"`,
        `${Number(r.amount ?? 0).toFixed(2)}`,
        `${Number(r.iva ?? 0).toFixed(2)}`,
        `${Number(r.total ?? 0).toFixed(2)}`,
        `"${String((r.description ?? "").replaceAll('"', '""'))}"`,
      ];
      lines.push(vals.join(","));
    }
    return lines.join("\n");
  };

  const downloadCSV = (rows: Invoice[]) => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCSVToClipboard = async (rows: Invoice[]) => {
    const csv = toCSV(rows);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(csv);
        alert("CSV copiado al portapapeles.");
      } else {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = csv;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("CSV copiado al portapapeles (fallback).");
      }
    } catch (err) {
      console.error("No se pudo copiar CSV:", err);
      alert("No se pudo copiar al portapapeles.");
    }
  };

  // Filtrado
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const res = invoices.filter((inv) => {
      if (!q) return true;
      return (
        (inv.invoiceName ?? "").toLowerCase().includes(q) ||
        ((inv.description ?? "") as string).toLowerCase().includes(q) ||
        (inv.bank ?? "").toLowerCase().includes(q) ||
        (inv.date ?? "").toLowerCase().includes(q) ||
        (inv.type ?? "").toLowerCase().includes(q)
      );
    });

    // ordenar
    const sorted = res.slice().sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "date") {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return (da - db) * dir;
      }
      if (sortBy === "total") {
        return (Number(a.total ?? 0) - Number(b.total ?? 0)) * dir;
      }
      if (sortBy === "invoiceName") {
        return String(a.invoiceName ?? "").localeCompare(String(b.invoiceName ?? "")) * dir;
      }
      if (sortBy === "bank") {
        return String(a.bank ?? "").localeCompare(String(b.bank ?? "")) * dir;
      }
      if (sortBy === "type") {
        return String(a.type ?? "").localeCompare(String(b.type ?? "")) * dir;
      }
      return 0;
    });

    return sorted;
  }, [invoices, filter, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((s) => (s === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const totalSum = useMemo(() => {
    return invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
  }, [invoices]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Voucher — Tabla de Comprobantes</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-white border rounded p-4 shadow-sm">
          <h2 className="font-medium mb-3">Comprobante</h2>
          <InvoiceForm onSave={handleSave} />
          {loading && <div className="text-sm text-gray-500 mt-2">Guardando factura...</div>}
        </div>

        {/* Panel de acciones / búsqueda */}
        <div className="bg-white border rounded p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Comprobantes ({invoices.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(filtered)}
                disabled={invoices.length === 0}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Exportar CSV (filtrados)
              </button>
              <button
                onClick={() => copyCSVToClipboard(filtered)}
                disabled={invoices.length === 0}
                className="px-3 py-1 border rounded text-sm"
              >
                Copiar CSV
              </button>
              <button
                onClick={downloadAll}
                disabled={invoices.length === 0}
                className="px-3 py-1 border rounded text-sm"
              >
                Descargar JSON
              </button>
              <button
                onClick={handleClearAll}
                disabled={invoices.length === 0}
                className="px-3 py-1 border rounded text-sm text-red-600 disabled:opacity-50"
              >
                Borrar todo
              </button>
            </div>
          </div>

          <input
            placeholder="Buscar por nombre, fecha, banco, tipo o descripción..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3"
          />

          {/* Tabla */}
          <div className="overflow-auto border rounded" style={{ maxHeight: 420 }}>
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("type")} className="flex items-center gap-2">
                      Tipo
                      {sortBy === "type" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("invoiceName")} className="flex items-center gap-2">
                      Nombre
                      {sortBy === "invoiceName" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("date" as SortKey)} className="flex items-center gap-2">
                      Fecha
                      {sortBy === "date" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort("bank" as SortKey)} className="flex items-center gap-2">
                      Banco
                      {sortBy === "bank" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button onClick={() => toggleSort("total" as SortKey)} className="flex items-center gap-2 ml-auto">
                      Total
                      {sortBy === "total" && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      No hay notas que coincidan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelected(inv)}
                      title="Click para ver detalle"
                    >
                      <td className="px-3 py-2 align-top">{inv.type ?? "—"}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{inv.invoiceName}</div>
                        {inv.description && <div className="text-xs text-gray-500 line-clamp-2">{inv.description}</div>}
                      </td>
                      <td className="px-3 py-2 align-top">{inv.date ?? "—"}</td>
                      <td className="px-3 py-2 align-top">{inv.bank || "—"}</td>
                      <td className="px-3 py-2 align-top text-right font-mono">{formatCurrency(inv.total)}</td>
                      <td className="px-3 py-2 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadInvoice(inv);
                            }}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            Descargar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(inv.id);
                            }}
                            className="text-xs px-2 py-1 border rounded text-red-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot className="bg-white">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-sm text-gray-600">
                    Total registros: {invoices.length}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{formatCurrency(totalSum)}</td>
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-500">Sugerencia: haz click en una fila para ver el detalle o descargar.</div>
        </div>
      </div>

      {/* Aquí integramos ServicesList para evitar el "duplicado visual" */}
      <div className="bg-white border rounded p-4 shadow-sm">
        <ServicesList companyId={companyId} />
      </div>

      {/* Detalle / Modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded shadow-lg w-full max-w-2xl z-10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {selected.invoiceName} <span className="text-sm text-gray-500">({selected.type})</span>
                </h3>
                <div className="text-sm text-gray-600">{selected.date} • {selected.bank || "—"}</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right font-mono text-lg">{formatCurrency(selected.total)}</div>
                <button
                  onClick={() => {
                    downloadInvoice(selected);
                  }}
                  className="px-3 py-1 border rounded text-sm"
                >
                  Descargar
                </button>
                <button
                  onClick={() => {
                    handleDelete(selected.id);
                  }}
                  className="px-3 py-1 border rounded text-sm text-red-600"
                >
                  Eliminar
                </button>
                <button onClick={() => setSelected(null)} className="px-3 py-1 border rounded text-sm">
                  Cerrar
                </button>
              </div>
            </div>

            <hr className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Monto</div>
                <div className="font-medium">{formatCurrency(selected.amount)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">IVA</div>
                <div className="font-medium">{formatCurrency(selected.iva)}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">Descripción</div>
                <div className="whitespace-pre-wrap text-sm">{selected.description || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
