import React from "react";
import { useCallback, useMemo, useState } from "react";
import { genId } from "../../../../lib/invoiceUtils";
import type { InvoiceItem, DocKind, PartyInfo } from "../../../../types/invoice";
import useParties from "./useParties";
import useCatalogs from "./useCatalogs";
import useItems from "./useItems";
import usePayroll from "./usePayroll";
import {
  createEmptyPartyDraft,
  normalizePartyRecord,
} from "./parties/partyHelpers";

/**
 * useInvoiceForm
 * - orquesta parties, catalogs, items y payroll
 * - expone la API usada en tu componente
 *
 * Nota importante: incluye wrapper seguro para setCatalogEditor que normaliza
 * entradas accidentales (ej: si alguien hace setCatalogEditor(s) por error).
 *
 * Cambios: se eliminó completamente la lógica de "master" (masterProducts/masterServices).
 */
export default function useInvoiceForm(initialValues?: {
  items?: InvoiceItem[];
  party?: Partial<PartyInfo>;
}) {
  // ---------------------------
  // UI state (grouped near top)
  // ---------------------------
  const [docKind, setDocKind] = useState<DocKind>("FACTURA");
  const [invoiceType, setInvoiceType] = useState<"VENTA" | "COMPRA">("VENTA");
  const [destination, setDestination] = useState<"BANCO" | "CAJA">("BANCO");
  const [bank, setBank] = useState("");
  const [caja, setCaja] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [ivaPercent, setIvaPercent] = useState<number>(16);
  const [description, setDescription] = useState("");

  // internal catalogEditor state (do NOT export the raw setter)
  const [catalogEditorInternal, setCatalogEditorInternal] = useState<any>(null);

  // ---------------------------
  // parties
  // ---------------------------
  const partiesHook = useParties(initialValues?.party);
  const {
    partyInfo,
    setPartyInfo,
    parties,
    setParties,
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
    normalizePartyRecord,
    buildPartyRecordFromDraft,
    handleSavePartyDraft,
    handleCancelPartyForm,
    handleRemoveParty,
    handleNewPartyPhotoChange,
    partiesForRole,
    partyKeyFromParty,
    selectedNormalizedParty,
    updatePartyChecklist,
    toggleChecklistInDraft,
    addChecklistItemToDraft,
    removeChecklistItemFromDraft,
    toggleChecklistForParty,
  } = partiesHook;

  // ---------------------------
  // catalogs
  // ---------------------------
  const catalogs = useCatalogs();
  const {
    productsCatalog,
    servicesCatalog,
    ensureCatalogForParty,
    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    cloneCatalogProduct,
    createCatalogService,
    updateCatalogService,
    removeCatalogService,
    cloneCatalogService,
    setProductsCatalog,
    setServicesCatalog,
  } = catalogs;

  // ---------------------------
  // items
  // ---------------------------
  const itemsHook = useItems(initialValues?.items ?? []);
  const {
    items,
    setItems,
    addItem,
    updateItem,
    removeItem,
    lineTotal,
    handleItemPhotosChange,
    removeItemPhoto,
    mapProductToItemState,
    mapServiceToItemState,
    addProductFromCatalog,
    addServiceFromCatalog,
  } = itemsHook;

  // ---------------------------
  // payroll
  // ---------------------------
  const payroll = usePayroll();
  const {
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
  } = payroll;

  // ---------------------------
  // totals
  // ---------------------------
  const subtotal = useMemo(() => {
    const itemsSubtotal = Number(
      items.reduce((s, it) => s + lineTotal(it), 0).toFixed(2)
    );

    const payrollSubtotal =
      docKind === "NOMINA"
        ? Number(
            payrollReceipts
              .reduce((s, r) => s + (Number(r.amount) || 0), 0)
              .toFixed(2)
          )
        : 0;

    return Number((itemsSubtotal + payrollSubtotal).toFixed(2));
  }, [items, payrollReceipts, docKind, lineTotal]);

  const [editableAmount, setEditableAmount] = useState<number>(0);
  const [amountOverride, setAmountOverride] = useState<boolean>(false);

  if (!amountOverride && editableAmount !== subtotal) setEditableAmount(subtotal);

  const ivaAmount = useMemo(() => {
    if (docKind !== "FACTURA") return 0;
    const base = amountOverride ? editableAmount : subtotal;
    const pct = isNaN(Number(ivaPercent)) ? 0 : Number(ivaPercent);
    return Number(((Number(base) * pct) / 100).toFixed(2));
  }, [editableAmount, amountOverride, ivaPercent, docKind, subtotal]);

  const total = useMemo(() => {
    const base = amountOverride ? editableAmount : subtotal;
    if (docKind === "FACTURA") return Number((Number(base) + ivaAmount).toFixed(2));
    return Number(Number(base).toFixed(2));
  }, [editableAmount, amountOverride, ivaAmount, docKind, subtotal]);

  // ---------------------------
  // partyKeyActive & filtered catalogs
  // ---------------------------
  const partyKeyActive = useMemo(() => {
    if (partyInfo?.companyId && String(partyInfo.companyId).trim()) {
      return String(partyInfo.companyId).trim();
    }

    if (selectedPartyId) {
      const found = (parties || []).find(
        (p) => String(p.id) === String(selectedPartyId)
      );

      if (found?.companyId && String(found.companyId).trim()) {
        return String(found.companyId).trim();
      }

      return String(found?.id ?? selectedPartyId);
    }

    return "";
  }, [partyInfo?.companyId, selectedPartyId, parties]);

  const productsFilteredByParty = useMemo(() => {
    if (!partyKeyActive) return [];
    return productsCatalog.filter(
      (p) => String(p.companyId ?? "") === String(partyKeyActive)
    );
  }, [productsCatalog, partyKeyActive]);

  const servicesFilteredByParty = useMemo(() => {
    if (!partyKeyActive) return [];
    return servicesCatalog.filter(
      (s) => String(s.companyId ?? "") === String(partyKeyActive)
    );
  }, [servicesCatalog, partyKeyActive]);

  const ensureCatalogsAndReturn = useCallback(
    (partyRec?: PartyInfo | any) => {
      if (!partyRec) return { productClones: [], serviceClones: [] };
      const normalized = normalizePartyRecord(partyRec);
      return ensureCatalogForParty(normalized);
    },
    [ensureCatalogForParty, normalizePartyRecord]
  );

  // ---------------------------
  // catalog add-by-id helpers (sin lógica "master")
  // ---------------------------
  const addProductFromCatalogById = useCallback(
    async (productId?: string) => {
      const searchId = productId?.toString();
      if (!searchId) return alert("No hay producto seleccionado en el catálogo.");

      const prod = productsCatalog.find(
        (p) =>
          String(p.id) === String(searchId) ||
          String(p.masterId ?? "") === String(searchId)
      );

      if (!prod) {
        return alert(
          "Producto no encontrado en el catálogo. Asegúrate de haber agregado el producto al catálogo de la empresa primero."
        );
      }

      addProductFromCatalog(prod);
    },
    [productsCatalog, addProductFromCatalog]
  );

  const addServiceFromCatalogById = useCallback(
    async (serviceId?: string) => {
      const searchId = serviceId?.toString();
      if (!searchId) return alert("No hay servicio seleccionado en el catálogo.");

      const svc = servicesCatalog.find(
        (s) =>
          String(s.id) === String(searchId) ||
          String(s.masterId ?? "") === String(searchId)
      );

      if (!svc) {
        return alert(
          "Servicio no encontrado en el catálogo. Asegúrate de haber agregado el servicio al catálogo de la empresa primero."
        );
      }

      addServiceFromCatalog(svc);
    },
    [servicesCatalog, addServiceFromCatalog]
  );

  // ---------------------------
  // payment & other simple states
  // ---------------------------
  const [paymentType, setPaymentType] = useState<
    "" | "DEBITO" | "TRANSFERENCIA" | "CREDITO" | "PAGOMOVIL"
  >("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  const [numeroFactura, setNumeroFactura] = useState("");
  const [numeroControl, setNumeroControl] = useState("");
  const [numeroRecibo, setNumeroRecibo] = useState("");

  const [selectedCatalogProductId, setSelectedCatalogProductIdState] =
    useState<string>("");
  const [selectedCatalogServiceId, setSelectedCatalogServiceIdState] =
    useState<string>("");

  // ---------------------------
  // handle submit
  // ---------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent, onSave?: (invoice: any) => void) => {
      e.preventDefault();

      if (!invoiceName.trim()) {
        return alert(
          docKind === "FACTURA"
            ? "Ingresa el nombre de la factura."
            : docKind === "RECIBO"
            ? "Ingresa el nombre del recibo."
            : "Ingresa el nombre del recibo nómina."
        );
      }

      if (docKind === "NOMINA") {
        if (!payrollReceipts.length) {
          return alert("Agrega al menos un recibo de nómina.");
        }

        for (let i = 0; i < payrollReceipts.length; i++) {
          const r = payrollReceipts[i];
          if (!r.name?.trim()) return alert(`Recibo #${i + 1} necesita nombre.`);
          if (!r.number?.trim()) return alert(`Recibo #${i + 1} necesita número.`);
          if (r.destination === "BANCO" && !r.bank?.trim()) {
            return alert(`Recibo #${i + 1} (banco) necesita banco.`);
          }
          if (r.destination === "CAJA" && !r.caja?.trim()) {
            return alert(`Recibo #${i + 1} (caja) necesita caja.`);
          }
          if (!r.amount || r.amount <= 0) {
            return alert(`Recibo #${i + 1} necesita monto válido.`);
          }
          if (!r.employeeId && !r.employeeSnapshot) {
            return alert(
              `Recibo #${i + 1} necesita empleado asignado o datos del empleado.`
            );
          }
        }
      } else {
        if (!partyInfo.name?.trim()) {
          return alert(
            invoiceType === "VENTA"
              ? "Ingresa el nombre del cliente."
              : "Ingresa el nombre del proveedor."
          );
        }

        if (!partyInfo.rif?.trim()) return alert("Ingresa RIF.");

        if (destination === "BANCO" && !bank.trim()) return alert("Ingresa banco.");
        if (destination === "CAJA" && !caja.trim()) return alert("Ingresa caja.");
        if (destination === "BANCO" && !paymentType) {
          return alert("Selecciona tipo de pago.");
        }
        if (destination === "BANCO" && !referenceNumber.trim()) {
          return alert("Ingresa número de referencia.");
        }
        if (!items.length) return alert("Agrega al menos un artículo.");

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (!it.name?.trim()) {
            return alert(`Artículo/Servicio #${i + 1} necesita nombre.`);
          }
          if (it.kind === "SERVICIO") {
            if (!it.hours || it.hours <= 0) {
              return alert(`Servicio "${it.name}" necesita horas válidas.`);
            }
            if (it.rate === undefined || it.rate < 0) {
              return alert(`Servicio "${it.name}" necesita tarifa válida.`);
            }
            if (!it.category || it.category.trim() === "") {
              return alert(
                `Servicio "${it.name}" necesita una categoría (gasto/ingreso).`
              );
            }
          } else {
            if (!it.quantity || it.quantity <= 0) {
              return alert(`Artículo "${it.name}" necesita cantidad válida.`);
            }
          }
        }
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.name || !it.name.toString().trim()) {
          return alert(`Línea #${i + 1}: nombre es requerido.`);
        }
        if (!it.accountId || !String(it.accountId).trim()) {
          return alert(`Línea "${it.name}" necesita asignar una cuenta contable.`);
        }
      }

      const savedDate = new Date().toISOString();
      const invoiceId = genId();
      const amountToSend =
        docKind === "FACTURA" || docKind === "RECIBO"
          ? Number(amountOverride ? editableAmount : subtotal)
          : subtotal;

      const invoicePayload: any = {
        id: invoiceId,
        type: invoiceType,
        docKind,
        invoiceName: invoiceName.trim(),
        date: savedDate,
        amount: amountToSend,
        ...(docKind === "FACTURA" ? { iva: ivaAmount, ivaPercent } : {}),
        total,
        description: description.trim() || undefined,
        items: items.map((it) => {
          const base = {
            id: it.id ?? genId(),
            kind: it.kind ?? "ARTICULO",
            catalogId: it.catalogId,
            accountId: it.accountId,
            category: it.category,
            name: it.name,
            sku: it.sku,
            model: it.model,
            size: it.size,
            specs: it.specs ?? {},
            total: lineTotal(it),
          };

          if (it.kind === "SERVICIO") {
            return {
              ...base,
              serviceDescription: it.serviceDescription,
              hours: it.hours ?? 0,
              rate: it.rate ?? 0,
              quantity: it.hours ?? 0,
              unitPrice: it.rate ?? 0,
            };
          }

          return {
            ...base,
            type: it.type,
            subtype: it.subtype,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          };
        }),
      };

      if (docKind === "NOMINA") {
        invoicePayload.payrollReceipts = payrollReceipts;
      } else {
        if (invoiceType === "VENTA") invoicePayload.customer = partyInfo;
        else invoicePayload.supplier = partyInfo;

        if (destination === "BANCO") {
          invoicePayload.payment = {
            method: paymentType,
            reference: referenceNumber.trim(),
          };
          invoicePayload.bank = bank.trim();
        }

        if (destination === "CAJA") {
          invoicePayload.caja = caja.trim();
        }
      }

      const form = new FormData();
      form.append("invoice", JSON.stringify(invoicePayload));

      items.forEach((it) => {
        const itemId = it.id ?? genId();
        const files = it.__files ?? [];
        files.forEach((f, i) => {
          const key = `itemFile-${itemId}-${i}`;
          form.append(key, f);
        });
      });

      try {
        const res = await fetch("/api/administration/process-invoice", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Error procesando comprobante");
        }

        const data = await res.json();
        const savedInvoice = data?.invoice ?? data;

        alert(
          docKind === "FACTURA"
            ? "Factura procesada correctamente."
            : docKind === "NOMINA"
            ? "Nómina procesada correctamente."
            : "Recibo procesado correctamente."
        );

        if (typeof window !== "undefined") window.scrollTo(0, 0);
        if (typeof onSave === "function") onSave(savedInvoice);

        resetForm();
        return savedInvoice;
      } catch (err: any) {
        console.error("[useInvoiceForm] handleSubmit - error:", err);
        alert("Error: " + (err?.message ?? err));
        return undefined;
      }
    },
    [
      invoiceName,
      docKind,
      payrollReceipts,
      partyInfo,
      invoiceType,
      destination,
      bank,
      caja,
      paymentType,
      referenceNumber,
      items,
      subtotal,
      editableAmount,
      amountOverride,
      ivaAmount,
      ivaPercent,
      total,
      lineTotal,
    ]
  );

  // ---------------------------
  // reset form
  // ---------------------------
  const resetForm = useCallback(() => {
    setDocKind("FACTURA");
    setInvoiceType("VENTA");
    setDestination("BANCO");
    setInvoiceName("");
    setBank("");
    setPaymentType("");
    setReferenceNumber("");
    setCaja("");
    setItems([]);

    if (payrollReceipts && payrollReceipts.length) {
      for (let i = payrollReceipts.length - 1; i >= 0; i--) {
        try {
          removePayrollReceipt(i);
        } catch (e) {}
      }
    }

    setDescription("");
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
    setShowNewPartyForm(false);
    setNewPartyDraft(createEmptyPartyDraft());
    setNumeroFactura("");
    setNumeroControl("");
    setNumeroRecibo("");
    setEditingPartyId(undefined);
    setPartyPhotoPreview(undefined);

    setShowNewEmployeeForm(false);
    setNewEmployeeDraft({
      firstName: "",
      lastName: "",
      document: "",
      nit: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      country: "",
      bank: "",
      bankAccount: "",
      birthDate: "",
      photoDataUrl: undefined,
    } as any);
    setEditingEmployeeId(undefined);
    setEmployeePhotoPreview(undefined);
    setReceiptEmployeeFormIndex(null);
    setSelectedCatalogProductIdState("");
    setSelectedCatalogServiceIdState("");
    setIvaPercent(16);
    setAmountOverride(false);
    setEditableAmount(0);

    setCatalogEditorInternal(null);
  }, [
    setItems,
    payrollReceipts,
    removePayrollReceipt,
    setPartyInfo,
    setShowNewPartyForm,
    setShowNewEmployeeForm,
    setEditingEmployeeId,
    setEmployeePhotoPreview,
    setReceiptEmployeeFormIndex,
  ]);

  // ---------------------------
  // SAFE wrapper for exposing setCatalogEditor
  // ---------------------------
  const setCatalogEditor = useCallback((value: any) => {
    if (
      value &&
      typeof value === "object" &&
      "docKind" in value &&
      "setDocKind" in value
    ) {
      const candidate = (value as any).catalogEditor ?? null;
      console.warn(
        "useInvoiceForm.setCatalogEditor received the full hook object — using its .catalogEditor value instead.",
        { received: value, using: candidate }
      );
      setCatalogEditorInternal(candidate);
      return;
    }

    if (value == null) {
      setCatalogEditorInternal(null);
      return;
    }

    if (
      typeof value === "object" &&
      ("kind" in value || "mode" in value || "rec" in value)
    ) {
      setCatalogEditorInternal(value);
      return;
    }

    console.warn(
      "useInvoiceForm.setCatalogEditor received unexpected value; ignoring and clearing editor.",
      value
    );
    setCatalogEditorInternal(null);
  }, []);

  // ---------------------------
  // return API
  // ---------------------------
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

    catalogEditor: catalogEditorInternal,
    setCatalogEditor,

    partyInfo,
    setPartyInfo,
    parties,
    setParties,
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

    paymentType,
    setPaymentType,
    referenceNumber,
    setReferenceNumber,

    productsCatalog,
    setProductsCatalog,
    servicesCatalog,
    setServicesCatalog,
    selectedCatalogProductId,
    setSelectedCatalogProductId: setSelectedCatalogProductIdState,
    selectedCatalogServiceId,
    setSelectedCatalogServiceId: setSelectedCatalogServiceIdState,

    items,
    setItems,
    addItem,
    addProductFromCatalog: addProductFromCatalogById,
    addServiceFromCatalog: addServiceFromCatalogById,
    updateItem,
    removeItem,
    lineTotal,
    subtotal,

    handleItemPhotosChange,
    removeItemPhoto,

    handleNewEmployeePhotoChange,
    handleRegisterAndUseEmployee,
    handleUseEmployeeWithoutRegister,
    handleRemoveEmployeeFromTray,
    handleEditEmployeeFromTray,
    handleCloneEmployeeFromTray,

    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    cloneCatalogProduct,
    createCatalogService,
    updateCatalogService,
    removeCatalogService,
    cloneCatalogService,

    productsFilteredByParty,
    servicesFilteredByParty,

    editableAmount,
    setEditableAmount,
    amountOverride,
    setAmountOverride,
    ivaAmount,
    total,
    handleSubmit,

    resetForm,

    currentRole: receiptPartyRole,
    partiesForRole,
    partyKeyActive,
    ensureCatalogsAndReturn,
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

    selectedNormalizedParty,
    updatePartyChecklist,
    toggleChecklistInDraft,
    addChecklistItemToDraft,
    removeChecklistItemFromDraft,
    toggleChecklistForParty,
    partyKeyFromParty,
  };
}