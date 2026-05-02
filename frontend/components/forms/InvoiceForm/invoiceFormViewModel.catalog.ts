import { useCallback } from "react";
import {
  buildCatalogFallbackItem,
  getPartyDisplayName,
} from "./invoiceFormViewModel.utils";
import {
  normalizeCatalogRecordForSave,
} from "./invoiceHelpers";
import {
  hasExplicitCondoTrueFlag,
  forceGeneralCatalogRecord,
} from "./invoiceForm.helpers";
import { toNumber } from "./invoiceHelpers";

export function useInvoiceCatalogActions(args: {
  productsCatalog: any[];
  propertiesCatalog: any[];
  createCatalogProduct: any;
  updateCatalogProduct: any;
  createCatalogService: any;
  updateCatalogService: any;
  createCatalogProperty: any;
  addProductFromCatalog: any;
  addItem: any;
  setActivePropertyId: React.Dispatch<React.SetStateAction<string>>;
  setShowNewPropertyForm: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCatalogPropertyId: React.Dispatch<React.SetStateAction<string>>;
  partyKey: string;
  currentTx: "venta" | "compra" | undefined;
  partyHasOwnerOrContractor: boolean;
  catalogEditor: any;
}) {
  const {
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
  } = args;

  const addProductFromCatalogAndMaybeActivate = useCallback(
    async (catalogId: string) => {
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

      const fallbackItem: any = buildCatalogFallbackItem({
        catalogId,
        prod,
        kind:
          String((prod?.kind ?? "")).toUpperCase() === "PROPERTY"
            ? "PROPERTY"
            : "PRODUCTO",
        partyKey,
      });

      addItem(fallbackItem);

      if (String(fallbackItem.kind ?? "").toUpperCase() === "PROPERTY") {
        setActivePropertyId(String(fallbackItem.meta?.propertyId ?? fallbackItem.id));
      }
    },
    [
      addItem,
      addProductFromCatalog,
      partyKey,
      productsCatalog,
      propertiesCatalog,
      setActivePropertyId,
    ]
  );

  const handleSaveCatalogRecord = useCallback(
    async ({
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
    },
    [
      catalogEditor?.rec,
      createCatalogProduct,
      createCatalogService,
      currentTx,
      partyHasOwnerOrContractor,
      partyKey,
      updateCatalogProduct,
      updateCatalogService,
    ]
  );

  const handleSaveProperty = useCallback(
    async (prop: any) => {
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
    },
    [
      addItem,
      addProductFromCatalogAndMaybeActivate,
      createCatalogProperty,
      currentTx,
      partyKey,
      setActivePropertyId,
      setSelectedCatalogPropertyId,
      setShowNewPropertyForm,
    ]
  );

  return {
    handleSaveCatalogRecord,
    handleSaveProperty,
    addProductFromCatalogAndMaybeActivate,
  };
}