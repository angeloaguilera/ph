"use client";

import React from "react";

import useInvoiceFormViewModel from "./useInvoiceFormViewModel";

import PartyFormInline from "./PartyFormInline";
import PayrollSection from "./PayrollSection";
import InvoiceCatalogSection from "./InvoiceCatalogSection";
import InvoiceLinesSection from "./InvoiceLinesSection";
import InvoiceTotalsSection from "./InvoiceTotalsSection";
import InvoiceDocumentHeaderSection from "./InvoiceDocumentHeaderSection";
import InvoiceCurrencySection from "./InvoiceCurrencySection";

export default function InvoiceForm({
  onSave,
  onGenerateReports,
  initialValues,
}: any) {
  const vm = useInvoiceFormViewModel(initialValues);

  const {
    docKind,
    setDocKind,
    invoiceType,
    handleInvoiceTypeChange,
    invoiceName,
    setInvoiceName,
    documentDateTime,
    setDocumentDateTime,
    numeroRecibo,
    setNumeroRecibo,
    numeroFactura,
    setNumeroFactura,
    numeroControl,
    setNumeroControl,
    destination,
    setDestination,
    bank,
    setBank,
    caja,
    setCaja,
    paymentType,
    setPaymentType,
    referenceNumber,
    setReferenceNumber,

    payrollReceipts,
    addPayrollReceipt,
    updatePayrollReceipt,
    removePayrollReceipt,
    employees,
    showNewEmployeeForm,
    setShowNewEmployeeForm,
    newEmployeeDraft,
    setNewEmployeeDraft,
    employeePhotoPreview,
    setEmployeePhotoPreview,
    handleNewEmployeePhotoChange,
    handleRegisterAndUseEmployee,
    handleUseEmployeeWithoutRegister,
    handleRemoveEmployeeFromTray,
    handleEditEmployeeFromTray,
    handleCloneEmployeeFromTray,
    editingEmployeeId,
    setEditingEmployeeId,
    receiptEmployeeFormIndex,
    setReceiptEmployeeFormIndex,

    showNewPartyForm,
    newPartyDraft,
    setNewPartyDraft,
    partyPhotoPreview,
    handleNewPartyPhotoChange,
    selectedPartyId,
    setSelectedPartyId,
    parties,
    partiesForRole,
    computedPartyRole,
    setShowNewPartyForm,
    setEditingPartyId,
    setPartyPhotoPreview,
    setSelectedCatalogProductIdState: setSelectedCatalogProductId,
    setSelectedCatalogServiceIdState: setSelectedCatalogServiceId,
    setSelectedCatalogPropertyId,
    setShowNewPropertyForm,
    setActivePropertyId,
    setPropertyAnnexes: setPropertyAnnexesState,
    handleSavePartyDraft,
    handleCancelPartyForm,
    handleRemoveParty,

    documentCurrency,
    setDocumentCurrency,
    targetCurrency,
    setTargetCurrency,
    conversionEnabled,
    setConversionEnabled,
    useAutoRate,
    setUseAutoRate,
    manualExchangeRate,
    setManualExchangeRate,
    autoExchangeRate,
    autoRateLoading,
    autoRateError,
    lastUpdatedAt,
    conversionInfo,
    baseAmount,
    facturaTotalFinal,

    catalogEnabled,
    currentTx,
    isSale,
    isPurchase,
    partyKeyActive,
    partyHasOwnerOrContractor,
    productOptions,
    serviceOptions,
    propertyOptions,
    selectedCatalogProductId,
    selectedCatalogServiceId,
    selectedCatalogPropertyId,
    showNewPropertyForm,
    activePropertyId,
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
    handleSaveCatalogRecord,
    handleSaveProperty,
    propertyAnnexes,
    annexActiveId,
    activeAnnexDocs,
    onAnnexesChangeForActive,
    addAttachmentFromCatalogStable,
    removeCatalogAttachmentStable,

    items,
    safeUpdateItem,
    safeRemoveItem,
    safeOnItemPhotosChange,
    itemsSubtotal,
    ivaPercent,
    setIvaPercent,
    ivaRetenidoPercent,
    setIvaRetenidoPercent,
    islrPercent,
    setIslrPercent,
    facturaIvaAmount,
    ivaRetenidoAmount,
    islrAmount,
    description,
    setDescription,
    handleSubmit,
  } = vm;

  const consulting = false;

  const handleConsultarParty = async (pagina: string, rif: string) => {
    console.log("[InvoiceForm] onConsultar recibido:", { pagina, rif });
    console.log("[InvoiceForm] draft actual antes de consultar:", newPartyDraft);

    try {
      console.log("[InvoiceForm] consulta simulada / puente activo");
      console.log("[InvoiceForm] página:", pagina);
      console.log("[InvoiceForm] rif:", rif);

      setNewPartyDraft((d: any) => ({
        ...(d ?? {}),
        pagina,
        rif,
        needsManualReview: true,
      }));

      console.log("[InvoiceForm] draft luego del puente de consulta");
    } catch (error) {
      console.error("[InvoiceForm] error en handleConsultarParty:", error);
      throw error;
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(e, onSave);
      }}
      className="mx-auto w-full max-w-5xl space-y-4 overflow-x-hidden p-4"
    >
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <InvoiceDocumentHeaderSection
          docKind={docKind}
          setDocKind={setDocKind}
          invoiceType={invoiceType}
          onInvoiceTypeChange={handleInvoiceTypeChange}
          invoiceName={invoiceName}
          setInvoiceName={setInvoiceName}
          documentDateTime={documentDateTime}
          setDocumentDateTime={setDocumentDateTime}
          numeroRecibo={numeroRecibo}
          setNumeroRecibo={setNumeroRecibo}
          numeroFactura={numeroFactura}
          setNumeroFactura={setNumeroFactura}
          numeroControl={numeroControl}
          setNumeroControl={setNumeroControl}
          destination={destination}
          setDestination={setDestination}
          bank={bank}
          setBank={setBank}
          caja={caja}
          setCaja={setCaja}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          referenceNumber={referenceNumber}
          setReferenceNumber={setReferenceNumber}
        />
      </div>

      {docKind === "NOMINA" && (
        <div className="w-full min-w-0 max-w-full overflow-hidden">
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
        </div>
      )}

      {docKind !== "NOMINA" && (
        <div className="mb-3 w-full min-w-0 max-w-full overflow-hidden rounded border p-3">
          <PartyFormInline
            currentRole={computedPartyRole}
            partiesForRole={partiesForRole}
            selectedPartyId={selectedPartyId}
            onSelectParty={(id: string) => {
              console.log("[InvoiceForm] seleccionar party:", id);
              setSelectedPartyId(id);
              setSelectedCatalogProductId("");
              setSelectedCatalogServiceId("");
              setSelectedCatalogPropertyId("");
              setShowNewPropertyForm(false);
              setActivePropertyId("");
              setPropertyAnnexesState({});
            }}
            onOpenNew={() => {
              console.log("[InvoiceForm] abrir nuevo party");
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
              setSelectedCatalogProductId("");
              setSelectedCatalogServiceId("");
              setSelectedCatalogPropertyId("");
              setShowNewPropertyForm(false);
              setActivePropertyId("");
              setPropertyAnnexesState({});
            }}
            onEditSelected={() => {
              console.log("[InvoiceForm] editar party seleccionado:", selectedPartyId);
              setEditingPartyId(selectedPartyId || undefined);
              const found = parties.find((x: any) => x.id === selectedPartyId);
              if (found) {
                setNewPartyDraft({ ...found });
                setPartyPhotoPreview(found.photoDataUrl);
                setShowNewPartyForm(true);
                console.log("[InvoiceForm] party cargado para edición:", found);
              } else {
                console.warn("[InvoiceForm] no se encontró party para editar");
              }
            }}
            showNewPartyForm={showNewPartyForm}
            newPartyDraft={newPartyDraft}
            setNewPartyDraft={setNewPartyDraft}
            partyPhotoPreview={partyPhotoPreview}
            onPhotoChange={handleNewPartyPhotoChange}
            onSaveDraft={(selectAfterSave?: boolean) => {
              console.log("[InvoiceForm] guardar party draft", {
                selectAfterSave,
                editingPartyId: vm.editingPartyId,
                newPartyDraft,
              });

              handleSavePartyDraft(
                newPartyDraft,
                computedPartyRole,
                selectAfterSave,
                vm.editingPartyId,
              )
                .then((rec: any) => {
                  console.log("[InvoiceForm] party guardado:", rec);
                  if (selectAfterSave && rec && rec.id) {
                    setSelectedPartyId(rec.id);
                  }
                })
                .catch((err: any) => {
                  console.error("Error guardando party draft:", err);
                });
            }}
            onCancelForm={() => {
              console.log("[InvoiceForm] cancelar formulario party");
              handleCancelPartyForm();
            }}
            onRemoveParty={(id: string) => {
              if (!id) return;
              const found = parties.find((p: any) => p.id === id);
              if (!found) return;

              if (!confirm(`¿Eliminar a ${found.name}? Esta acción no se puede deshacer.`)) {
                return;
              }

              console.log("[InvoiceForm] eliminar party:", id);
              handleRemoveParty(id);
            }}
          />
        </div>
      )}

      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <InvoiceCurrencySection
          documentCurrency={documentCurrency}
          setDocumentCurrency={setDocumentCurrency}
          targetCurrency={targetCurrency}
          setTargetCurrency={setTargetCurrency}
          conversionEnabled={conversionEnabled}
          setConversionEnabled={setConversionEnabled}
          useAutoRate={useAutoRate}
          setUseAutoRate={setUseAutoRate}
          manualExchangeRate={manualExchangeRate}
          setManualExchangeRate={setManualExchangeRate}
          autoExchangeRate={autoExchangeRate}
          autoRateLoading={autoRateLoading}
          autoRateError={autoRateError}
          lastUpdatedAt={lastUpdatedAt}
          conversionInfo={conversionInfo}
          baseAmount={baseAmount}
          facturaTotalFinal={facturaTotalFinal}
        />
      </div>

      {docKind !== "NOMINA" && (
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <InvoiceCatalogSection
            catalogEnabled={catalogEnabled}
            currentTx={currentTx}
            isSale={isSale}
            isPurchase={isPurchase}
            partyKey={partyKeyActive}
            partyHasOwnerOrContractor={partyHasOwnerOrContractor}
            productOptions={productOptions}
            serviceOptions={serviceOptions}
            propertyOptions={propertyOptions}
            selectedCatalogProductId={selectedCatalogProductId}
            setSelectedCatalogProductId={setSelectedCatalogProductId}
            selectedCatalogServiceId={selectedCatalogServiceId}
            setSelectedCatalogServiceId={setSelectedCatalogServiceId}
            selectedCatalogPropertyId={selectedCatalogPropertyId}
            setSelectedCatalogPropertyId={setSelectedCatalogPropertyId}
            showNewPropertyForm={showNewPropertyForm}
            setShowNewPropertyForm={setShowNewPropertyForm}
            activePropertyId={activePropertyId}
            setActivePropertyId={setActivePropertyId}
            catalogEditor={catalogEditor}
            setCatalogEditor={setCatalogEditor}
            productsCatalog={productsCatalog}
            servicesCatalog={servicesCatalog}
            propertiesCatalog={propertiesCatalog}
            addProductFromCatalog={addProductFromCatalog}
            addServiceFromCatalog={addServiceFromCatalog}
            addProductFromCatalogAndMaybeActivate={addProductFromCatalogAndMaybeActivate}
            removeCatalogProduct={removeCatalogProduct}
            removeCatalogService={removeCatalogService}
            removeCatalogProperty={removeCatalogProperty}
            onSaveCatalogRecord={handleSaveCatalogRecord}
            onSaveProperty={handleSaveProperty}
            propertyAnnexes={propertyAnnexes}
            setPropertyAnnexes={setPropertyAnnexesState}
            annexActiveId={annexActiveId}
            activeAnnexDocs={activeAnnexDocs}
            onAnnexesChangeForActive={onAnnexesChangeForActive}
            addAttachmentFromCatalogStable={addAttachmentFromCatalogStable}
            removeCatalogAttachmentStable={removeCatalogAttachmentStable}
          />
        </div>
      )}

      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <InvoiceLinesSection
          items={items}
          safeUpdateItem={safeUpdateItem}
          safeRemoveItem={safeRemoveItem}
          safeOnItemPhotosChange={safeOnItemPhotosChange}
        />
      </div>

      <div className="mt-4 flex justify-end gap-4 border-t pt-3">
        <div className="text-right">
          <div className="text-sm">Subtotal (líneas)</div>
          <div className="font-medium">{itemsSubtotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <InvoiceTotalsSection
          docKind={docKind}
          itemsSubtotal={itemsSubtotal}
          ivaPercent={ivaPercent}
          setIvaPercent={setIvaPercent}
          ivaRetenidoPercent={ivaRetenidoPercent}
          setIvaRetenidoPercent={setIvaRetenidoPercent}
          islrPercent={islrPercent}
          setIslrPercent={setIslrPercent}
          facturaIvaAmount={facturaIvaAmount}
          ivaRetenidoAmount={ivaRetenidoAmount}
          islrAmount={islrAmount}
          facturaTotalFinal={facturaTotalFinal}
          documentCurrency={documentCurrency}
          targetCurrency={targetCurrency}
          conversionInfo={conversionInfo}
        />
      </div>

      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <label className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea
          className="w-full rounded border px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="flex-1 rounded bg-green-600 py-2 text-white hover:bg-green-700"
        >
          Guardar cambios
        </button>

        {onGenerateReports && (
          <button
            type="button"
            onClick={onGenerateReports}
            className="flex-1 rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
          >
            Generar informes
          </button>
        )}
      </div>
    </form>
  );
}