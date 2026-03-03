// app/finance/cash-flow-analytics/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Invoice = {
  id: string;
  invoiceName?: string;
  type?: string;
  bank?: string | null;
  date?: string | number | null; // puede venir como ISO, timestamp, etc.
  amount?: number | string;
  iva?: number | string;
  total?: number | string;
  description?: string | null;
};

const STORAGE_KEY = "invoices";

type Interval = "minute" | "day" | "month" | "quarter" | "year";

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [interval, setInterval] = useState<Interval>("month");
  const [fromIso, setFromIso] = useState<string>("");
  const [toIso, setToIso] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Invoice[] = JSON.parse(raw);
        setInvoices(Array.isArray(parsed) ? parsed : []);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error("Error reading invoices from localStorage:", err);
      setInvoices([]);
    }
  }, []);

  // Convertir seguro a número
  const toNumber = (v: any) => {
    if (v === undefined || v === null || v === "") return 0;
    if (typeof v === "number") return v;
    const s = String(v).replace(/\s+/g, "").replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  // Parsear fecha robusta desde invoice
  const parseInvoiceDate = (inv: Invoice): Date | null => {
    const d = inv.date ?? (inv as any).createdAt ?? (inv as any).dateIso;
    if (d === undefined || d === null || d === "") return null;
    if (typeof d === "number") {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    if (typeof d === "string") {
      // Si viene como "/Date(123456789)/" o similar, intentar extraer número
      const ticks = d.match(/-?\d+/);
      if (ticks && /^\d+$/.test(d)) {
        // pure numeric string
        const dtN = new Date(Number(d));
        if (!isNaN(dtN.getTime())) return dtN;
      }
      // fallback a Date.parse
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    return null;
  };

  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Generar clave de agrupación
  const groupKey = (date: Date, intv: Interval) => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1; // 1-12
    const d = date.getDate();
    const hh = date.getHours();
    const mm = date.getMinutes();

    switch (intv) {
      case "minute":
        // YYYY-MM-DDTHH:MM
        return `${y}-${pad2(m)}-${pad2(d)}T${pad2(hh)}:${pad2(mm)}`;
      case "day":
        return `${y}-${pad2(m)}-${pad2(d)}`;
      case "month":
        return `${y}-${pad2(m)}`;
      case "quarter": {
        const q = Math.floor((m - 1) / 3) + 1;
        return `${y}-Q${q}`;
      }
      case "year":
        return `${y}`;
      default:
        return `${y}-${pad2(m)}-${pad2(d)}`;
    }
  };

  // Etiqueta legible desde la clave
  const labelFromKey = (key: string, intv: Interval) => {
    if (intv === "minute") {
      // key like 2025-01-09T07:05
      const d = new Date(key + ":00"); // add seconds
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (intv === "day") {
      const parts = key.split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString();
    }
    if (intv === "month") {
      const [y, m] = key.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleString(undefined, { year: "numeric", month: "long" });
    }
    if (intv === "quarter") {
      return key; // e.g. 2025-Q1
    }
    return key; // year
  };

  // Filtrar por rango si se especifica
  const filteredInvoices = useMemo(() => {
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    if (fromIso) {
      const d = new Date(fromIso);
      if (!isNaN(d.getTime())) fromDate = d;
    }
    if (toIso) {
      const d = new Date(toIso);
      if (!isNaN(d.getTime())) {
        // incluir todo el día hasta 23:59:59 si solo fecha fue seleccionada
        toDate = d;
      }
    }
    return invoices.filter((inv) => {
      const dt = parseInvoiceDate(inv);
      if (!dt) return false;
      if (fromDate && dt < fromDate) return false;
      if (toDate && dt > toDate) return false;
      return true;
    });
  }, [invoices, fromIso, toIso]);

  // Agrupar y calcular
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; count: number; sumAmount: number; sumIva: number; sumTotal: number; exampleDate: Date }
    >();

    for (const inv of filteredInvoices) {
      const dt = parseInvoiceDate(inv);
      if (!dt) continue;
      const key = groupKey(dt, interval);
      const existing = map.get(key);
      const amt = toNumber(inv.amount);
      const iva = toNumber(inv.iva);
      const tot = toNumber(inv.total) || amt + iva;

      if (existing) {
        existing.count += 1;
        existing.sumAmount += amt;
        existing.sumIva += iva;
        existing.sumTotal += tot;
      } else {
        map.set(key, {
          key,
          label: labelFromKey(key, interval),
          count: 1,
          sumAmount: amt,
          sumIva: iva,
          sumTotal: tot,
          exampleDate: dt,
        });
      }
    }

    // Ordenar las entradas cronológicamente por exampleDate
    const arr = Array.from(map.values()).sort((a, b) => a.exampleDate.getTime() - b.exampleDate.getTime());
    return arr;
  }, [filteredInvoices, interval]);

  const aggregateTotals = useMemo(() => {
    const totals = {
      invoices: filteredInvoices.length,
      amount: filteredInvoices.reduce((s, inv) => s + toNumber(inv.amount), 0),
      iva: filteredInvoices.reduce((s, inv) => s + toNumber(inv.iva), 0),
      total: filteredInvoices.reduce((s, inv) => s + (toNumber(inv.total) || toNumber(inv.amount) + toNumber(inv.iva)), 0),
    };
    return totals;
  }, [filteredInvoices]);

  // CSV export
  const exportCsv = () => {
    const headers = ["grupo", "label", "count", "sumAmount", "sumIva", "sumTotal"];
    const rows = groups.map((g) => [g.key, `"${g.label}"`, String(g.count), g.sumAmount.toFixed(2), g.sumIva.toFixed(2), g.sumTotal.toFixed(2)]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashflow_${interval}_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple SVG bar chart data
  const maxSum = groups.reduce((m, g) => Math.max(m, g.sumTotal), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Cash Flow Analytics</h1>
        <p className="text-gray-600">Agrupado por: minuto, día, mes, trimestre o año.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Facturas (filtradas)</div>
          <div className="text-xl font-semibold">{aggregateTotals.invoices}</div>
        </div>

        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Total Monto</div>
          <div className="text-xl font-semibold">{aggregateTotals.amount.toFixed(2)}</div>
        </div>

        <div className="p-4 border rounded">
          <div className="text-sm text-gray-500">Total IVA</div>
          <div className="text-xl font-semibold">{aggregateTotals.iva.toFixed(2)}</div>
        </div>
      </section>

      <section className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm">Intervalo:</label>
          <select value={interval} onChange={(e) => setInterval(e.target.value as Interval)} className="border p-2 rounded">
            <option value="minute">Minuto</option>
            <option value="day">Día</option>
            <option value="month">Mes</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Año</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Desde:</label>
          <input type="datetime-local" value={fromIso} onChange={(e) => setFromIso(e.target.value)} className="border p-2 rounded" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Hasta:</label>
          <input type="datetime-local" value={toIso} onChange={(e) => setToIso(e.target.value)} className="border p-2 rounded" />
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={exportCsv} className="bg-blue-600 text-white px-3 py-2 rounded">Exportar CSV</button>
          <button
            onClick={() => {
              setFromIso("");
              setToIso("");
            }}
            className="border px-3 py-2 rounded"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 text-sm text-gray-600">Gráfico resumen (sumTotal por grupo)</div>
        <div className="overflow-x-auto border rounded p-3">
          {groups.length === 0 ? (
            <div className="text-sm text-gray-500">No hay datos para mostrar en este intervalo.</div>
          ) : (
            <>
              {/* SVG horizontal bars */}
              <div className="space-y-2">
                {groups.map((g, idx) => {
                  const widthPerc = maxSum > 0 ? Math.round((g.sumTotal / maxSum) * 100) : 0;
                  return (
                    <div key={g.key} className="flex items-center gap-3">
                      <div className="w-48 text-sm">{g.label}</div>
                      <div className="flex-1 bg-gray-100 rounded overflow-hidden h-8">
                        <div
                          style={{ width: `${widthPerc}%` }}
                          className="h-8 flex items-center px-2 text-sm font-medium"
                          title={`${g.sumTotal.toFixed(2)} (${g.count} facturas)`}
                        >
                          {g.sumTotal.toFixed(2)}
                        </div>
                      </div>
                      <div className="w-24 text-right text-sm">{g.count} ✦</div>
                    </div>
                  );
                })}
              </div>

              {/* Tabla detallada */}
              <div className="mt-6 overflow-auto border rounded p-2">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left font-medium">
                      <th className="p-2 border">Grupo</th>
                      <th className="p-2 border">Label</th>
                      <th className="p-2 border">Count</th>
                      <th className="p-2 border">Sum Amount</th>
                      <th className="p-2 border">Sum IVA</th>
                      <th className="p-2 border">Sum Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.key} className="hover:bg-gray-50">
                        <td className="p-2 border">{g.key}</td>
                        <td className="p-2 border">{g.label}</td>
                        <td className="p-2 border">{g.count}</td>
                        <td className="p-2 border">{g.sumAmount.toFixed(2)}</td>
                        <td className="p-2 border">{g.sumIva.toFixed(2)}</td>
                        <td className="p-2 border font-semibold">{g.sumTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="p-2 border" colSpan={3}>
                        Totales
                      </td>
                      <td className="p-2 border">{aggregateTotals.amount.toFixed(2)}</td>
                      <td className="p-2 border">{aggregateTotals.iva.toFixed(2)}</td>
                      <td className="p-2 border">{aggregateTotals.total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
