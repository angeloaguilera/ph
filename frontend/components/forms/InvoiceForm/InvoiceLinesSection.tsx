import React from "react";
import ServiceRow from "./ServiceRow";
import {
  getLineQuantity,
  getLineEditableUnit,
  getLineTotalValue,
  toNumber,
} from "./invoiceHelpers";

type Props = {
  items: any[];
  safeUpdateItem: (index: number, patch: Partial<any>) => Promise<void>;
  safeRemoveItem: (index: number) => Promise<void>;
  safeOnItemPhotosChange: (index: number, files: FileList | null) => Promise<void>;
};

export default function InvoiceLinesSection({
  items,
  safeUpdateItem,
  safeRemoveItem,
  safeOnItemPhotosChange,
}: Props) {
  return (
    <div className="mt-3">
      <div className="mb-3">
        <div className="text-sm font-medium">Artículos / Servicios</div>
        <div className="text-xs text-gray-500">
          Las cuentas contables se asignan automáticamente: clientes (venta) /
          proveedores (compra).
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">
          No hay líneas. Selecciona productos o servicios del catálogo para
          agregarlos.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it: any, idx: number) => {
            const kind = String(it?.kind ?? "").toUpperCase();
            const lineQty = getLineQuantity(it);
            const lineUnit = getLineEditableUnit(it);
            const lineCalcTotal = getLineTotalValue(it);

            return (
              <div key={it.id ?? `item-${idx}`} className="border rounded p-3">
                {kind === "SERVICIO" ? (
                  <ServiceRow
                    it={it}
                    index={idx}
                    updateItem={safeUpdateItem as any}
                    removeItem={safeRemoveItem as any}
                    onPhotosChange={safeOnItemPhotosChange as any}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2">
                      <div className="text-xs uppercase text-gray-500">
                        {kind || "LÍNEA"}
                      </div>
                      <div className="font-medium">
                        {it?.name ?? it?.title ?? `Línea ${idx + 1}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {it?.meta?.propertyId ? (
                          <>
                            Inmueble:{" "}
                            <code>{String(it.meta.propertyId)}</code>
                          </>
                        ) : (
                          <>Tarifa / precio cargado automáticamente</>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border rounded px-3 py-2"
                        value={String(lineQty)}
                        onChange={(e) => {
                          const quantity = toNumber(e.target.value || 1) || 1;
                          const unit = getLineEditableUnit(it);
                          const totalCalc = quantity * unit;
                          safeUpdateItem(idx, {
                            quantity,
                            unitPrice: unit,
                            price: unit,
                            rate: unit,
                            tarifa: unit,
                            total: totalCalc,
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Tarifa / Precio
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border rounded px-3 py-2"
                        value={String(lineUnit)}
                        onChange={(e) => {
                          const unit = toNumber(e.target.value);
                          const quantity = lineQty;
                          const totalCalc = quantity * unit;
                          safeUpdateItem(idx, {
                            quantity,
                            unitPrice: unit,
                            price: unit,
                            rate: unit,
                            tarifa: unit,
                            total: totalCalc,
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Total
                      </label>
                      <input
                        readOnly
                        className="w-full border rounded px-3 py-2 bg-gray-100"
                        value={lineCalcTotal.toFixed(2)}
                      />
                    </div>

                    <div className="flex md:justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => safeRemoveItem(idx)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 border-t pt-3 flex justify-end gap-4">
        <div className="text-right">
          <div className="text-sm">Subtotal (líneas)</div>
          <div className="font-medium">
            {items
              .reduce((sum: number, it: any) => sum + getLineTotalValue(it), 0)
              .toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}