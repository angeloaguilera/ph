// components/forms/InvoiceForm/index.tsx
"use client";
import React, { useEffect } from "react";
import useInvoiceForm from "./hooks/useInvoiceForm";
import ArticleRow from "./ArticleRow";
import ServiceRow from "./ServiceRow";
import CatalogEditor from "./CatalogEditor";
import PartyFormInline from "./PartyFormInline";
import PayrollSection from "./PayrollSection";

// --- CONEXIÓN: importar el hook de catálogo de productos ---
// Ajusta esta ruta según donde tengas el archivo real en tu proyecto.
import useProductsCatalog from "./hooks/useProductsCatalog";

export default function InvoiceForm({ onSave, onGenerateReports, initialValues }: any) {
  const s = useInvoiceForm(initialValues);

  const {
    // UI state
    docKind, setDocKind,
    invoiceType, setInvoiceType,
    destination, setDestination,
    bank, setBank,
    caja, setCaja,
    invoiceName, setInvoiceName,
    ivaPercent, setIvaPercent,
    description, setDescription,
    // catalog editor
    catalogEditor, setCatalogEditor,
    // parties
    partyInfo, setPartyInfo, parties, setParties, selectedPartyId, setSelectedPartyId,
    showNewPartyForm, setShowNewPartyForm, newPartyDraft, setNewPartyDraft,
    partyPhotoPreview, setPartyPhotoPreview, editingPartyId, setEditingPartyId,
    receiptPartyRole, setReceiptPartyRole, partiesForRole,
    // payroll / employees
    employees, setEmployees,
    showNewEmployeeForm, setShowNewEmployeeForm,
    newEmployeeDraft, setNewEmployeeDraft,
    employeePhotoPreview, setEmployeePhotoPreview,
    editingEmployeeId, setEditingEmployeeId,
    receiptEmployeeFormIndex, setReceiptEmployeeFormIndex,
    payrollReceipts, addPayrollReceipt, updatePayrollReceipt, removePayrollReceipt,
    handleRegisterAndUseEmployee, handleUseEmployeeWithoutRegister, handleNewEmployeePhotoChange,
    handleRemoveEmployeeFromTray, handleEditEmployeeFromTray, handleCloneEmployeeFromTray,
    // payment
    paymentType, setPaymentType, referenceNumber, setReferenceNumber,
    // Servicios / catálogo de servicios (los dejamos desde useInvoiceForm)
    servicesCatalog, setServicesCatalog,
    selectedCatalogServiceId, setSelectedCatalogServiceId: setSelectedCatalogServiceIdState,
    // items
    items, setItems, addItem,
    addProductFromCatalog, addServiceFromCatalog, updateItem, removeItem,
    lineTotal, subtotal,
    // photos
    handleItemPhotosChange, removeItemPhoto,
    // catalog CRUD de servicios (se mantienen)
    createCatalogService, updateCatalogService, removeCatalogService, cloneCatalogService,
    // filters & totals (servicesFilteredByParty seguirá viniendo del hook original)
    servicesFilteredByParty,
    editableAmount, setEditableAmount, amountOverride, setAmountOverride,
    ivaAmount, total,
    handleSubmit, resetForm,
    // helpers
    currentRole, partyKeyActive, ensureCatalogsAndReturn, buildPartyRecordFromDraft,
    handleSavePartyDraft, handleCancelPartyForm, handleRemoveParty, handleNewPartyPhotoChange,
    // numero fields
    numeroFactura, setNumeroFactura, numeroControl, setNumeroControl, numeroRecibo, setNumeroRecibo,
    // seleccion de catalog productos desde useInvoiceForm (IDs y setters)
    selectedCatalogProductId, setSelectedCatalogProductId: setSelectedCatalogProductIdState,
  } = s;

  // ----------- AQUI: conectar useProductsCatalog y reemplazar variables de productos ------------
  const {
    productsCatalog,
    setProductsCatalog,
    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    cloneCatalogProduct,
    fetchProducts: fetchProductsCatalog,
  } = useProductsCatalog();
  // -------------------------------------------------------------------------------------------

  // partyKey robusto ya computado por el hook
  const partyKey = partyKeyActive ?? "";

  // derive current transaction type from invoiceType (VENTA | COMPRA)
  const currentTx: "venta" | "compra" | undefined =
    invoiceType === "VENTA" ? "venta" :
    invoiceType === "COMPRA" ? "compra" :
    undefined;

  // --- Nuevo: sincronizar el receiptPartyRole con invoiceType ---
  useEffect(() => {
    if (invoiceType === "VENTA") setReceiptPartyRole("CLIENTE");
    else if (invoiceType === "COMPRA") setReceiptPartyRole("PROVEEDOR");
    // si invoiceType es undefined o algo distinto, no forzamos cambios
  }, [invoiceType, setReceiptPartyRole]);
  // ------------------------------------------------------------

  // computed role que siempre sigue al invoiceType para facturas y recibos
  const computedPartyRole =
    invoiceType === "VENTA" ? "CLIENTE" :
    invoiceType === "COMPRA" ? "PROVEEDOR" :
    receiptPartyRole || currentRole;

  // Options shown: use the filtered lists that the hook already computes
  const productOptions = React.useMemo(() => {
  if (!partyKey) return [];
  // preferir el filtro que ya provea useInvoiceForm
  const fromInvoiceHook = (s.productsFilteredByParty ?? []) as any[];
  if (Array.isArray(fromInvoiceHook) && fromInvoiceHook.length > 0) {
    return fromInvoiceHook;
  }
  // fallback al catálogo global de productsCatalog filtrado por companyId
  const fallback = (productsCatalog || []).filter((p: any) => String(p.companyId ?? "") === String(partyKey));
  console.log("[InvoiceForm] productOptions fallback -> from productsCatalog, count:", fallback.length);
  return fallback;
  }, [s.productsFilteredByParty, partyKey, productsCatalog]);


  const serviceOptions = React.useMemo(() => {
    if (!partyKey) return [];
    const res = servicesFilteredByParty || [];
    console.log("[InvoiceForm] serviceOptions para partyKey:", partyKey, "count:", res.length);
    return res;
  }, [servicesFilteredByParty, partyKey]);

  const catalogEnabled = docKind !== "NOMINA" && Boolean(partyKey);

  // Mantener selección válida: si la selección ya no existe en opciones visibles, limpiarla.
  useEffect(() => {
    const cur = selectedCatalogProductId;
    if (!cur) return;
    const allProductOptions = productOptions;
    const valid = allProductOptions.some((p: any) => String(p.id) === String(cur) || String(p.masterId ?? p.id) === String(cur));
    if (!valid && cur) {
      setSelectedCatalogProductIdState("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCatalogProductId, productsCatalog, partyKey, productOptions]);

  useEffect(() => {
    const cur = selectedCatalogServiceId;
    if (!cur) return;
    const allServiceOptions = serviceOptions;
    const valid = allServiceOptions.some((p: any) => String(p.id) === String(cur) || String(p.masterId ?? p.id) === String(cur));
    if (!valid && cur) {
      setSelectedCatalogServiceIdState("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCatalogServiceId, servicesCatalog, partyKey, serviceOptions]);

  useEffect(() => {
    console.log("[InvoiceForm] partyInfo cambiado:", partyInfo, "selectedPartyId:", selectedPartyId, "partyKey:", partyKey);
  }, [partyInfo, selectedPartyId, partyKey]);

  // --------- CAMBIO PRINCIPAL: eliminar fallback a masters ---------
  const productOptionsFallback = productOptions || [];
  const serviceOptionsFallback = serviceOptions || [];
  // ----------------------------------------------------------------

  // Asegurar que el catálogo local del hook de productos esté sincronizado con el filtro del form.
  useEffect(() => {
    fetchProductsCatalog().catch((e) => {
      console.warn("[InvoiceForm] fetchProductsCatalog fallo", e);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form onSubmit={(e) => handleSubmit(e, onSave)} className="space-y-4 max-w-5xl mx-auto p-4">
      {/* top controls */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Comprobante</label>
          <select value={docKind} onChange={(e) => setDocKind(e.target.value as any)} className="px-3 py-1 border rounded">
            <option value="FACTURA">Factura</option>
            <option value="RECIBO">Recibo</option>
            <option value="NOMINA">Nómina</option>
          </select>
        </div>

        {docKind !== "NOMINA" && (
          <div className="w-1/3">
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={invoiceType}
              onChange={(e) => {
                const newType = e.target.value as any;
                setInvoiceType(newType);
                // sincronizar rol automáticamente (CLIENTE/PROVEEDOR)
                if (newType === "VENTA") setReceiptPartyRole("CLIENTE");
                else if (newType === "COMPRA") setReceiptPartyRole("PROVEEDOR");
                // reset party selection when changing invoice type (venta/compra)
                setSelectedPartyId("");
                setPartyInfo({ partyType: "NATURAL", name: "", phone: "", email: "", address: "", city: "", country: "", rif: "", nit: "", photoDataUrl: undefined });
                setPartyPhotoPreview(undefined);
                setSelectedCatalogProductIdState("");
                setSelectedCatalogServiceIdState("");
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="VENTA">Venta</option>
              <option value="COMPRA">Compra</option>
            </select>
          </div>
        )}
      </div>

      {/* NÓMINA */}
      {docKind === "NOMINA" && (
        <PayrollSection
          payrollReceipts={payrollReceipts}
          addPayrollReceipt={addPayrollReceipt}
          updatePayrollReceipt={updatePayrollReceipt}
          removePayrollReceipt={removePayrollReceipt}
          employees={employees}
          showNewEmployeeForm={showNewEmployeeForm}
          setShowNewEmployeeForm={setShowNewEmployeeForm}
          newEmployeeDraft={newEmployeeDraft}
          setNewEmployeeDraft={setNewEmployeeDraft}
          employeePhotoPreview={employeePhotoPreview}
          setEmployeePhotoPreview={setEmployeePhotoPreview}
          handleNewEmployeePhotoChange={handleNewEmployeePhotoChange}
          handleRegisterAndUseEmployee={handleRegisterAndUseEmployee}
          handleUseEmployeeWithoutRegister={handleUseEmployeeWithoutRegister}
          handleRemoveEmployeeFromTray={handleRemoveEmployeeFromTray}
          handleEditEmployeeFromTray={handleEditEmployeeFromTray}
          handleCloneEmployeeFromTray={handleCloneEmployeeFromTray}
          calculateAgeFromDate={undefined as any}
          editingEmployeeId={editingEmployeeId}
          setEditingEmployeeId={setEditingEmployeeId}
          receiptEmployeeFormIndex={receiptEmployeeFormIndex}
          setReceiptEmployeeFormIndex={setReceiptEmployeeFormIndex}
        />
      )}

      {/* name */}
      <div>
        <label className="block text-sm font-medium mb-1">{docKind === "FACTURA" ? "Nombre de la factura" : docKind === "NOMINA" ? "Nombre del recibo nómina" : "Nombre del recibo"}</label>
        <input className="w-full border rounded px-3 py-2" value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} placeholder={docKind === "FACTURA" ? "Ej. Factura Enero 2026" : "Ej. Recibo Enero 2026"} />
      </div>

      {/* recibo/factura numbers */}
      {docKind === "RECIBO" && (
        <div>
          <label className="block text-sm font-medium mb-1">Número de recibo</label>
          <input className="w-full border rounded px-3 py-2" value={numeroRecibo} onChange={(e) => setNumeroRecibo(e.target.value)} placeholder="Ej. R-00001234" />
        </div>
      )}

      {docKind === "FACTURA" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Número de la factura</label>
            <input className="w-full border rounded px-3 py-2" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="Ej. 0001-00001234" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Número de control</label>
            <input className="w-full border rounded px-3 py-2" value={numeroControl} onChange={(e) => setNumeroControl(e.target.value)} placeholder="Ej. ABCD-1234" />
          </div>
        </div>
      )}

      {/* destino */}
      {docKind !== "NOMINA" && (
        <div>
          <label className="block text-sm font-medium mb-1">Destino</label>
          <select className="w-full border rounded px-3 py-2" value={destination} onChange={(e) => setDestination(e.target.value as any)}>
            <option value="BANCO">Banco</option>
            <option value="CAJA">Caja</option>
          </select>
        </div>
      )}

      {/* banco/caja */}
      {docKind !== "NOMINA" && destination === "BANCO" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Banco</label>
            <input className="w-full border rounded px-3 py-2" value={bank} onChange={(e) => setBank(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de pago</label>
            <select className="w-full border rounded px-3 py-2" value={paymentType} onChange={(e) => setPaymentType(e.target.value as any)}>
              <option value="">-- Selecciona --</option>
              <option value="DEBITO">Débito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CREDITO">Crédito</option>
              <option value="PAGOMOVIL">Pago móvil</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Número de referencia</label>
            <input className="w-full border rounded px-3 py-2" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Ej. 1234567890" />
          </div>
        </>
      )}

      {docKind !== "NOMINA" && destination === "CAJA" && (
        <div>
          <label className="block text-sm font-medium mb-1">Caja</label>
          <input className="w-full border rounded px-3 py-2" value={caja} onChange={(e) => setCaja(e.target.value)} />
        </div>
      )}

      {/* Party / selector */}
      {docKind !== "NOMINA" && (
        <div className="border rounded p-3 mb-3">
          {/* Eliminado: selector "Tipo de comprobante (rol)" en RECIBO.
              Ahora los recibos siguen el invoiceType (VENTA->CLIENTE, COMPRA->PROVEEDOR)
          */}

          <PartyFormInline
            currentRole={computedPartyRole}
            partiesForRole={partiesForRole}
            selectedPartyId={selectedPartyId}
            onSelectParty={(id: string) => {
              setSelectedPartyId(id);
            }}
            onOpenNew={() => {
              setShowNewPartyForm(true);
              setEditingPartyId(undefined);
              setNewPartyDraft({
                partyType: "NATURAL",
                firstName: "",
                lastName: "",
                companyName: "",
                phone: "",
                email: "",
                address: "",
                city: "",
                country: "",
                rif: "",
                nit: "",
                photoDataUrl: undefined,
                companyId: "",
              });
              setPartyPhotoPreview(undefined);
              setSelectedCatalogProductIdState("");
              setSelectedCatalogServiceIdState("");
            }}
            onEditSelected={() => {
              setEditingPartyId(selectedPartyId || undefined);
              const found = parties.find((x) => x.id === selectedPartyId);
              if (found) {
                setNewPartyDraft({ ...found });
                setPartyPhotoPreview(found.photoDataUrl);
                setShowNewPartyForm(true);
              }
            }}
            showNewPartyForm={showNewPartyForm}
            newPartyDraft={newPartyDraft}
            setNewPartyDraft={setNewPartyDraft}
            partyPhotoPreview={partyPhotoPreview}
            onPhotoChange={handleNewPartyPhotoChange}
            onSaveDraft={(selectAfterSave?: boolean) => {
              handleSavePartyDraft(newPartyDraft, computedPartyRole, selectAfterSave, editingPartyId)
                .then((rec: any) => {
                  if (selectAfterSave && rec && rec.id) {
                    setSelectedPartyId(rec.id);
                  }
                })
                .catch((err: any) => {
                  console.error("Error guardando party draft:", err);
                });
            }}
            onCancelForm={handleCancelPartyForm}
            onRemoveParty={(id: string) => {
              if (!id) return;
              const found = parties.find((p) => p.id === id);
              if (!found) return;
              if (!confirm(`¿Eliminar a ${found.name}? Esta acción no se puede deshacer.`)) return;
              handleRemoveParty(id);
            }}
          />
        </div>
      )}

      {/* Catalog selectors and lines */}
      {docKind !== "NOMINA" && (
        <div className="border rounded p-3 mb-3">
          <div className="mb-3 grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Productos (Catálogo)</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 border rounded px-2 py-1"
                  value={selectedCatalogProductId}
                  onChange={(e) => {
                    if (!catalogEnabled) return alert("Selecciona primero un cliente/proveedor (con companyId) para usar el catálogo.");
                    const v = e.target.value;
                    if (v === "__create__") {
                      const cid = partyKey;
                      if (!cid) return alert("Seleccione primero un cliente/proveedor para asignar la empresa al producto.");
                      console.log("[InvoiceForm] abrir CatalogEditor product con companyId:", cid);
                      // abrir editor de forma segura, inyectando transactionType actual
                      setCatalogEditor({ kind: "product", mode: "create", rec: { companyId: cid, meta: { transactionType: currentTx } } });
                      setSelectedCatalogProductIdState("");
                      return;
                    }
                    setSelectedCatalogProductIdState(v);
                  }}
                  disabled={!catalogEnabled}
                >
                  <option value="">-- Seleccionar producto --</option>
                  <option value="__create__">-- Crear nuevo producto --</option>

                  {productOptionsFallback.map((p: any) => {
                    const label = `${p.name}${p.sku ? ` • ${p.sku}` : ""}`;
                    const value = p.id ?? (p.masterId ?? p.id);
                    return <option key={value} value={String(value)}>{label}</option>;
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (!catalogEnabled) return alert("Selecciona primero un cliente/proveedor (con companyId) para agregar productos.");
                    if (!selectedCatalogProductId) return alert("Selecciona un producto para agregar.");
                    if (!productOptions.some((p: any) => String(p.id) === String(selectedCatalogProductId) || String(p.masterId ?? p.id) === String(selectedCatalogProductId))) {
                      return alert("El producto seleccionado no pertenece a la empresa asociada al cliente/proveedor actual.");
                    }
                    addProductFromCatalog(selectedCatalogProductId);
                    setSelectedCatalogProductIdState("");
                  }}
                  className="px-3 py-1 bg-gray-200 rounded"
                  disabled={!catalogEnabled}
                >
                  Agregar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!catalogEnabled) return alert("Selecciona primero un cliente/proveedor (con companyId) para eliminar productos.");
                    if (!selectedCatalogProductId) return alert("Selecciona un producto para eliminar.");
                    const prod = productsCatalog.find((x: any) => String(x.id) === String(selectedCatalogProductId));
                    if (!prod || String(prod.companyId ?? "") !== String(partyKey)) return alert("Solo se pueden eliminar productos del catálogo vinculados a la empresa del cliente/proveedor actual.");
                    removeCatalogProduct(selectedCatalogProductId);
                    setSelectedCatalogProductIdState("");
                  }}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded"
                  disabled={!catalogEnabled}
                >
                  Eliminar
                </button>
              </div>

              {!catalogEnabled && (
                <div className="text-xs text-gray-500 mt-1">Selecciona un cliente/proveedor con companyId para habilitar productos y servicios.</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Servicios (Catálogo)</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 border rounded px-2 py-1"
                  value={selectedCatalogServiceId}
                  onChange={(e) => {
                    if (!catalogEnabled) return alert("Selecciona primero un cliente/proveedor (con companyId) para usar el catálogo.");
                    const v = e.target.value;
                    if (v === "__create__") {
                      const cid = partyKey;
                      if (!cid) return alert("Seleccione primero un cliente/proveedor para asignar la empresa al servicio.");
                      console.log("[InvoiceForm] abrir CatalogEditor service con companyId:", cid);
                      // abrir editor de forma segura, inyectando transactionType actual
                      setCatalogEditor({ kind: "service", mode: "create", rec: { companyId: cid, meta: { transactionType: currentTx } } });
                      setSelectedCatalogServiceIdState("");
                      return;
                    }
                    setSelectedCatalogServiceIdState(v);
                  }}
                  disabled={!catalogEnabled}
                >
                  <option value="">-- Seleccionar servicio --</option>
                  <option value="__create__">-- Crear nuevo servicio --</option>

                  {serviceOptionsFallback.map((p: any) => {
                    const label = `${p.name}${p.rate ? ` • ${Number(p.rate).toFixed(2)}` : ""}`;
                    const value = p.id ?? (p.masterId ?? p.id);
                    return <option key={value} value={String(value)}>{label}</option>;
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (!catalogEnabled) return alert("Selecciona primero un cliente/proveedor (con companyId) para agregar servicios.");
                    if (!selectedCatalogServiceId) return alert("Selecciona un servicio para agregar.");
                    if (!serviceOptions.some((p: any) => String(p.id) === String(selectedCatalogServiceId) || String(p.masterId ?? p.id) === String(selectedCatalogServiceId))) {
                      return alert("El servicio seleccionado no pertenece a la empresa asociada al cliente/proveedor actual.");
                    }
                    addServiceFromCatalog(selectedCatalogServiceId);
                    setSelectedCatalogServiceIdState("");
                  }}
                  className="px-3 py-1 bg-gray-200 rounded"
                  disabled={!catalogEnabled}
                >
                  Agregar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!catalogEnabled) return alert("Selecciona primero un cliente/proveedor (con companyId) para eliminar servicios.");
                    if (!selectedCatalogServiceId) return alert("Selecciona un servicio para eliminar.");
                    const serv = servicesCatalog.find((x: any) => String(x.id) === String(selectedCatalogServiceId));
                    if (!serv || String(serv.companyId ?? "") !== String(partyKey)) return alert("Solo se pueden eliminar servicios del catálogo vinculados a la empresa del cliente/proveedor actual.");
                    removeCatalogService(selectedCatalogServiceId);
                    setSelectedCatalogServiceIdState("");
                  }}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded"
                  disabled={!catalogEnabled}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          {/* CatalogEditor: pasar `editor` en vez de `state` para evitar confusiones */}
          {catalogEditor && (
            <CatalogEditor
              editor={catalogEditor}
              onCancel={() => setCatalogEditor(null)}
              onSave={(rec) => {
                // inyectar el transactionType actual si no viene en rec.meta
                const withTx = {
                  ...rec,
                  meta: { ...(rec.meta || {}), transactionType: (rec.meta && rec.meta.transactionType) ? rec.meta.transactionType : currentTx },
                };

                if (catalogEditor.mode === "edit" && catalogEditor.rec?.id) {
                  if (catalogEditor.kind === "product") updateCatalogProduct(catalogEditor.rec.id, withTx);
                  else updateCatalogService(catalogEditor.rec.id, withTx);
                } else {
                  if (catalogEditor.kind === "product") createCatalogProduct(withTx);
                  else createCatalogService(withTx);
                }
                setCatalogEditor(null);
              }}
            />
          )}

          <div className="mb-3 mt-3">
            <div className="text-sm font-medium">Artículos / Servicios</div>
            <div className="text-xs text-gray-500">Las cuentas contables se asignan automáticamente: clientes (venta) / proveedores (compra).</div>
          </div>

          {items.length === 0 ? (
            <div className="text-sm text-gray-500">No hay líneas. Selecciona productos o servicios del catálogo para agregarlos.</div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it.id ?? `item-${idx}`}>
                  {it.kind === "SERVICIO" ? (
                    <ServiceRow it={it} index={idx} updateItem={updateItem} removeItem={removeItem} onPhotosChange={handleItemPhotosChange} />
                  ) : (
                    <ArticleRow it={it} index={idx} updateItem={updateItem} removeItem={removeItem} onPhotosChange={handleItemPhotosChange} onRemovePhoto={removeItemPhoto} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t pt-3 flex justify-end gap-4">
            <div className="text-right">
              <div className="text-sm">Subtotal (líneas)</div>
              <div className="font-medium">{items.reduce((sumi, it) => sumi + (typeof it.total === "number" ? it.total : 0), 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* IVA / Totales */}
      {docKind === "FACTURA" ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Monto</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" min="0" className="w-full border rounded px-3 py-2" value={String(editableAmount ?? "")} onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseFloat(v); setAmountOverride(true); setEditableAmount(isNaN(n) ? 0 : n); }} />
              <button type="button" className="text-sm text-gray-600" onClick={() => { setEditableAmount(subtotal); setAmountOverride(false); }}>Usar subtotal</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">IVA (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="w-full border rounded px-3 py-2" value={ivaPercent === 0 ? "" : ivaPercent} onChange={(e) => setIvaPercent(e.target.value === "" ? 0 : parseFloat(e.target.value))} />
            <div className="mt-2 text-sm text-gray-600">
              <div>IVA (monto)</div>
              <div className="font-medium">{ivaAmount.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Total</label>
            <input readOnly className="w-full border rounded px-3 py-2 bg-gray-100" value={total.toFixed(2)} />
          </div>
        </div>
      ) : docKind === "RECIBO" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Monto</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" min="0" className="w-full border rounded px-3 py-2" value={String(editableAmount ?? "")} onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseFloat(v); setAmountOverride(true); setEditableAmount(isNaN(n) ? 0 : n); }} />
              <button type="button" className="text-sm text-gray-600" onClick={() => { setEditableAmount(subtotal); setAmountOverride(false); }}>Usar subtotal</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Total</label>
            <input readOnly className="w-full border rounded px-3 py-2 bg-gray-100" value={total.toFixed(2)} />
          </div>
        </div>
      ) : (
        <div className="mt-2 text-right">
          <div className="text-sm">Total</div>
          <div className="font-medium">{total.toFixed(2)}</div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea className="w-full border rounded px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">Guardar cambios</button>
        {onGenerateReports && <button type="button" onClick={onGenerateReports} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Generar informes</button>}
      </div>
    </form>
  );
}
