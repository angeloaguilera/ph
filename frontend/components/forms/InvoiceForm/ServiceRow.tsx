import React, { useEffect } from "react";
import type { InvoiceItem } from "../../../types/invoice";

type InvoiceType = "VENTA" | "COMPRA" | string | undefined;

function getAccountingCategory(invoiceType?: InvoiceType) {
  const type = String(invoiceType ?? "").toUpperCase().trim();

  if (type === "VENTA") return "INGRESO";
  if (type === "COMPRA") return "GASTO";

  return "";
}

const safeText = (value: any, fallback = "") =>
  value === undefined || value === null ? fallback : String(value);

const safeNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function ServiceRow({
  it,
  index,
  updateItem,
  removeItem,
  onPhotosChange,
  invoiceType,
}: {
  it: InvoiceItem & { __files?: File[]; photos?: any[]; quantity?: number };
  index: number;
  updateItem: (idx: number, patch: Partial<any>) => void;
  removeItem: (idx: number) => void;
  onPhotosChange?: (idx: number, files: FileList | null) => void;
  invoiceType?: InvoiceType;
}) {
  const autoCategory = getAccountingCategory(invoiceType);

  const quantity = safeNumber((it as any).quantity ?? (it as any).cantidad, 1);
  const rate = safeNumber(it.rate, 0);
  const total = quantity * rate;

  useEffect(() => {
    if (autoCategory && String(it.category ?? "").toUpperCase() !== autoCategory) {
      updateItem(index, { category: autoCategory });
    }
  }, [autoCategory, index, it.category, updateItem]);

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b bg-gray-50">
      <div className="col-span-3">
        <label className="block text-xs">Servicio</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={safeText(it.name)}
          onChange={(e) =>
            updateItem(index, {
              name: e.target.value,
              category: autoCategory,
            })
          }
        />
      </div>

      <div className="col-span-3">
        <label className="block text-xs">Descripción</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={safeText(it.serviceDescription)}
          onChange={(e) =>
            updateItem(index, {
              serviceDescription: e.target.value,
              category: autoCategory,
            })
          }
        />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">Cantidad</label>
        <input
          type="number"
          min={0}
          step="1"
          className="w-full border rounded px-2 py-1"
          value={String(quantity)}
          onChange={(e) =>
            updateItem(index, {
              quantity: e.target.value === "" ? 1 : parseFloat(e.target.value),
              cantidad: e.target.value === "" ? 1 : parseFloat(e.target.value),
              total:
                (e.target.value === "" ? 1 : parseFloat(e.target.value)) * rate,
              category: autoCategory,
            })
          }
        />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">Tarifa</label>
        <input
          type="number"
          min={0}
          step="0.01"
          className="w-full border rounded px-2 py-1"
          value={String(rate)}
          onChange={(e) =>
            updateItem(index, {
              rate: e.target.value === "" ? 0 : parseFloat(e.target.value),
              total:
                quantity * (e.target.value === "" ? 0 : parseFloat(e.target.value)),
              category: autoCategory,
            })
          }
        />
      </div>

      <div className="col-span-2">
        <label className="block text-xs">Categoría (contable)</label>
        <input
          className="w-full border rounded px-2 py-1 bg-gray-100"
          value={safeText(autoCategory || it.category)}
          readOnly
        />
      </div>

      <div className="col-span-12 md:col-span-1">
        <label className="block text-xs">Fotos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onPhotosChange && onPhotosChange(index, e.target.files)}
        />
      </div>

      <div className="col-span-12 text-right mt-2">
        <div className="text-xs text-gray-600 inline-block mr-4">
          Total:{" "}
          <span className="font-medium">{total.toFixed(2)}</span>
        </div>
        <button
          type="button"
          onClick={() => removeItem(index)}
          className="text-sm text-red-600"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}