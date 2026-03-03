// components/forms/InvoiceForm/ArticleRow.tsx
import React from "react";
import type { InvoiceItem } from "../../../types/invoice";

export default function ArticleRow({
  it,
  index,
  updateItem,
  removeItem,
  onPhotosChange,
  onRemovePhoto,
}: {
  it: InvoiceItem & { __files?: File[]; photos?: any[] };
  index: number;
  updateItem: (idx: number, patch: Partial<any>) => void;
  removeItem: (idx: number) => void;
  onPhotosChange: (idx: number, files: FileList | null) => void;
  onRemovePhoto: (idx: number, photoId: string) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b">
      <div className="col-span-5">
        <label className="block text-xs">Artículo</label>
        <input className="w-full border rounded px-2 py-1" value={it.name} onChange={(e) => updateItem(index, { name: e.target.value })} />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">SKU</label>
        <input className="w-full border rounded px-2 py-1" value={it.sku ?? ""} onChange={(e) => updateItem(index, { sku: e.target.value })} />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">Cantidad</label>
        <input type="number" min={0} step="1" className="w-full border rounded px-2 py-1" value={String(it.quantity ?? 0)} onChange={(e) => updateItem(index, { quantity: e.target.value === "" ? 0 : parseFloat(e.target.value) })} />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">Precio unit.</label>
        <input type="number" min={0} step="0.01" className="w-full border rounded px-2 py-1" value={String(it.unitPrice ?? 0)} onChange={(e) => updateItem(index, { unitPrice: e.target.value === "" ? 0 : parseFloat(e.target.value) })} />
      </div>

      <div className="col-span-1">
        <label className="block text-xs">Fotos</label>
        <input type="file" accept="image/*" multiple onChange={(e) => onPhotosChange(index, e.target.files)} />
      </div>

      <div className="col-span-12 text-right mt-2">
        <div className="text-xs text-gray-600 inline-block mr-4">Total: <span className="font-medium">{(typeof it.total === "number" ? it.total : 0).toFixed(2)}</span></div>
        <button type="button" onClick={() => removeItem(index)} className="text-sm text-red-600">Eliminar</button>
      </div>
    </div>
  );
}
