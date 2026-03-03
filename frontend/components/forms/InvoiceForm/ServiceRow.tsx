// components/forms/InvoiceForm/ServiceRow.tsx
import React from "react";
import type { InvoiceItem } from "../../../types/invoice";

export default function ServiceRow({
  it,
  index,
  updateItem,
  removeItem,
  onPhotosChange,
}: {
  it: InvoiceItem & { __files?: File[]; photos?: any[] };
  index: number;
  updateItem: (idx: number, patch: Partial<any>) => void;
  removeItem: (idx: number) => void;
  onPhotosChange?: (idx: number, files: FileList | null) => void;
}) {
  const categoryVal = it.category ?? "";

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b bg-gray-50">
      <div className="col-span-4">
        <label className="block text-xs">Servicio</label>
        <input className="w-full border rounded px-2 py-1" value={it.name} onChange={(e) => updateItem(index, { name: e.target.value })} />
      </div>

      <div className="col-span-4">
        <label className="block text-xs">Descripción</label>
        <input className="w-full border rounded px-2 py-1" value={it.serviceDescription ?? ""} onChange={(e) => updateItem(index, { serviceDescription: e.target.value })} />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">Horas</label>
        <input type="number" min={0} step="0.01" className="w-full border rounded px-2 py-1" value={String(it.hours ?? 0)} onChange={(e) => updateItem(index, { hours: e.target.value === "" ? 0 : parseFloat(e.target.value) })} />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">Tarifa</label>
        <input type="number" min={0} step="0.01" className="w-full border rounded px-2 py-1" value={String(it.rate ?? 0)} onChange={(e) => updateItem(index, { rate: e.target.value === "" ? 0 : parseFloat(e.target.value) })} />
      </div>

      <div className="col-span-4 mt-2">
        <label className="block text-xs">Categoría (contable)</label>
        <select className="w-full border rounded px-2 py-1" value={categoryVal} onChange={(e) => updateItem(index, { category: e.target.value })}>
          <option value="">-- Selecciona --</option>
          <option value="INGRESO">Ingreso</option>
          <option value="GASTO">Gasto</option>
          <option value="COSTO">Costo</option>
        </select>
      </div>

      <div className="col-span-1">
        <label className="block text-xs">Fotos</label>
        <input type="file" accept="image/*" multiple onChange={(e) => onPhotosChange && onPhotosChange(index, e.target.files)} />
      </div>

      <div className="col-span-8 text-right mt-2">
        <div className="text-xs text-gray-600 inline-block mr-4">Total: <span className="font-medium">{(typeof it.total === "number" ? it.total : 0).toFixed(2)}</span></div>
        <button type="button" onClick={() => removeItem(index)} className="text-sm text-red-600">Eliminar</button>
      </div>
    </div>
  );
}
