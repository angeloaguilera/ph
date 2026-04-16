"use client";

import React, { useEffect } from "react";

type Props = {
  catalogEnabled: boolean;
  partyKey: string;
  currentTx?: "venta" | "compra";
  productOptions: any[];
  selectedCatalogProductId: string;
  setSelectedCatalogProductId: (value: string) => void;
  productsCatalog: any[];
  addProductFromCatalog: (catalogId: string) => Promise<any> | any;
  removeCatalogProduct: (catalogId: string) => Promise<any> | any;
  setCatalogEditor: (editor: any) => void;
};

export default function ProductsSection({
  catalogEnabled,
  partyKey,
  currentTx,
  productOptions,
  selectedCatalogProductId,
  setSelectedCatalogProductId,
  productsCatalog,
  addProductFromCatalog,
  removeCatalogProduct,
  setCatalogEditor,
}: Props) {
  const getContableCategory = () =>
    currentTx === "venta" ? "ingresos" : "gasto";

  const openCreateProduct = () => {
    if (!partyKey) {
      alert(
        "Seleccione primero un cliente/proveedor para asignar la empresa al producto."
      );
      return;
    }

    const categoriaContable = getContableCategory();

    setCatalogEditor({
      kind: "product",
      mode: "create",
      rec: {
        companyId: partyKey,
        kind: "PRODUCT",
        checklist: [],
        isPropietario: false,
        isProveedorContratista: false,
        propietario: false,
        contratista: false,

        categoriaContable,
        categoria_contable: categoriaContable,
        accountCategory: categoriaContable,
        contableCategory: categoriaContable,

        meta: {
          transactionType: currentTx,
          companyId: partyKey,
          categoriaContable,
          categoria_contable: categoriaContable,
          accountCategory: categoriaContable,
          contableCategory: categoriaContable,
        },
      },
    });
  };

  useEffect(() => {
    const cur = selectedCatalogProductId;
    if (!cur) return;

    const valid = (productOptions || []).some(
      (p: any) =>
        String(p.id) === String(cur) ||
        String(p.masterId ?? p.id) === String(cur)
    );

    if (!valid) setSelectedCatalogProductId("");
  }, [selectedCatalogProductId, productOptions, setSelectedCatalogProductId]);

  return (
    <div className="mb-3 mt-3">
      <div className="mb-3 grid grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">
            Productos (Catálogo)
          </label>

          <div className="flex gap-2">
            <select
              className="flex-1 border rounded px-2 py-1"
              value={selectedCatalogProductId}
              onChange={(e) => {
                if (!catalogEnabled) {
                  alert(
                    "Selecciona primero un cliente/proveedor (con companyId) para usar el catálogo."
                  );
                  return;
                }

                const v = e.target.value;

                if (v === "__create__") {
                  openCreateProduct();
                  setSelectedCatalogProductId("");
                  return;
                }

                setSelectedCatalogProductId(v);
              }}
              disabled={!catalogEnabled}
            >
              <option value="">-- Seleccionar producto --</option>
              <option value="__create__">-- Crear nuevo producto --</option>

              {(productOptions || []).map((p: any) => {
                const label = `${p.name}${p.sku ? ` • ${p.sku}` : ""}`;
                const value = p.id ?? (p.masterId ?? p.id);
                return (
                  <option key={String(value)} value={String(value)}>
                    {label}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={() => {
                if (!catalogEnabled) {
                  alert(
                    "Selecciona primero un cliente/proveedor (con companyId) para agregar productos."
                  );
                  return;
                }

                if (!selectedCatalogProductId) {
                  openCreateProduct();
                  return;
                }

                const valid = (productOptions || []).some(
                  (p: any) =>
                    String(p.id) === String(selectedCatalogProductId) ||
                    String(p.masterId ?? p.id) ===
                      String(selectedCatalogProductId)
                );

                if (!valid) {
                  alert(
                    "El producto seleccionado no pertenece a la empresa asociada al cliente/proveedor actual."
                  );
                  return;
                }

                addProductFromCatalog(selectedCatalogProductId);
                setSelectedCatalogProductId("");
              }}
              className="px-3 py-1 bg-gray-200 rounded"
              disabled={!catalogEnabled}
            >
              Agregar
            </button>

            <button
              type="button"
              onClick={() => {
                if (!catalogEnabled) {
                  alert(
                    "Selecciona primero un cliente/proveedor (con companyId) para eliminar productos."
                  );
                  return;
                }

                if (!selectedCatalogProductId) {
                  alert("Selecciona un producto para eliminar.");
                  return;
                }

                const prod = (productsCatalog || []).find(
                  (x: any) => String(x.id) === String(selectedCatalogProductId)
                );

                if (!prod || String(prod.companyId ?? "") !== String(partyKey)) {
                  alert(
                    "Solo se pueden eliminar productos del catálogo vinculados a la empresa del cliente/proveedor actual."
                  );
                  return;
                }

                removeCatalogProduct(selectedCatalogProductId);
                setSelectedCatalogProductId("");
              }}
              className="px-3 py-1 bg-red-100 text-red-600 rounded"
              disabled={!catalogEnabled}
            >
              Eliminar
            </button>
          </div>

          {!catalogEnabled && (
            <div className="text-xs text-gray-500 mt-1">
              Selecciona un cliente/proveedor con companyId para habilitar
              productos y servicios.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}