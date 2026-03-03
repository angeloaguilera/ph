// app/finance/bank-reconciliation-hub/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { Invoice } from "@/types/invoice";

const STORAGE_KEY = "invoices";

export default function BankReconciliationHubPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Cargar facturas de localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setInvoices(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Error reading invoices from storage:", err);
    }
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Bank Reconciliation Hub</h1>
      <p className="text-gray-600 mb-4">
        Aquí se reflejan todas las facturas registradas en el módulo de Billing.
      </p>

      {invoices.length === 0 ? (
        <div className="text-sm text-gray-500">No hay facturas registradas todavía.</div>
      ) : (
        <div className="overflow-auto border rounded p-2">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-sm font-medium">
                <th className="p-2 border">Nombre</th>
                <th className="p-2 border">Tipo</th>
                <th className="p-2 border">Banco</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Monto</th>
                <th className="p-2 border">IVA</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="text-sm hover:bg-gray-50">
                  <td className="p-2 border">{inv.invoiceName}</td>
                  <td className="p-2 border">{inv.type}</td>
                  <td className="p-2 border">{inv.bank || "—"}</td>
                  <td className="p-2 border">{inv.date}</td>
                  <td className="p-2 border">{inv.amount.toFixed(2)}</td>
                  <td className="p-2 border">{inv.iva.toFixed(2)}</td>
                  <td className="p-2 border font-medium">{inv.total.toFixed(2)}</td>
                  <td className="p-2 border">{inv.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
