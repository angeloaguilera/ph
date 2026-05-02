"use client";

import React, { useEffect, useMemo, useCallback, useRef } from "react";
import useInvoiceForm from "./hooks/useInvoiceForm";
import useCatalogs from "./hooks/useCatalogs";
import useExchangeRate, { CurrencyCode } from "./hooks/useExchangeRate";

import {
  hasOwnerOrContractorMarker,
  sameAnnexDocs,
} from "./invoiceHelpers";
import type { DocItem as AnnexDocItem } from "./AnnexesRow";
import { toNumber } from "./invoiceHelpers";

import {
  buildCustomerRecord,
  buildConversionInfo,
  buildInvoiceTotals,
  buildItemsSubtotal,
  getInitialDocumentDateTime,
  getInitialVoucherAddress,
} from "./invoiceFormViewModel.utils";

import { useInvoiceItemSafety } from "./invoiceFormViewModel.items";
import { useInvoiceCatalogActions } from "./invoiceFormViewModel.catalog";

export default function useInvoiceFormViewModel(
  initialValues: any,
  onSave?: (payload: any) => void | Promise<any>
) {
  const s = useInvoiceForm(initialValues);

  const {
    docKind,
    setDocKind,
    invoiceType,
    setInvoiceType,
    destination,
    setDestination,
    bank,
    setBank,
    caja,
    setCaja,
    invoiceName,
    setInvoiceName,
    ivaPercent,
    setIvaPercent,
    description,
    setDescription,
    catalogEditor,
    setCatalogEditor,
    partyInfo,
    setPartyInfo,
    parties,
    selectedPartyId,
    setSelectedPartyId,
    showNewPartyForm,
    setShowNewPartyForm,
    newPartyDraft,
    setNewPartyDraft,
    partyPhotoPreview,
    setPartyPhotoPreview,
    editingPartyId,
    setEditingPartyId,
    receiptPartyRole,
    setReceiptPartyRole,
    partiesForRole,
    currentRole,
    employees,
    setEmployees,
    showNewEmployeeForm,
    setShowNewEmployeeForm,
    newEmployeeDraft,
    setNewEmployeeDraft,
    employeePhotoPreview,
    setEmployeePhotoPreview,
    editingEmployeeId,
    setEditingEmployeeId,
    receiptEmployeeFormIndex,
    setReceiptEmployeeFormIndex,
    payrollReceipts,
    addPayrollReceipt,
    updatePayrollReceipt,
    removePayrollReceipt,
    handleRegisterAndUseEmployee,
    handleUseEmployeeWithoutRegister,
    handleNewEmployeePhotoChange,
    handleRemoveEmployeeFromTray,
    handleEditEmployeeFromTray,
    handleCloneEmployeeFromTray,
    paymentType,
    setPaymentType,
    referenceNumber,
    setReferenceNumber,
    servicesCatalog,
    setServicesCatalog,
    selectedCatalogServiceId,
    setSelectedCatalogServiceId: setSelectedCatalogServiceIdState,
    items,
    setItems,
    addItem,
    addProductFromCatalog,
    addServiceFromCatalog,
    updateItem,
    removeItem,
    handleItemPhotosChange,
    removeItemPhoto,
    createCatalogService,
    updateCatalogService,
    removeCatalogService,
    servicesFilteredByParty,
    editableAmount,
    setEditableAmount,
    amountOverride,
    setAmountOverride,
    total,
    handleSubmit: handleSubmitLocal,
    partyKeyActive,
    buildPartyRecordFromDraft,
    handleSavePartyDraft,
    handleCancelPartyForm,
    handleRemoveParty,
    handleNewPartyPhotoChange,
    numeroFactura,
    setNumeroFactura,
    numeroControl,
    setNumeroControl,
    numeroRecibo,
    setNumeroRecibo,
    selectedCatalogProductId,
    setSelectedCatalogProductId: setSelectedCatalogProductIdState,
  } = s;

  const {
    productsCatalog,
    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    propertiesCatalog,
    createCatalogProperty,
    removeCatalogProperty,
    fetchProducts: fetchProductsCatalog,
    fetchProperties: fetchPropertiesCatalog,
  } = useCatalogs();

  const [selectedCatalogPropertyId, setSelectedCatalogPropertyId] =
    React.useState<string>("");

  const [showNewPropertyForm, setShowNewPropertyForm] =
    React.useState<boolean>(false);

  const [activePropertyId, setActivePropertyId] = React.useState<string>("");

  const [propertyAnnexes, setPropertyAnnexes] = React.useState<
    Record<string, AnnexDocItem[]>
  >({});

  const [ivaRetenidoPercent, setIvaRetenidoPercent] =
    React.useState<number>(0);

  const [islrPercent, setIslrPercent] = React.useState<number>(0);

  const [facturaAnulada, setFacturaAnulada] = React.useState<
    "NO_ANULADA" | "ANULADA"
  >(() => (initialValues?.facturaAnulada as "NO_ANULADA" | "ANULADA") ?? "NO_ANULADA");

  const [saving, setSaving] = React.useState<boolean>(false);

  const [voucherAddress, setVoucherAddressState] = React.useState<string>(() =>
    getInitialVoucherAddress(initialValues)
  );

  const voucherUrlRef = useRef<string>(String(voucherAddress ?? "").trim());

  const setVoucherAddress = useCallback((url: string) => {
    const clean = String(url ?? "").trim();
    voucherUrlRef.current = clean;
    setVoucherAddressState(clean);
  }, []);

  useEffect(() => {
    voucherUrlRef.current = String(voucherAddress ?? "").trim();
  }, [voucherAddress]);

  const invoiceId = String(initialValues?.id ?? initialValues?._id ?? "");

  const [documentDateTime, setDocumentDateTime] = React.useState<string>(() =>
    getInitialDocumentDateTime(initialValues)
  );

  const [documentCurrency, setDocumentCurrency] =
    React.useState<CurrencyCode>(
      () => (initialValues?.documentCurrency as CurrencyCode) ?? "VES"
    );

  const [targetCurrency, setTargetCurrency] = React.useState<CurrencyCode>(() =>
    (initialValues?.targetCurrency as CurrencyCode) ?? "USD"
  );

  const [conversionEnabled, setConversionEnabled] =
    React.useState<boolean>(true);

  const [useAutoRate, setUseAutoRate] = React.useState<boolean>(true);

  const [manualExchangeRate, setManualExchangeRate] = React.useState<number>(
    () => {
      const raw =
        initialValues?.exchangeRate ??
        initialValues?.tasaCambio ??
        initialValues?.rate;
      const n = toNumber(raw);
      return Number.isFinite(n) && n > 0 ? n : 0;
    }
  );

  const {
    rate: autoExchangeRate,
    loading: autoRateLoading,
    error: autoRateError,
    lastUpdatedAt,
  } = useExchangeRate({
    sourceCurrency: documentCurrency,
    targetCurrency,
    enabled: useAutoRate,
    refreshMs: 15 * 60 * 1000,
  });

  const exchangeRate = useMemo(() => {
    if (!useAutoRate) return manualExchangeRate;
    return autoExchangeRate > 0 ? autoExchangeRate : manualExchangeRate;
  }, [useAutoRate, autoExchangeRate, manualExchangeRate]);

  useEffect(() => {
    console.log("[useInvoiceFormViewModel] voucherAddress:", voucherAddress);
  }, [voucherAddress]);

  useEffect(() => {
    const nextValue =
      initialValues?.documentDateTime ??
      initialValues?.fechaHora ??
      initialValues?.dateTime ??
      initialValues?.createdAt;

    if (nextValue) {
      setDocumentDateTime(getInitialDocumentDateTime(initialValues));
    }
  }, [
    initialValues?.documentDateTime,
    initialValues?.fechaHora,
    initialValues?.dateTime,
    initialValues?.createdAt,
  ]);

  useEffect(() => {
    if (initialValues?.documentCurrency) {
      setDocumentCurrency(initialValues.documentCurrency as CurrencyCode);
    }
    if (initialValues?.targetCurrency) {
      setTargetCurrency(initialValues.targetCurrency as CurrencyCode);
    }

    const raw =
      initialValues?.exchangeRate ??
      initialValues?.tasaCambio ??
      initialValues?.rate;

    if (raw !== undefined && raw !== null && raw !== "") {
      const n = toNumber(raw);
      if (Number.isFinite(n) && n > 0) setManualExchangeRate(n);
    }

    if (typeof initialValues?.useAutoRate === "boolean") {
      setUseAutoRate(Boolean(initialValues.useAutoRate));
    }

    const voucher = getInitialVoucherAddress(initialValues);
    if (voucher) setVoucherAddress(voucher);
  }, [
    initialValues?.documentCurrency,
    initialValues?.targetCurrency,
    initialValues?.exchangeRate,
    initialValues?.tasaCambio,
    initialValues?.rate,
    initialValues?.useAutoRate,
    initialValues?.voucherAddress,
    initialValues?.voucherUrl,
    initialValues?.voucherURL,
    initialValues?.storage?.fileUrl,
    initialValues?.storage?.publicUrl,
    initialValues?.storage?.url,
    initialValues?.comprobanteUrl,
    initialValues?.comprobanteURL,
    setVoucherAddress,
  ]);

  const partyKey = partyKeyActive ?? "";

  const selectedPartyRecord = useMemo(() => {
    if (!selectedPartyId) return undefined;
    return (
      parties.find(
        (x: any) =>
          String(x.id) === String(selectedPartyId) ||
          String(x.companyId ?? "") === String(selectedPartyId)
      ) ?? undefined
    );
  }, [parties, selectedPartyId]);

  const partyHasOwnerOrContractor = useMemo(
    () => hasOwnerOrContractorMarker(selectedPartyRecord),
    [selectedPartyRecord]
  );

  const currentTx: "venta" | "compra" | undefined =
    invoiceType === "VENTA"
      ? "venta"
      : invoiceType === "COMPRA"
      ? "compra"
      : undefined;

  useEffect(() => {
    if (invoiceType === "VENTA") setReceiptPartyRole("CLIENTE");
    else if (invoiceType === "COMPRA") setReceiptPartyRole("PROVEEDOR");
  }, [invoiceType, setReceiptPartyRole]);

  const computedPartyRole =
    invoiceType === "VENTA"
      ? "CLIENTE"
      : invoiceType === "COMPRA"
      ? "PROVEEDOR"
      : receiptPartyRole || currentRole;

  const isSale = currentTx === "venta";
  const isPurchase = currentTx === "compra";

  const productOptions = useMemo(() => {
    if (!partyKey) return [];
    const fromInvoiceHook = (s.productsFilteredByParty ?? []) as any[];
    if (Array.isArray(fromInvoiceHook) && fromInvoiceHook.length > 0) {
      return fromInvoiceHook;
    }
    return (productsCatalog || []).filter(
      (p: any) => String(p.companyId ?? "") === String(partyKey)
    );
  }, [s.productsFilteredByParty, partyKey, productsCatalog]);

  const serviceOptions = useMemo(() => {
    if (!partyKey) return [];
    return servicesFilteredByParty || [];
  }, [servicesFilteredByParty, partyKey]);

  const propertyOptions = useMemo(() => {
    if (!partyKey) return [];
    return (propertiesCatalog || []).filter((p: any) => {
      const sameCompany = String(p.companyId ?? "") === String(partyKey);
      const isProperty = String((p.kind ?? "")).toUpperCase() === "PROPERTY";
      return sameCompany && isProperty;
    });
  }, [propertiesCatalog, partyKey]);

  const catalogEnabled = docKind !== "NOMINA" && Boolean(partyKey);

  const selectedPropertyOption = useMemo(() => {
    if (!selectedCatalogPropertyId || selectedCatalogPropertyId === "__create__")
      return undefined;

    return (propertyOptions || []).find(
      (p: any) =>
        String(p.id) === String(selectedCatalogPropertyId) ||
        String(p.masterId ?? p.id) === String(selectedCatalogPropertyId)
    );
  }, [selectedCatalogPropertyId, propertyOptions]);

  const annexActiveId = useMemo(() => {
    if (selectedPropertyOption) return String(selectedCatalogPropertyId);
    if (activePropertyId) return String(activePropertyId);
    return "";
  }, [selectedPropertyOption, selectedCatalogPropertyId, activePropertyId]);

  const activeAnnexDocs = useMemo(
    () => propertyAnnexes[annexActiveId] ?? [],
    [propertyAnnexes, annexActiveId]
  );

  useEffect(() => {
    const cur = selectedCatalogServiceId;
    if (!cur) return;

    const valid = (serviceOptions || []).some(
      (p: any) =>
        String(p.id) === String(cur) || String(p.masterId ?? p.id) === String(cur)
    );

    if (!valid) setSelectedCatalogServiceIdState("");
  }, [selectedCatalogServiceId, serviceOptions, setSelectedCatalogServiceIdState]);

  useEffect(() => {
    const cur = selectedCatalogPropertyId;
    if (!cur || cur === "__create__") return;

    const valid = (propertyOptions || []).some(
      (p: any) =>
        String(p.id) === String(cur) || String(p.masterId ?? p.id) === String(cur)
    );

    if (valid) {
      setActivePropertyId(String(cur));
    } else {
      setActivePropertyId("");
    }
  }, [selectedCatalogPropertyId, propertyOptions]);

  useEffect(() => {
    let mounted = true;

    fetchProductsCatalog().catch((e) => {
      if (mounted) console.warn("[InvoiceForm] fetchProductsCatalog falló", e);
    });

    fetchPropertiesCatalog().catch((e) => {
      if (mounted) console.warn("[InvoiceForm] fetchPropertiesCatalog falló", e);
    });

    return () => {
      mounted = false;
    };
  }, [fetchProductsCatalog, fetchPropertiesCatalog]);

  useEffect(() => {
    setShowNewPropertyForm(false);
    setSelectedCatalogPropertyId("");
    setActivePropertyId("");
    setPropertyAnnexes({});
  }, [selectedPartyId, partyKey, setShowNewPropertyForm]);

  useEffect(() => {
    if (!activePropertyId) return;

    const stillExists = items.some((it: any) => {
      const meta = (it as any)?.meta ?? {};
      return (
        String(meta?.propertyId ?? "") === String(activePropertyId) ||
        String((it as any)?.kind ?? "").toUpperCase() === "PROPERTY"
      );
    });

    if (!stillExists) {
      setActivePropertyId("");
    }
  }, [items, activePropertyId]);

  const handleInvoiceTypeChange = useCallback(
    (newType: any) => {
      setInvoiceType(newType);

      if (newType === "VENTA") setReceiptPartyRole("CLIENTE");
      else if (newType === "COMPRA") setReceiptPartyRole("PROVEEDOR");

      setSelectedPartyId("");
      setPartyInfo({
        partyType: "NATURAL",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        country: "",
        rif: "",
        nit: "",
        photoDataUrl: undefined,
      });
      setPartyPhotoPreview(undefined);
      setSelectedCatalogProductIdState("");
      setSelectedCatalogServiceIdState("");
      setSelectedCatalogPropertyId("");
      setShowNewPropertyForm(false);
      setActivePropertyId("");
      setPropertyAnnexes({});
    },
    [
      setInvoiceType,
      setReceiptPartyRole,
      setSelectedPartyId,
      setPartyInfo,
      setPartyPhotoPreview,
      setSelectedCatalogProductIdState,
      setSelectedCatalogServiceIdState,
      setShowNewPropertyForm,
    ]
  );

  const {
    safeUpdateItem,
    safeRemoveItem,
    safeOnItemPhotosChange,
    safeOnRemoveItemPhoto,
  } = useInvoiceItemSafety({
    items,
    updateItem,
    removeItem,
    handleItemPhotosChange,
    removeItemPhoto,
    activePropertyId,
    setActivePropertyId,
    setPropertyAnnexes,
  });

  const {
    handleSaveCatalogRecord,
    handleSaveProperty,
    addProductFromCatalogAndMaybeActivate,
  } = useInvoiceCatalogActions({
    productsCatalog,
    propertiesCatalog,
    createCatalogProduct,
    updateCatalogProduct,
    createCatalogService,
    updateCatalogService,
    createCatalogProperty,
    addProductFromCatalog,
    addItem,
    setActivePropertyId,
    setShowNewPropertyForm,
    setSelectedCatalogPropertyId,
    partyKey,
    currentTx,
    partyHasOwnerOrContractor,
    catalogEditor,
  });

  const onAnnexesChangeForActive = useCallback(
    (docs: AnnexDocItem[]) => {
      if (!annexActiveId) return;

      setPropertyAnnexes((prev) => {
        const current = prev[annexActiveId] ?? [];
        if (sameAnnexDocs(current, docs)) return prev;

        return {
          ...prev,
          [annexActiveId]: docs,
        };
      });
    },
    [annexActiveId]
  );

  const itemsSubtotal = useMemo(() => buildItemsSubtotal(items), [items]);

  useEffect(() => {
    if (!amountOverride) {
      setEditableAmount(itemsSubtotal);
    }
  }, [itemsSubtotal, amountOverride, setEditableAmount]);

  const baseAmount = itemsSubtotal;

  const {
    facturaIvaAmount,
    ivaRetenidoAmount,
    islrAmount,
    facturaTotalFinal,
  } = useMemo(
    () =>
      buildInvoiceTotals({
        baseAmount,
        ivaPercent,
        ivaRetenidoPercent,
        islrPercent,
      }),
    [baseAmount, ivaPercent, ivaRetenidoPercent, islrPercent]
  );

  const conversionInfo = useMemo(
    () =>
      buildConversionInfo({
        documentCurrency,
        targetCurrency,
        exchangeRate,
        conversionEnabled,
        baseAmount,
        facturaTotalFinal,
      }),
    [
      documentCurrency,
      targetCurrency,
      exchangeRate,
      conversionEnabled,
      baseAmount,
      facturaTotalFinal,
    ]
  );

  const getPartyDisplayName = useCallback((record: unknown) => {
    return String(
      (record as any)?.name ??
        (record as any)?.businessName ??
        (record as any)?.fullName ??
        (record as any)?.displayName ??
        (record as any)?.razonSocial ??
        (record as any)?.companyName ??
        ""
    );
  }, []);

  const handleSubmit = async (evt?: { preventDefault?: () => void }) => {
    evt?.preventDefault?.();

    setSaving(true);
    try {
      const currentVoucherAddress = String(
        voucherUrlRef.current || voucherAddress || ""
      ).trim();

      console.log("[handleSubmit] voucher:", currentVoucherAddress);

      const customer = buildCustomerRecord(
        selectedPartyRecord,
        partyInfo,
        partyKey
      );

      const payload = {
        invoice: {
          id: invoiceId || undefined,
          type: invoiceType,
          docKind,
          facturaAnulada,
          invoiceName,
          date: documentDateTime,
          amount: baseAmount,
          iva: facturaIvaAmount,
          ivaPercent,
          ivaRetenido: ivaRetenidoAmount,
          ivaRetenidoPercent,
          islr: islrAmount,
          islrPercent,
          total: facturaTotalFinal,
          numeroFactura,
          numeroControl,
          voucherAddress: currentVoucherAddress,
          voucherUrl: currentVoucherAddress,
          effectiveVoucherUrl: currentVoucherAddress,
          items,
          customer,
          payment: {
            method: paymentType,
            reference: referenceNumber,
          },
          bank,
        },
        inventoryResult: {
          inventory: [],
          changes: {
            created: [],
            updated: [],
          },
        },
      };

      console.log("[handleSubmit] payload.invoice:", payload.invoice);

      if (onSave) {
        return await onSave(payload);
      }

      return payload;
    } catch (error) {
      console.error("[useInvoiceFormViewModel] Error preparando factura:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    docKind,
    setDocKind,
    invoiceType,
    setInvoiceType,
    destination,
    setDestination,
    bank,
    setBank,
    caja,
    setCaja,
    invoiceName,
    setInvoiceName,
    ivaPercent,
    setIvaPercent,
    description,
    setDescription,
    catalogEditor,
    setCatalogEditor,
    partyInfo,
    setPartyInfo,
    parties,
    selectedPartyId,
    setSelectedPartyId,
    showNewPartyForm,
    setShowNewPartyForm,
    newPartyDraft,
    setNewPartyDraft,
    partyPhotoPreview,
    setPartyPhotoPreview,
    editingPartyId,
    setEditingPartyId,
    receiptPartyRole,
    setReceiptPartyRole,
    partiesForRole,
    currentRole,
    employees,
    setEmployees,
    showNewEmployeeForm,
    setShowNewEmployeeForm,
    newEmployeeDraft,
    setNewEmployeeDraft,
    employeePhotoPreview,
    setEmployeePhotoPreview,
    editingEmployeeId,
    setEditingEmployeeId,
    receiptEmployeeFormIndex,
    setReceiptEmployeeFormIndex,
    payrollReceipts,
    addPayrollReceipt,
    updatePayrollReceipt,
    removePayrollReceipt,
    handleRegisterAndUseEmployee,
    handleUseEmployeeWithoutRegister,
    handleNewEmployeePhotoChange,
    handleRemoveEmployeeFromTray,
    handleEditEmployeeFromTray,
    handleCloneEmployeeFromTray,
    paymentType,
    setPaymentType,
    referenceNumber,
    setReferenceNumber,
    servicesCatalog,
    setServicesCatalog,
    selectedCatalogServiceId,
    setSelectedCatalogServiceIdState,
    items,
    setItems,
    addItem,
    addProductFromCatalog,
    addServiceFromCatalog,
    updateItem,
    removeItem,
    handleItemPhotosChange,
    removeItemPhoto,
    createCatalogService,
    updateCatalogService,
    removeCatalogService,
    servicesFilteredByParty,
    editableAmount,
    setEditableAmount,
    amountOverride,
    setAmountOverride,
    total,
    handleSubmit,
    handleSubmitLocal,
    saving,
    loadingInvoice: false,
    invoiceLoadError: null,
    voucherAddress,
    setVoucherAddress,
    partyKeyActive,
    buildPartyRecordFromDraft,
    handleSavePartyDraft,
    handleCancelPartyForm,
    handleRemoveParty,
    handleNewPartyPhotoChange,
    numeroFactura,
    setNumeroFactura,
    numeroControl,
    setNumeroControl,
    numeroRecibo,
    setNumeroRecibo,
    facturaAnulada,
    setFacturaAnulada,
    selectedCatalogProductId,
    setSelectedCatalogProductIdState,
    productsCatalog,
    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    propertiesCatalog,
    createCatalogProperty,
    removeCatalogProperty,
    fetchProductsCatalog,
    fetchPropertiesCatalog,
    selectedCatalogPropertyId,
    setSelectedCatalogPropertyId,
    showNewPropertyForm,
    setShowNewPropertyForm,
    activePropertyId,
    setActivePropertyId,
    propertyAnnexes,
    setPropertyAnnexes,
    ivaRetenidoPercent,
    setIvaRetenidoPercent,
    islrPercent,
    setIslrPercent,
    documentDateTime,
    setDocumentDateTime,
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
    exchangeRate,
    selectedPartyRecord,
    partyHasOwnerOrContractor,
    currentTx,
    computedPartyRole,
    isSale,
    isPurchase,
    productOptions,
    serviceOptions,
    propertyOptions,
    catalogEnabled,
    selectedPropertyOption,
    annexActiveId,
    activeAnnexDocs,
    safeUpdateItem,
    safeRemoveItem,
    safeOnItemPhotosChange,
    safeOnRemoveItemPhoto,
    onAnnexesChangeForActive,
    addAttachmentFromCatalogStable: addProductFromCatalogAndMaybeActivate,
    removeCatalogAttachmentStable: async (_anexoId: string) => undefined,
    addProductFromCatalogAndMaybeActivate,
    itemsSubtotal,
    baseAmount,
    facturaIvaAmount,
    ivaRetenidoAmount,
    islrAmount,
    facturaTotalFinal,
    conversionInfo,
    handleSaveCatalogRecord,
    handleSaveProperty,
    handleInvoiceTypeChange,
    getPartyDisplayName,
  };
}