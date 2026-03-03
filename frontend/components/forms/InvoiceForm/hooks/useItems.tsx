// hooks/useItems.tsx
import { useCallback, useState } from "react";
import { genId, readFileAsDataUrl, defaultLineTotal, ALL_ITEM_TYPES, ITEM_TYPE_MAP, resolveAccountForItem } from "../../../../lib/invoiceUtils";
import type { InvoiceItem, InvoicePhoto, ItemKind } from "../../../../types/invoice";

/**
 * useItems
 * - mantiene items[] con ids garantizados
 * - handlers de fotos (usa fileKey consistente como preview.id)
 * - add/update/remove items
 * - mapea producto/servicio a item state (consistente)
 *
 * Cambios: se eliminaron todas las referencias a "master".
 */
type ItemState = InvoiceItem & { __files?: File[] };

export default function useItems(initialItems?: InvoiceItem[]) {
  const initItems = (): ItemState[] => {
    const raw = (initialItems ?? []) as ItemState[];
    return raw.map((it) => ({
      ...it,
      id: it.id ?? genId(),
      photos: it.photos ?? [],
      __files: (it as any).__files ?? [],
      kind: it.kind ?? "ARTICULO",
      type: it.type ?? ALL_ITEM_TYPES[0],
      subtype: it.subtype ?? ITEM_TYPE_MAP[ALL_ITEM_TYPES[0]].subtypes[0]?.value ?? "",
      model: it.model ?? "",
      size: it.size ?? "",
      specs: it.specs ?? {},
      accountId: it.accountId ?? resolveAccountForItem(it),
    }));
  };

  const [items, setItems] = useState<ItemState[]>(initItems);

  const lineTotal = useCallback((it: InvoiceItem) => defaultLineTotal(it), []);

  const addItem = useCallback((kind: ItemKind = "ARTICULO") => {
    const newItem: ItemState = {
      id: genId(),
      kind,
      type: ALL_ITEM_TYPES[0],
      subtype: ITEM_TYPE_MAP[ALL_ITEM_TYPES[0]].subtypes[0]?.value ?? "",
      name: kind === "SERVICIO" ? "Nuevo servicio" : "",
      sku: "",
      quantity: kind === "SERVICIO" ? 0 : 1,
      unitPrice: 0,
      serviceDescription: "",
      hours: 1,
      rate: 0,
      model: "",
      size: "",
      specs: {},
      photos: [],
      __files: [],
      category: kind === "SERVICIO" ? "INGRESO" : undefined,
      accountId: resolveAccountForItem({ kind }),
    };
    setItems((p) => [...p, newItem]);
    return newItem;
  }, []);

  const updateItem = useCallback((idx: number, patch: Partial<ItemState>) => {
    setItems((p) => {
      const copy = [...p];
      const prev = copy[idx];
      if (!prev) return copy;
      const merged = { ...prev, ...patch };
      merged.accountId = merged.accountId ?? prev.accountId ?? resolveAccountForItem(merged);
      copy[idx] = merged;
      return copy;
    });
  }, []);

  const removeItem = useCallback((idx: number) => setItems((p) => p.filter((_, i) => i !== idx)), []);

  const handleItemPhotosChange = useCallback(async (index: number, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const withPreviews = await Promise.all(
      arr.map(async (f) => {
        const key = `${f.name}_${f.size}_${(f as any).lastModified}`;
        const dataUrl = (await readFileAsDataUrl(f)) ?? undefined;
        const preview: InvoicePhoto = { id: key, name: f.name, dataUrl };
        return { file: f, preview };
      })
    );

    setItems((prev) => {
      const copy = [...prev];
      const cur = copy[index] ?? {
        id: genId(),
        type: ALL_ITEM_TYPES[0],
        subtype: ITEM_TYPE_MAP[ALL_ITEM_TYPES[0]].subtypes[0]?.value ?? "",
        name: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        photos: [],
        __files: [],
        specs: {},
      } as ItemState;

      const existingKeys = new Set((cur.__files ?? []).map((f: File) => `${f.name}_${f.size}_${(f as any).lastModified}`));
      const toAdd = withPreviews.filter((wp) => !existingKeys.has(wp.preview.id));

      if (toAdd.length === 0) {
        if (copy[index]) return copy;
        copy[index] = cur;
        return copy;
      }

      cur.__files = [...(cur.__files ?? []), ...toAdd.map((t) => t.file)];
      const combinedPhotos = [...(cur.photos ?? []), ...toAdd.map((t) => t.preview)];
      const mapById = new Map<string, InvoicePhoto>();
      for (const p of combinedPhotos) {
        mapById.set(p.id, p);
      }
      cur.photos = Array.from(mapById.values());
      copy[index] = cur;
      return copy;
    });
  }, []);

  const removeItemPhoto = useCallback((index: number, photoId: string) => {
    setItems((p) => {
      const copy = [...p];
      const cur = copy[index];
      if (!cur) return p;
      const nextPhotos = (cur.photos ?? []).filter((pp) => pp.id !== photoId);
      let nextFiles = cur.__files ?? [];
      nextFiles = nextFiles.filter((f) => {
        const key = `${f.name}_${f.size}_${(f as any).lastModified}`;
        return key !== photoId;
      });
      copy[index] = { ...cur, photos: nextPhotos, __files: nextFiles };
      return copy;
    });
  }, []);

  /* mapping helpers for product/service -> item */
  const getDefaultAccountId = useCallback((docKind?: string, invoiceType?: string, receiptPartyRole?: string) => {
    // keep simple default
    return resolveAccountForItem({});
  }, []);

  const mapProductToItemState = useCallback((prod: any): ItemState => ({
    id: genId(),
    kind: "ARTICULO",
    type: prod.type ?? ALL_ITEM_TYPES[0],
    subtype: prod.subtype ?? ITEM_TYPE_MAP[ALL_ITEM_TYPES[0]].subtypes[0]?.value ?? "",
    name: prod.name ?? "Producto",
    sku: prod.sku ?? "",
    quantity: 1,
    unitPrice: Number(prod.price ?? prod.unitPrice ?? 0),
    model: prod.model ?? "",
    size: prod.size ?? "",
    specs: { ...(prod.specs ?? {}), companyId: prod.companyId ?? undefined },
    photos: prod.photos ?? [],
    __files: [],
    category: prod.category ?? undefined,
    accountId: getDefaultAccountId(),
    catalogId: prod.id ?? undefined,
  }), [getDefaultAccountId]);

  const mapServiceToItemState = useCallback((svc: any): ItemState => ({
    id: genId(),
    kind: "SERVICIO",
    type: svc.type ?? ALL_ITEM_TYPES[0],
    subtype: svc.subtype ?? ITEM_TYPE_MAP[ALL_ITEM_TYPES[0]].subtypes[0]?.value ?? "",
    name: svc.name ?? "Servicio",
    serviceDescription: svc.description ?? svc.serviceDescription ?? "",
    hours: svc.hours ?? 1,
    rate: Number(svc.rate ?? svc.defaultRate ?? 0),
    quantity: svc.hours ?? 1,
    unitPrice: svc.rate ?? svc.defaultRate ?? 0,
    model: svc.model ?? "",
    size: svc.size ?? "",
    specs: { ...(svc.specs ?? {}), companyId: svc.companyId ?? undefined },
    photos: svc.photos ?? [],
    __files: [],
    category: svc.category ?? "INGRESO",
    accountId: getDefaultAccountId(),
    catalogId: svc.id ?? undefined,
  }), [getDefaultAccountId]);

  const addProductFromCatalog = useCallback((prod: any) => {
    if (!prod) return;
    setItems((p) => [...p, mapProductToItemState(prod)]);
  }, [mapProductToItemState]);

  const addServiceFromCatalog = useCallback((svc: any) => {
    if (!svc) return;
    setItems((p) => [...p, mapServiceToItemState(svc)]);
  }, [mapServiceToItemState]);

  return {
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
  };
}
