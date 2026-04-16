"use client";

import React from "react";

import useInvoiceFormViewModel from "./useInvoiceFormViewModel";
import { matchById } from "./invoiceHelpers";

import PartyFormInline from "./PartyFormInline";
import PayrollSection from "./PayrollSection";
import InvoiceCatalogSection from "./InvoiceCatalogSection";
import InvoiceLinesSection from "./InvoiceLinesSection";
import InvoiceTotalsSection from "./InvoiceTotalsSection";
import InvoiceDocumentHeaderSection from "./InvoiceDocumentHeaderSection";
import InvoiceCurrencySection from "./InvoiceCurrencySection";
import styles from "./InvoiceForm.module.css";

type Props = {
  onSave: (e?: any) => void;
  onGenerateReports?: () => void;
  initialValues?: any;
};

export default function InvoiceForm({ onSave, onGenerateReports, initialValues }: Props) {
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

  const resetCatalogSelection = React.useCallback(() => {
    setSelectedCatalogProductId("");
    setSelectedCatalogServiceId("");
    setSelectedCatalogPropertyId("");
    setShowNewPropertyForm(false);
    setActivePropertyId("");
    setPropertyAnnexesState({});
  }, [
    setSelectedCatalogProductId,
    setSelectedCatalogServiceId,
    setSelectedCatalogPropertyId,
    setShowNewPropertyForm,
    setActivePropertyId,
    setPropertyAnnexesState,
  ]);

  const safeAddProductFromCatalog = React.useCallback(
    (catalogId?: string) => {
      const id = String(catalogId ?? selectedCatalogProductId ?? "").trim();

      if (!id) {
        alert("Selecciona un producto del catálogo antes de agregarlo.");
        return;
      }

      const existsInOptions = (productOptions || []).some((p: any) => matchById(p, id));
      const existsInCatalog = (productsCatalog || []).some((p: any) => matchById(p, id));

      if (!existsInOptions && !existsInCatalog) {
        alert("Producto no encontrado en el catálogo de la empresa.");
        return;
      }

      return (addProductFromCatalog as any)(id);
    },
    [addProductFromCatalog, productOptions, productsCatalog, selectedCatalogProductId]
  );

  const handleConsultarParty = async (pagina: string, rif: string) => {
    try {
      setNewPartyDraft((d: any) => ({
        ...(d ?? {}),
        pagina,
        rif,
        needsManualReview: true,
      }));
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
      className={styles.form}
    >
      <div className={styles.stack}>
        <section className={styles.section}>
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
        </section>

        {docKind === "NOMINA" && (
          <section className={styles.section}>
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
          </section>
        )}

        {docKind !== "NOMINA" && (
          <section className={styles.section}>
            <PartyFormInline
              currentRole={computedPartyRole}
              partiesForRole={partiesForRole}
              selectedPartyId={selectedPartyId}
              onSelectParty={(id: string) => {
                setSelectedPartyId(id);
                resetCatalogSelection();
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
                resetCatalogSelection();
              }}
              onEditSelected={() => {
                setEditingPartyId(selectedPartyId || undefined);
                const found = parties.find((x: any) => x.id === selectedPartyId);
                if (found) {
                  setNewPartyDraft({ ...found });
                  setPartyPhotoPreview(found.photoDataUrl);
                  setShowNewPartyForm(true);
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
                handleSavePartyDraft(
                  newPartyDraft,
                  computedPartyRole,
                  selectAfterSave,
                  vm.editingPartyId
                )
                  .then((rec: any) => {
                    if (selectAfterSave && rec && rec.id) {
                      setSelectedPartyId(rec.id);
                    }
                  })
                  .catch((err: any) => {
                    console.error("Error guardando party draft:", err);
                  });
              }}
              onCancelForm={() => {
                handleCancelPartyForm();
              }}
              onRemoveParty={(id: string) => {
                if (!id) return;
                const found = parties.find((p: any) => p.id === id);
                if (!found) return;

                if (!confirm(`¿Eliminar a ${found.name}? Esta acción no se puede deshacer.`)) {
                  return;
                }

                handleRemoveParty(id);
              }}
            />
          </section>
        )}

        <section className={styles.section}>
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
        </section>

        {docKind !== "NOMINA" && (
          <section className={styles.section}>
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
              addProductFromCatalog={safeAddProductFromCatalog}
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
          </section>
        )}

        <section className={styles.section}>
          <InvoiceLinesSection
            items={items}
            safeUpdateItem={safeUpdateItem}
            safeRemoveItem={safeRemoveItem}
            safeOnItemPhotosChange={safeOnItemPhotosChange}
            invoiceType={invoiceType}
          />
        </section>

        <section className={styles.summaryBar}>
          <div className={styles.summaryTextBlock}>
            <div className={styles.summaryLabel}>Subtotal (líneas)</div>
            <div className={styles.summaryValue}>{itemsSubtotal.toFixed(2)}</div>
          </div>
        </section>

        <section className={styles.section}>
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
        </section>

        <section className={styles.section}>
          <label className={styles.label} htmlFor="invoice-description">
            Descripción
          </label>
          <textarea
            id="invoice-description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </section>

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton}>
            Guardar cambios
          </button>

          {onGenerateReports && (
            <button type="button" onClick={onGenerateReports} className={styles.secondaryButton}>
              Generar informes
            </button>
          )}
        </div>
      </div>
    </form>
  );
}