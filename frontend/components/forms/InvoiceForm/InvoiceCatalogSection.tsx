import React from "react";
import CatalogEditor from "./CatalogEditor";
import ProductsSection from "./ProductsSection";
import PropertyRow from "./PropertyRow";
import AnnexesRow, { DocItem as AnnexDocItem } from "./AnnexesRow";
import { EMPTY_ANNEX_LIST } from "./invoiceHelpers";
import { matchById } from "./invoiceHelpers";

type Props = {
  catalogEnabled: boolean;
  currentTx: "venta" | "compra" | undefined;
  isSale: boolean;
  isPurchase: boolean;
  partyKey: string;
  partyHasOwnerOrContractor: boolean;

  productOptions: any[];
  serviceOptions: any[];
  propertyOptions: any[];

  selectedCatalogProductId: string;
  setSelectedCatalogProductId: (v: string) => void;

  selectedCatalogServiceId: string;
  setSelectedCatalogServiceId: (v: string) => void;

  selectedCatalogPropertyId: string;
  setSelectedCatalogPropertyId: (v: string) => void;

  showNewPropertyForm: boolean;
  setShowNewPropertyForm: (v: boolean) => void;

  activePropertyId: string;
  setActivePropertyId: (v: string) => void;

  catalogEditor: any;
  setCatalogEditor: (v: any) => void;

  productsCatalog: any[];
  servicesCatalog: any[];
  propertiesCatalog: any[];

  addProductFromCatalog: (catalogId: string) => Promise<any>;
  addServiceFromCatalog: (catalogId: string) => Promise<any>;
  addProductFromCatalogAndMaybeActivate: (catalogId: string) => Promise<void>;

  removeCatalogProduct: (catalogId: string) => Promise<any>;
  removeCatalogService: (catalogId: string) => Promise<any>;
  removeCatalogProperty: (catalogId: string) => Promise<any>;

  onSaveCatalogRecord: (params: {
    kind: "product" | "service";
    mode: "create" | "edit";
    rec: any;
  }) => Promise<void> | void;

  onSaveProperty: (prop: any) => Promise<void>;

  propertyAnnexes: Record<string, AnnexDocItem[]>;
  setPropertyAnnexes: React.Dispatch<
    React.SetStateAction<Record<string, AnnexDocItem[]>>
  >;

  annexActiveId: string;
  activeAnnexDocs: AnnexDocItem[];
  onAnnexesChangeForActive: (docs: AnnexDocItem[]) => void;

  addAttachmentFromCatalogStable: (anexoId: string) => Promise<any>;
  removeCatalogAttachmentStable: (anexoId: string) => Promise<any>;
};

export default function InvoiceCatalogSection({
  catalogEnabled,
  currentTx,
  isSale,
  isPurchase,
  partyKey,
  partyHasOwnerOrContractor,
  productOptions,
  serviceOptions,
  propertyOptions,
  selectedCatalogProductId,
  setSelectedCatalogProductId,
  selectedCatalogServiceId,
  setSelectedCatalogServiceId,
  selectedCatalogPropertyId,
  setSelectedCatalogPropertyId,
  showNewPropertyForm,
  setShowNewPropertyForm,
  activePropertyId,
  setActivePropertyId,
  catalogEditor,
  setCatalogEditor,
  productsCatalog,
  servicesCatalog,
  propertiesCatalog,
  addProductFromCatalog,
  addServiceFromCatalog,
  addProductFromCatalogAndMaybeActivate,
  removeCatalogProduct,
  removeCatalogService,
  removeCatalogProperty,
  onSaveCatalogRecord,
  onSaveProperty,
  annexActiveId,
  activeAnnexDocs,
  onAnnexesChangeForActive,
  addAttachmentFromCatalogStable,
  removeCatalogAttachmentStable,
}: Props) {
  const createServiceSeed = React.useCallback(() => {
    return {
      companyId: partyKey,
      domain: partyHasOwnerOrContractor ? "condo" : "general",
      isPropietario: partyHasOwnerOrContractor,
      isProveedorContratista: partyHasOwnerOrContractor,
      propietario: partyHasOwnerOrContractor,
      contratista: partyHasOwnerOrContractor,
      meta: {
        transactionType: currentTx,
        companyId: partyKey,
        domain: partyHasOwnerOrContractor ? "condo" : "general",
        isPropietario: partyHasOwnerOrContractor,
        isProveedorContratista: partyHasOwnerOrContractor,
        propietario: partyHasOwnerOrContractor,
        contratista: partyHasOwnerOrContractor,
      },
    };
  }, [currentTx, partyHasOwnerOrContractor, partyKey]);

  return (
    <>
      <div className="border rounded p-3 mb-3">
        <ProductsSection
          catalogEnabled={catalogEnabled}
          partyKey={partyKey}
          currentTx={currentTx}
          productOptions={productOptions}
          selectedCatalogProductId={selectedCatalogProductId}
          setSelectedCatalogProductId={setSelectedCatalogProductId}
          productsCatalog={productsCatalog}
          addProductFromCatalog={addProductFromCatalog}
          removeCatalogProduct={removeCatalogProduct}
          setCatalogEditor={setCatalogEditor}
        />

        <div className="mb-3 mt-3 grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">
              Servicios (Catálogo)
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded px-2 py-1"
                value={selectedCatalogServiceId}
                onChange={(e) => {
                  if (!catalogEnabled)
                    return alert(
                      "Selecciona primero un cliente/proveedor (con companyId) para usar el catálogo."
                    );
                  const v = e.target.value;
                  if (v === "__create__") {
                    setCatalogEditor({
                      kind: "service",
                      mode: "create",
                      rec: createServiceSeed(),
                    });
                    setSelectedCatalogServiceId("");
                    return;
                  }
                  setSelectedCatalogServiceId(v);
                }}
                disabled={!catalogEnabled}
              >
                <option value="">-- Seleccionar servicio --</option>
                <option value="__create__">-- Crear nuevo servicio --</option>

                {serviceOptions.map((p: any) => {
                  const label = `${p.name}${
                    p.rate ?? p.tarifa
                      ? ` • ${Number(p.rate ?? p.tarifa).toFixed(2)}`
                      : ""
                  }`;
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
                  if (!catalogEnabled)
                    return alert(
                      "Selecciona primero un cliente/proveedor (con companyId) para agregar servicios."
                    );
                  if (!selectedCatalogServiceId) {
                    setCatalogEditor({
                      kind: "service",
                      mode: "create",
                      rec: createServiceSeed(),
                    });
                    return;
                  }
                  if (
                    !serviceOptions.some((p: any) =>
                      matchById(p, selectedCatalogServiceId)
                    )
                  ) {
                    return alert(
                      "El servicio seleccionado no pertenece a la empresa asociada al cliente/proveedor actual."
                    );
                  }
                  addServiceFromCatalog(selectedCatalogServiceId);
                  setSelectedCatalogServiceId("");
                }}
                className="px-3 py-1 bg-gray-200 rounded"
                disabled={!catalogEnabled}
              >
                Agregar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!catalogEnabled)
                    return alert(
                      "Selecciona primero un cliente/proveedor (con companyId) para eliminar servicios."
                    );
                  if (!selectedCatalogServiceId)
                    return alert("Selecciona un servicio para eliminar.");
                  const serv = servicesCatalog.find(
                    (x: any) => String(x.id) === String(selectedCatalogServiceId)
                  );
                  if (!serv || String(serv.companyId ?? "") !== String(partyKey))
                    return alert(
                      "Solo se pueden eliminar servicios del catálogo vinculados a la empresa del cliente/proveedor actual."
                    );
                  removeCatalogService(selectedCatalogServiceId);
                  setSelectedCatalogServiceId("");
                }}
                className="px-3 py-1 bg-red-100 text-red-600 rounded"
                disabled={!catalogEnabled}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>

        {catalogEditor && (
          <CatalogEditor
            editor={catalogEditor}
            onCancel={() => setCatalogEditor(null)}
            onSave={async (rec) => {
              await onSaveCatalogRecord({
                kind: catalogEditor.kind,
                mode: catalogEditor.mode,
                rec,
              });
              setCatalogEditor(null);
            }}
          />
        )}

        {isSale && (
          <div className="mb-4 mt-3 border rounded p-3">
            <div className="text-sm font-medium mb-2">Inmuebles</div>
            <div className="text-sm text-gray-600 mb-2">
              Agregar inmuebles vinculados a esta transacción (solo disponible
              para <strong>venta</strong>).
            </div>

            <div className="flex gap-2 items-center mb-2">
              <select
                className="flex-1 border rounded px-2 py-1"
                value={selectedCatalogPropertyId}
                onChange={(e) => {
                  if (!catalogEnabled)
                    return alert(
                      "Selecciona primero un cliente/proveedor (con companyId) para usar el catálogo."
                    );
                  const v = e.target.value;
                  if (v === "__create__") {
                    setShowNewPropertyForm(true);
                    setSelectedCatalogPropertyId("");
                    setActivePropertyId("");
                    return;
                  }
                  setSelectedCatalogPropertyId(v);
                }}
                disabled={!catalogEnabled}
              >
                <option value="">-- Seleccionar inmueble --</option>
                <option value="__create__">-- Crear nuevo inmueble --</option>

                {propertyOptions.map((p: any) => {
                  const label = `${p.name || p.title || "Inmueble"}${
                    p.sku ? ` • ${p.sku}` : ""
                  }${p.price ? ` • ${Number(p.price).toFixed(2)}` : ""}`;
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
                onClick={async () => {
                  if (!catalogEnabled)
                    return alert(
                      "Selecciona primero un cliente/proveedor (con companyId) para agregar inmuebles."
                    );
                  if (selectedCatalogPropertyId) {
                    if (
                      !propertyOptions.some((p: any) =>
                        matchById(p, selectedCatalogPropertyId)
                      )
                    ) {
                      return alert(
                        "El inmueble seleccionado no pertenece a la empresa asociada al cliente/proveedor actual."
                      );
                    }
                    await addProductFromCatalogAndMaybeActivate(
                      selectedCatalogPropertyId
                    );
                    setSelectedCatalogPropertyId("");
                    return;
                  }
                  setShowNewPropertyForm(true);
                }}
                className="px-3 py-1 bg-gray-200 rounded"
                disabled={!catalogEnabled}
              >
                Agregar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!catalogEnabled)
                    return alert(
                      "Selecciona primero un cliente/proveedor (con companyId) para eliminar inmuebles."
                    );
                  if (!selectedCatalogPropertyId)
                    return alert("Selecciona un inmueble para eliminar.");
                  const prop = propertiesCatalog.find(
                    (x: any) => String(x.id) === String(selectedCatalogPropertyId)
                  );
                  if (!prop || String(prop.companyId ?? "") !== String(partyKey))
                    return alert(
                      "Solo se pueden eliminar inmuebles del catálogo vinculados a la empresa del cliente/proveedor actual."
                    );
                  removeCatalogProperty(selectedCatalogPropertyId);
                  setSelectedCatalogPropertyId("");
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
                inmuebles, productos y servicios.
              </div>
            )}

            {showNewPropertyForm && (
              <div className="mt-3">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPropertyForm(false);
                      setSelectedCatalogPropertyId("");
                    }}
                    className="text-sm text-gray-600"
                  >
                    Cancelar
                  </button>
                </div>

                <PropertyRow
                  initial={
                    {
                      kind: "PROPERTY",
                      domain: "condo",
                      isPropietario: true,
                      propietario: true,
                      meta: {
                        transactionType: currentTx,
                        companyId: partyKey,
                        domain: "condo",
                        isPropietario: true,
                        propietario: true,
                      },
                    } as any
                  }
                  onSaved={async (prop: any) => {
                    await onSaveProperty(prop);
                    setShowNewPropertyForm(false);
                    setSelectedCatalogPropertyId("");
                  }}
                />
              </div>
            )}

            {annexActiveId ? (
              <div className="mt-4 border rounded p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">
                    Anexos para el inmueble
                  </div>
                  <div className="text-xs text-gray-500">
                    Inmueble activo: <code>{annexActiveId}</code>
                  </div>
                </div>

                <AnnexesRow
                  key={annexActiveId}
                  documents={activeAnnexDocs}
                  onChange={onAnnexesChangeForActive}
                  catalogEnabled={true}
                  partyKey={partyKey}
                  availableAnexos={EMPTY_ANNEX_LIST}
                  addAttachmentFromCatalog={addAttachmentFromCatalogStable}
                  removeCatalogAttachment={removeCatalogAttachmentStable}
                />
              </div>
            ) : (
              <div className="mt-4 text-xs text-gray-500 italic">
                Los anexos se activan cuando seleccionas un inmueble.
              </div>
            )}
          </div>
        )}

        {isPurchase && (
          <div className="mb-4 mt-3 text-sm text-gray-500 italic">
            Transacción de tipo <strong>compra</strong>: no está permitido
            agregar inmuebles en este formulario.
          </div>
        )}
      </div>
    </>
  );
}