"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import useInvoiceForm from "./hooks/useInvoiceForm";
import useCatalogs from "./hooks/useCatalogs";
import useExchangeRate, { CurrencyCode } from "./hooks/useExchangeRate";

import { hasOwnerOrContractorMarker, normalizeCatalogRecordForSave, sameAnnexDocs, toDateTimeLocalValue, toNumber, getLineTotalValue } from "./invoiceHelpers";
import type { DocItem as AnnexDocItem } from "./AnnexesRow";

import { hasExplicitCondoTrueFlag, forceGeneralCatalogRecord } from "./invoiceForm.helpers";

export default function useInvoiceFormViewModel(initialValues: any) {
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
    handleSubmit,
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

  const [documentDateTime, setDocumentDateTime] = React.useState<string>(() =>
    toDateTimeLocalValue(
      initialValues?.documentDateTime ??
        initialValues?.fechaHora ??
        initialValues?.dateTime ??
        initialValues?.createdAt ??
        new Date()
    )
  );

  const [documentCurrency, setDocumentCurrency] =
    React.useState<CurrencyCode>(
      () => (initialValues?.documentCurrency as CurrencyCode) ?? "VES"
    );

  const [targetCurrency, setTargetCurrency] = React.useState<CurrencyCode>(
    () => (initialValues?.targetCurrency as CurrencyCode) ?? "USD"
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
    const nextValue =
      initialValues?.documentDateTime ??
      initialValues?.fechaHora ??
      initialValues?.dateTime ??
      initialValues?.createdAt;

    if (nextValue) {
      setDocumentDateTime(toDateTimeLocalValue(nextValue));
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
  }, [
    initialValues?.documentCurrency,
    initialValues?.targetCurrency,
    initialValues?.exchangeRate,
    initialValues?.tasaCambio,
    initialValues?.rate,
    initialValues?.useAutoRate,
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

  const safeUpdateItem = async (index: number, patch: Partial<any>) => {
    try {
      await (updateItem as any)(index, patch);
      return;
    } catch {}

    const item = items[index];
    if (!item) return;
    const id = String((item as any).id ?? index);

    try {
      await (updateItem as any)(id, patch);
    } catch (e2) {
      console.warn("safeUpdateItem: updateItem falló con index e id", e2);
    }
  };

  const safeRemoveItem = async (index: number) => {
    const item = items[index];

    try {
      await (removeItem as any)(index);
      return;
    } catch {}

    if (item) {
      const id = String((item as any).id ?? index);
      try {
        await (removeItem as any)(id);
      } catch (e2) {
        console.warn("safeRemoveItem: removeItem falló con index e id", e2);
      }
    }

    try {
      const meta = (item as any)?.meta ?? {};
      const isProp =
        String((item as any)?.kind ?? "").toUpperCase() === "PROPERTY" ||
        Boolean(meta?.propertyId);

      const propId = String(meta?.propertyId ?? item?.id ?? "");
      if (isProp && propId) {
        if (propId === activePropertyId) setActivePropertyId("");
        setPropertyAnnexes((prev) => {
          const copy = { ...prev };
          delete copy[propId];
          return copy;
        });
      }
    } catch {}
  };

  const safeOnItemPhotosChange = async (
    index: number,
    files: FileList | null
  ) => {
    try {
      await (handleItemPhotosChange as any)(index, files);
      return;
    } catch {}

    const item = items[index];
    if (!item) return;
    const id = String((item as any).id ?? index);

    try {
      await (handleItemPhotosChange as any)(id, files);
    } catch (e2) {
      console.warn("safeOnItemPhotosChange falló", e2);
    }
  };

  const safeOnRemoveItemPhoto = (index: number, photoId: string) => {
    try {
      (removeItemPhoto as any)(index, photoId);
      return;
    } catch {}

    const item = items[index];
    if (!item) return;
    const id = String((item as any).id ?? index);

    try {
      (removeItemPhoto as any)(id, photoId);
    } catch (e2) {
      console.warn("safeOnRemoveItemPhoto falló", e2);
    }
  };

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

  const addAttachmentFromCatalogStable = useCallback(
    async (_anexoId: string) => undefined,
    []
  );

  const removeCatalogAttachmentStable = useCallback(
    async (_anexoId: string) => undefined,
    []
  );

  const addProductFromCatalogAndMaybeActivate = async (catalogId: string) => {
    try {
      await (addProductFromCatalog as any)(catalogId);

      const combinedCatalog = [
        ...(productsCatalog || []),
        ...(propertiesCatalog || []),
      ];
      const prod = combinedCatalog.find(
        (p: any) =>
          String(p.id) === String(catalogId) ||
          String(p.masterId ?? p.id) === String(catalogId)
      );

      const isProp = String((prod?.kind ?? "")).toUpperCase() === "PROPERTY";
      if (isProp) setActivePropertyId(String(catalogId));
      return;
    } catch (e) {
      console.warn(
        "addProductFromCatalogAndMaybeActivate: addProductFromCatalog falló",
        e
      );
    }

    const combinedCatalog = [
      ...(productsCatalog || []),
      ...(propertiesCatalog || []),
    ];
    const prod = combinedCatalog.find(
      (p: any) =>
        String(p.id) === String(catalogId) ||
        String(p.masterId ?? p.id) === String(catalogId)
    );

    const name = prod?.name ?? `Producto ${catalogId}`;
    const price = toNumber(
      prod?.price ?? prod?.unitPrice ?? prod?.rate ?? prod?.tarifa ?? 0
    );

    const itemFallback: any = {
      id: `prop-${Date.now()}`,
      kind:
        String((prod?.kind ?? "")).toUpperCase() === "PROPERTY"
          ? "PROPERTY"
          : "PRODUCTO",
      name,
      quantity: 1,
      unitPrice: price,
      price,
      rate: price,
      tarifa: price,
      total: price,
      meta: { propertyId: String(catalogId) },
    };

    addItem(itemFallback);

    if (String(itemFallback.kind ?? "").toUpperCase() === "PROPERTY") {
      setActivePropertyId(String(itemFallback.meta?.propertyId ?? itemFallback.id));
    }
  };

  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum: number, it: any) => {
      const n = getLineTotalValue(it);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [items]);

  useEffect(() => {
    if (!amountOverride) {
      setEditableAmount(itemsSubtotal);
    }
  }, [itemsSubtotal, amountOverride, setEditableAmount]);

  const baseAmount = itemsSubtotal;

  const facturaIvaAmount = useMemo(() => {
    return baseAmount * (Number(ivaPercent || 0) / 100);
  }, [baseAmount, ivaPercent]);

  const ivaRetenidoAmount = useMemo(() => {
    return baseAmount * (Number(ivaRetenidoPercent || 0) / 100);
  }, [baseAmount, ivaRetenidoPercent]);

  const islrAmount = useMemo(() => {
    return baseAmount * (Number(islrPercent || 0) / 100);
  }, [baseAmount, islrPercent]);

  const facturaTotalFinal = useMemo(() => {
    return Math.max(
      0,
      baseAmount + facturaIvaAmount - ivaRetenidoAmount - islrAmount
    );
  }, [baseAmount, facturaIvaAmount, ivaRetenidoAmount, islrAmount]);

  const conversionInfo = useMemo(() => {
    const sameCurrency = documentCurrency === targetCurrency;
    const rate = Number(exchangeRate || 0);

    const effectiveRate =
      conversionEnabled && !sameCurrency ? (rate > 0 ? rate : 0) : 0;

    const transformedAmount =
      conversionEnabled && !sameCurrency && effectiveRate > 0
        ? baseAmount * effectiveRate
        : 0;

    const transformedTotal =
      conversionEnabled && !sameCurrency && effectiveRate > 0
        ? facturaTotalFinal * effectiveRate
        : 0;

    const conversionType =
      !conversionEnabled || sameCurrency
        ? "Sin conversión"
        : `${documentCurrency === "USD" ? "Dólares (USD)" : "Bolívares (VES)"} → ${
            targetCurrency === "USD" ? "Dólares (USD)" : "Bolívares (VES)"
          }`;

    return {
      rate,
      effectiveRate,
      transformedAmount,
      transformedTotal,
      conversionType,
    };
  }, [
    baseAmount,
    facturaTotalFinal,
    documentCurrency,
    targetCurrency,
    exchangeRate,
    conversionEnabled,
  ]);

  const handleSaveCatalogRecord = async ({
    kind,
    mode,
    rec,
  }: {
    kind: "product" | "service";
    mode: "create" | "edit";
    rec: any;
  }) => {
    const withTx = normalizeCatalogRecordForSave({
      rec,
      editorRec: catalogEditor?.rec,
      currentTx,
      partyKey,
      partyHasOwnerOrContractor,
    });

    const shouldGoToCondo =
      Boolean(partyHasOwnerOrContractor) || hasExplicitCondoTrueFlag(withTx);

    const finalRec = shouldGoToCondo
      ? withTx
      : forceGeneralCatalogRecord(withTx);

    if (mode === "edit" && catalogEditor?.rec?.id) {
      if (kind === "product") {
        await updateCatalogProduct(catalogEditor.rec.id, finalRec);
      } else {
        await updateCatalogService(catalogEditor.rec.id, finalRec);
      }
      return;
    }

    if (kind === "product") {
      await createCatalogProduct(finalRec);
    } else {
      await createCatalogService(finalRec);
    }
  };

  const handleSaveProperty = async (prop: any) => {
    try {
      const baseMeta = {
        ...(prop.meta || {}),
        transactionType: currentTx,
        companyId: partyKey,
        domain: "condo",
        isPropietario: true,
        propietario: true,
      } as any;

      if (Array.isArray(prop.checklist) && prop.checklist.length > 0) {
        baseMeta.checklist = prop.checklist;
      }

      const createRec: any = {
        ...prop,
        companyId: prop.companyId ?? partyKey,
        kind: "PROPERTY",
        domain: "condo",
        isPropietario: true,
        propietario: true,
        meta: baseMeta,
      };

      let created: any = undefined;
      try {
        created = await createCatalogProperty(createRec);
      } catch (errCreate) {
        console.warn("createCatalogProperty falló o no está disponible:", errCreate);
      }

      const idToAdd = created?.id ?? prop?.id;
      if (idToAdd) {
        try {
          await addProductFromCatalogAndMaybeActivate(String(idToAdd));
        } catch (errAdd) {
          console.warn("addProductFromCatalog falló:", errAdd);
          const fallbackPrice = toNumber(
            prop.price ?? prop.unitPrice ?? prop.rate ?? prop.tarifa ?? 0
          );
          const itemFallback: any = {
            id: `prop-${Date.now()}`,
            kind: "PROPERTY",
            name: prop.name || prop.title || "Inmueble",
            quantity: 1,
            unitPrice: fallbackPrice,
            price: fallbackPrice,
            rate: fallbackPrice,
            tarifa: fallbackPrice,
            total: fallbackPrice,
            meta: {
              propertyId: idToAdd,
              companyId: partyKey,
              domain: "condo",
            },
          };
          addItem(itemFallback as any);
          setActivePropertyId(String(itemFallback.id));
        }
      } else {
        const fallbackPrice = toNumber(
          prop.price ?? prop.unitPrice ?? prop.rate ?? prop.tarifa ?? 0
        );
        const itemFallback: any = {
          id: `prop-${Date.now()}`,
          kind: "PROPERTY",
          name: prop.name || prop.title || "Inmueble",
          quantity: 1,
          unitPrice: fallbackPrice,
          price: fallbackPrice,
          rate: fallbackPrice,
          tarifa: fallbackPrice,
          total: fallbackPrice,
          meta: {
            propertyId: null,
            companyId: partyKey,
            domain: "condo",
          },
        };
        addItem(itemFallback as any);
        setActivePropertyId(String(itemFallback.id));
      }

      setShowNewPropertyForm(false);
      setSelectedCatalogPropertyId("");
      try {
        alert("Inmueble guardado y agregado a la factura.");
      } catch {}
    } catch (e) {
      console.error("Error guardando inmueble:", e);
      try {
        alert("Ocurrió un error guardando el inmueble.");
      } catch {}
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
    addAttachmentFromCatalogStable,
    removeCatalogAttachmentStable,
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
  };
}