// hooks/useProductsCatalog.tsx
import { useCallback, useEffect, useState } from "react";
import { genId } from "../../../../lib/invoiceUtils";
import { LOCAL_INV_KEY, INVENTORY_API } from "./constants";
import { apiPostJson } from "./catalogHelpers";
import useInternalManagement from "./useInternalManagement";

type TxType = "venta" | "compra" | null;

export default function useProductsCatalog() {
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
  const { createRecord: createInternalRecord } = useInternalManagement();

  const saveProductsToLocal = (arr: any[]) => {
    try { localStorage.setItem(LOCAL_INV_KEY, JSON.stringify(arr)); } catch (err) { /* ignore */ }
  };

  const readProductsFromLocal = (): any[] => {
    try {
      const raw = localStorage.getItem(LOCAL_INV_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const normalizeItem = (p: any) => {
    const id = String(p.id ?? genId());
    const providerId = p.providerId ?? null;
    const companyId = p.companyId ?? (providerId ? String(providerId) : "");
    return {
      id,
      name: p.name,
      sku: p.sku ?? null,
      price: Number(p.price ?? 0),
      quantity: Number(p.quantity ?? 0),
      providerId,
      sourceRole: p.sourceRole ?? null,
      companyId,
      category: p.category ?? null,
      specs: p.specs ?? {},
      photos: p.photos ?? [],
      meta: p.meta ?? {},
      createdAt: p.createdAt ?? new Date().toISOString(),
      updatedAt: p.updatedAt ?? new Date().toISOString(),
    };
  };

  const detectTxType = (obj: any): TxType => {
    const src = String(obj?.sourceRole ?? "").toLowerCase();
    const metaTx = String(obj?.meta?.transactionType ?? "").toLowerCase();
    if (src === "sale" || metaTx === "venta") return "venta";
    if (src === "purchase" || metaTx === "compra") return "compra";
    return null;
  };

  const fetchProducts = useCallback(async () => {
    const controller = new AbortController();
    try {
      const res = await fetch(INVENTORY_API, { signal: controller.signal });
      if (res.ok) {
        const json = await res.json();
        const prods = Array.isArray(json?.inventory) ? json.inventory : Array.isArray(json) ? json : [];
        const normalized = prods.map(normalizeItem);

        setProductsCatalog((prev) => {
          if (!prev || prev.length === 0) {
            saveProductsToLocal(normalized);
            return normalized;
          }
          const next = [...prev];
          const existingIds = new Set(next.map((x) => String(x.id)));
          for (const n of normalized) {
            if (!existingIds.has(String(n.id))) {
              next.push(n);
              existingIds.add(String(n.id));
            } else {
              const idx = next.findIndex((it) => String(it.id) === String(n.id));
              if (idx >= 0) next[idx] = { ...next[idx], ...n };
            }
          }
          saveProductsToLocal(next);
          return next;
        });
      } else {
        const cached = readProductsFromLocal();
        setProductsCatalog(cached);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("[useProductsCatalog] fetchProducts error", err);
      const cached = readProductsFromLocal();
      setProductsCatalog(cached);
    } finally {
      controller.abort();
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* Helper para crear registro interno (internal-management) */
  const createInternalManagementRecord = useCallback(async (product: any, txType: "compra" | "venta" | string) => {
    if (!product) return;
    try {
      const item = {
        name: `${txType === "compra" ? "Compra" : txType === "venta" ? "Venta" : "Movimiento"}: ${product.name ?? "Producto"}`,
        details: {
          productId: product.id,
          sku: product.sku ?? null,
          providerId: product.providerId ?? null,
          companyId: product.companyId ?? null,
          quantity: Number(product.quantity ?? 0),
          price: Number(product.price ?? 0),
          meta: product.meta ?? {},
        }
      };

      const payload = {
        referenceId: String(product.id ?? ""),
        item,
        meta: {
          autoCreatedBy: "useProductsCatalog",
          transactionType: String(txType).toLowerCase(),
          createdAt: new Date().toISOString(),
        }
      };

      console.log("[createInternalManagementRecord] POST to internal-management", payload);
      await createInternalRecord(payload);
      console.log("[createInternalManagementRecord] internal-management createRecord finished", product.id);
    } catch (e) {
      console.warn("[useProductsCatalog] createInternalManagementRecord failed", e);
    }
  }, [createInternalRecord]);

  /* CREATE product - ahora siempre inserta/actualiza en el state local para que se vea inmediatamente */
  const createCatalogProduct = useCallback(async (rec: any) => {
    const newItem = normalizeItem(rec);
    const tx = detectTxType(newItem);

    // Logs solicitados
    console.log("CREATE PRODUCT CALLED", newItem);
    console.log("TX DETECTED:", tx);

    // <-- Cambio principal: asegurarnos que el producto quede guardado localmente siempre (o actualizado),
    // para que aparezca inmediatamente en los selectores del formulario.
    setProductsCatalog((prev) => {
      const exists = prev.some((p) => String(p.id) === String(newItem.id));
      if (exists) {
        const next = prev.map((x) => (String(x.id) === String(newItem.id) ? { ...x, ...newItem, updatedAt: new Date().toISOString() } : x));
        saveProductsToLocal(next);
        return next;
      } else {
        const next = [newItem, ...prev];
        saveProductsToLocal(next);
        return next;
      }
    });

    // Ahora hacemos los efectos secundarios según tx:
    if (tx === "venta") {
      // side-effect: upsert to inventory
      try {
        console.log("[createCatalogProduct] calling INVENTORY_API upsert", newItem.id);
        const r = await apiPostJson(INVENTORY_API, { action: "upsert", item: newItem });
        console.log("[createCatalogProduct] INVENTORY_API result", r);
      } catch (e) {
        console.warn("[useProductsCatalog] createCatalogProduct - upsert inventory failed", e);
      }

      return newItem;
    } else if (tx === "compra") {
      // create in internal-management (no inventory upsert), but we've already added to local state above
      try {
        console.log("[createCatalogProduct] calling INTERNAL_MANAGEMENT_API createRecord", newItem.id);
        await createInternalManagementRecord(newItem, "compra");
        console.log("[createCatalogProduct] internal-management record created for", newItem.id);
      } catch (e) {
        console.warn("[useProductsCatalog] createCatalogProduct - create internal-management failed", e);
      }
      return newItem;
    } else {
      console.log("[createCatalogProduct] No tx detected - persisted locally only", newItem);
      return newItem;
    }
  }, [createInternalManagementRecord]);

  /**
   * UPDATE product
   * - si patch indica venta -> upsert inventory + asegurar en productsCatalog
   * - si patch indica compra -> delete inventory (si existe) + crear registro interno + remover del state
   * - si patch no indica tx -> si existe en cache local hacer upsert condicional
   */
  const updateCatalogProduct = useCallback(async (id: string, patch: Partial<any>) => {
    console.log("UPDATE PRODUCT CALLED", id, patch);
    const patchTx = detectTxType(patch);
    console.log("PATCH TX:", patchTx);

    // update local state (pure)
    setProductsCatalog((p) => {
      const next = p.map((x) => (String(x.id) === String(id) ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x));
      saveProductsToLocal(next);
      return next;
    });

    try {
      if (patchTx === "venta") {
        console.log("[updateCatalogProduct] -> upsert to INVENTORY_API", id);
        const raw = readProductsFromLocal();
        const found = raw.find((it) => String(it.id) === String(id));
        const itemToUpsert = found ? { ...found, ...patch, updatedAt: new Date().toISOString() } : { id, ...patch, updatedAt: new Date().toISOString() };
        const normalized = normalizeItem(itemToUpsert);
        try {
          const res = await apiPostJson(INVENTORY_API, { action: "upsert", item: normalized });
          console.log("[updateCatalogProduct] INVENTORY upsert response", res);
        } catch (e) {
          console.warn("[useProductsCatalog] updateCatalogProduct -> venta upsert failed", e);
        }

        // ensure in local state
        setProductsCatalog((prev) => {
          if (prev.some((x) => String(x.id) === String(normalized.id))) {
            return prev.map((x) => (String(x.id) === String(normalized.id) ? { ...x, ...normalized } : x));
          } else {
            const next = [normalized, ...prev];
            saveProductsToLocal(next);
            return next;
          }
        });
      } else if (patchTx === "compra") {
        console.log("[updateCatalogProduct] -> delete from INVENTORY_API (if exists)", id);
        try {
          await apiPostJson(INVENTORY_API, { action: "delete", id });
          console.log("[updateCatalogProduct] INVENTORY delete attempted for", id);
        } catch (e) {
          console.warn("[useProductsCatalog] updateCatalogProduct -> inventory delete failed (may not exist)", e);
        }

        // remove locally
        setProductsCatalog((prev) => {
          const next = prev.filter((x) => String(x.id) !== String(id));
          saveProductsToLocal(next);
          return next;
        });

        // create internal-management snapshot
        try {
          const raw = readProductsFromLocal();
          const found = raw.find((it) => String(it.id) === String(id));
          const snapshot = found ? { ...found, ...patch } : { id, ...patch };
          await createInternalManagementRecord(normalizeItem(snapshot), "compra");
          console.log("[updateCatalogProduct] internal-management record created for", id);
        } catch (e) {
          console.warn("[useProductsCatalog] updateCatalogProduct -> create internal-management failed", e);
        }
      } else {
        console.log("[updateCatalogProduct] no tx change - conditional upsert if in local cache", id);
        const raw = readProductsFromLocal();
        const found = raw.find((it) => String(it.id) === String(id));
        if (found) {
          const upsert = normalizeItem({ ...found, ...patch, updatedAt: new Date().toISOString() });
          try {
            const res = await apiPostJson(INVENTORY_API, { action: "upsert", item: upsert });
            console.log("[updateCatalogProduct] conditional INVENTORY upsert response", res);
            setProductsCatalog((prev) => prev.map((x) => (String(x.id) === String(id) ? { ...x, ...upsert } : x)));
          } catch (e) {
            console.warn("[useProductsCatalog] updateCatalogProduct -> conditional upsert failed", e);
          }
        } else {
          console.log("[updateCatalogProduct] item not present in local cache - nothing pushed", id);
        }
      }
    } catch (err) {
      console.warn("[useProductsCatalog] updateCatalogProduct error", err);
    }
  }, [createInternalManagementRecord]);

  const removeCatalogProduct = useCallback(async (id: string) => {
    console.log("[removeCatalogProduct] called", id);
    try {
      const res = await apiPostJson(INVENTORY_API, { action: "delete", id });
      console.log("[removeCatalogProduct] INVENTORY delete response", res);
    } catch (e) {
      console.warn("[removeCatalogProduct] server delete failed (maybe not present)", e);
    }
    setProductsCatalog((p) => {
      const next = p.filter((x) => String(x.id) !== String(id));
      saveProductsToLocal(next);
      return next;
    });
  }, []);

  const cloneCatalogProduct = useCallback(async (id: string) => {
    console.log("[cloneCatalogProduct] called", id);
    const found = productsCatalog.find((x) => String(x.id) === String(id));
    if (!found) return;
    const clone = {
      ...JSON.parse(JSON.stringify(found)),
      id: genId(),
      name: `${found.name ?? "Producto"} (copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProductsCatalog((p) => {
      if (p.some((x) => String(x.id) === String(clone.id))) return p;
      const next = [clone, ...p];
      saveProductsToLocal(next);
      return next;
    });

    const tx = detectTxType(found);
    if (tx === "venta") {
      try {
        const res = await apiPostJson(INVENTORY_API, { action: "upsert", item: clone });
        console.log("[cloneCatalogProduct] INVENTORY upsert response", res);
      } catch (e) {
        console.warn("[cloneCatalogProduct] clone - server upsert failed", e);
      }
    } else if (tx === "compra") {
      try {
        await createInternalManagementRecord(clone, "compra");
        console.log("[cloneCatalogProduct] internal-management record created for clone", clone.id);
      } catch (e) {
        console.warn("[cloneCatalogProduct] clone - create internal-management failed", e);
      }
    }
  }, [productsCatalog, createInternalManagementRecord]);

  return {
    productsCatalog,
    setProductsCatalog,
    createCatalogProduct,
    updateCatalogProduct,
    removeCatalogProduct,
    cloneCatalogProduct,
    fetchProducts,
  };
}
