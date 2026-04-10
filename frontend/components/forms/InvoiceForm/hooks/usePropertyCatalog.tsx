import { useCallback, useEffect, useRef, useState } from "react";
import { genId } from "../../../../lib/invoiceUtils";
import { INVENTORY_PROPERTY_API, CONDO_PROPERTY_API } from "./constants";

type TxType = "venta" | "compra" | null;

const DEFAULT_LOCAL_KEY = "app_property_catalog_v1";

function normalizeText(value: any): string {
  try {
    return String(value ?? "").toLowerCase().trim();
  } catch {
    return "";
  }
}

const CONTRACTOR_OWNER_KEYWORDS = [
  "contratista",
  "contratistas",
  "propietario",
  "propietarios",
  "dueño",
  "dueña",
  "dueños",
  "dueñas",
];

function objContainsKeywords(obj: any, keywords: string[]) {
  if (!obj) return false;

  const values: string[] = [];

  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (typeof v === "string") values.push(v.toLowerCase());
    else if (typeof v === "object" && v !== null) {
      try {
        values.push(JSON.stringify(v).toLowerCase());
      } catch {}
    }
  }

  for (const v of values) {
    for (const k of keywords) {
      if (v.includes(k)) return true;
    }
  }

  return false;
}

function hasOwnerOrContractorMarker(record: any) {
  if (!record) return false;

  const directFlags = [
    record?.isPropietario,
    record?.isProveedorContratista,
    record?.propietario,
    record?.contratista,
    record?.esPropietario,
    record?.esContratista,
    record?.hasPropietario,
    record?.hasContratista,
  ];
  if (directFlags.some(Boolean)) return true;

  const listCandidates = [
    record?.checklist,
    record?.meta?.checklist,
    record?.client?.checklist,
    record?.meta?.client?.checklist,
    record?.items,
    record?.tags,
  ];

  for (const list of listCandidates) {
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    for (const item of arr) {
      const txt =
        typeof item === "string"
          ? normalizeText(item)
          : normalizeText(
              item?.label ??
                item?.name ??
                item?.title ??
                item?.value ??
                item?.text ??
                JSON.stringify(item)
            );

      if (
        txt.includes("propiet") ||
        txt.includes("contrat") ||
        txt.includes("dueñ") ||
        txt.includes("dueño")
      ) {
        return true;
      }
    }
  }

  const metaText = normalizeText(record?.meta ? JSON.stringify(record.meta) : "");
  return (
    metaText.includes("propiet") ||
    metaText.includes("contrat") ||
    metaText.includes("dueñ") ||
    metaText.includes("dueño") ||
    objContainsKeywords(record, CONTRACTOR_OWNER_KEYWORDS)
  );
}

function checklistHasPropietario(list: any): boolean {
  if (!Array.isArray(list)) return false;
  return list.some((it: any) => {
    const label = normalizeText(it?.label ?? it?.name ?? it?.title ?? it?.value);
    const done = Boolean(it?.done);
    return done === true && (label.includes("propiet") || label.includes("dueñ"));
  });
}

const clientHasPropietario = (obj: any) => {
  const directFlag = Boolean(
    obj?.meta?.hasPropietario ?? obj?.hasPropietario ?? false
  );

  const client =
    obj?.meta?.client ?? obj?.client ?? obj?.meta?.cliente ?? null;

  const checklistCandidates = [
    obj?.checklist,
    client?.checklist,
    obj?.meta?.client?.checklist,
    obj?.meta?.checklist,
  ];

  for (const c of checklistCandidates) {
    if (checklistHasPropietario(c)) return true;
  }

  if (!client) return directFlag;

  const flag1 = client?.propietario || client?.propietarios;
  const flag2 = client?.propiedad || client?.esPropietario;

  return Boolean(flag1 || flag2 || directFlag);
};

function isContractorOrOwner(record: any) {
  return hasOwnerOrContractorMarker(record) || clientHasPropietario(record);
}

function validateCondoPropertyPayload(record: any) {
  if (!record) return false;

  const title = String(record?.title ?? record?.name ?? "").trim();
  if (!title) return false;

  const hasPrice =
    typeof record?.price !== "undefined" && !isNaN(Number(record.price));

  const hasAddress = Boolean(record?.address);

  return hasPrice || hasAddress;
}

async function postJson(url: string, payload: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }

  return json;
}

function normalizeCompanyId(value: any): string | undefined {
  const s = String(value ?? "").trim();
  return s === "" ? undefined : s;
}

function txToCondoTransaction(tx: TxType) {
  if (tx === "venta") return "sale";
  if (tx === "compra") return "purchase";
  return "sale";
}

function detectTxType(obj: any): TxType {
  const src = String(obj?.sourceRole ?? "").toLowerCase();

  const metaTx = String(
    obj?.meta?.transactionType ?? obj?.metadata?.transactionType ?? obj?.transaction ?? ""
  ).toLowerCase();

  if (src === "sale" || metaTx === "venta" || src === "venta") return "venta";
  if (src === "purchase" || metaTx === "compra" || src === "compra")
    return "compra";

  return null;
}

function normalizePropertyInput(p: any) {
  const id = String(p?.id ?? genId());
  const ownerId = p?.ownerId ?? null;

  const companyId = normalizeCompanyId(
    p?.companyId ?? p?.meta?.companyId ?? (ownerId ? String(ownerId) : id)
  );

  const meta = {
    ...(p?.meta ?? {}),
    companyId,
    route: p?.meta?.route ?? undefined,
  };

  return {
    id,
    kind: String(p?.kind ?? "PROPERTY").toUpperCase(),
    type: "property",
    transaction: p?.transaction ?? p?.meta?.transactionType ?? null,
    title: String(p?.title ?? p?.name ?? `Propiedad ${id}`),
    name: String(p?.name ?? p?.title ?? `Propiedad ${id}`),
    sku: p?.sku ?? null,
    price: Number(p?.price ?? 0),
    address: p?.address ?? null,
    ownerId,
    companyId,
    description: p?.description ?? null,
    category: p?.category ?? null,
    tags: Array.isArray(p?.tags)
      ? p.tags
      : typeof p?.tags === "string"
      ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [],
    bedrooms: p?.bedrooms != null ? Number(p.bedrooms) : null,
    bathrooms: p?.bathrooms != null ? Number(p.bathrooms) : null,
    areaSqm: p?.areaSqm != null ? Number(p.areaSqm) : null,
    lotSize: p?.lotSize != null ? Number(p.lotSize) : null,
    yearBuilt: p?.yearBuilt != null ? Number(p.yearBuilt) : null,
    parking: p?.parking ?? null,
    hoaFees: p?.hoaFees != null ? Number(p.hoaFees) : null,
    energyRating: p?.energyRating ?? null,
    available:
      typeof p?.available === "boolean"
        ? p.available
        : p?.available == null
        ? true
        : Boolean(p.available),
    meta,
    checklist: Array.isArray(p?.checklist) ? p.checklist : [],
    photos: Array.isArray(p?.photos) ? p.photos : [],
    documents: Array.isArray(p?.documents) ? p.documents : [],
    createdAt: p?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPropietario: Boolean(p?.isPropietario ?? p?.meta?.hasPropietario ?? p?.propietario),
    isProveedorContratista: Boolean(
      p?.isProveedorContratista ?? p?.meta?.hasContratista ?? p?.contratista
    ),
    propietario: Boolean(p?.propietario ?? p?.meta?.hasPropietario ?? p?.isPropietario),
    contratista: Boolean(p?.contratista ?? p?.meta?.hasContratista ?? p?.isProveedorContratista),
  };
}

function extractItems(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.properties)) return json.properties;
  if (Array.isArray(json?.inventory)) return json.inventory;
  return [];
}

function mergeById(base: any[], incoming: any[]) {
  const out = [...base];
  const keyOf = (x: any) => String(x?.id ?? x?.companyId ?? "");
  const existing = new Map<string, number>();

  out.forEach((item, idx) => {
    existing.set(keyOf(item), idx);
  });

  for (const item of incoming) {
    const k = keyOf(item);
    if (!k) continue;

    if (existing.has(k)) {
      const idx = existing.get(k)!;
      out[idx] = { ...out[idx], ...item };
    } else {
      existing.set(k, out.length);
      out.push(item);
    }
  }

  return out;
}

export default function useCatalogs() {
  const [propertiesCatalog, setPropertiesCatalog] = useState<any[]>([]);
  const markerCache = useRef(new WeakMap<any, boolean>());

  const savePropertiesToLocal = useCallback((arr: any[]) => {
    try {
      localStorage.setItem(DEFAULT_LOCAL_KEY, JSON.stringify(arr));
    } catch {}
  }, []);

  const readPropertiesFromLocal = useCallback((): any[] => {
    try {
      const raw = localStorage.getItem(DEFAULT_LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const isMarkedFast = useCallback((record: any) => {
    if (!record) return false;
    const cache = markerCache.current;
    if (cache.has(record)) return cache.get(record)!;

    const result = hasOwnerOrContractorMarker(record) || clientHasPropietario(record);
    cache.set(record, result);
    return result;
  }, []);

  const shouldUseCondoApi = useCallback(
    (obj: any) => {
      return isMarkedFast(obj);
    },
    [isMarkedFast]
  );

  const shouldUseInventoryApi = useCallback((obj: any) => {
    if (!obj) return false;
    if (obj?.providerId) return true;
    const src = String(obj?.sourceRole ?? "").toLowerCase();
    if (["provider", "supplier", "venta", "sale"].includes(src)) return true;
    if (obj?.meta?.sendToInventory === true) return true;
    return false;
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const [inventoryResp, condoResp] = await Promise.allSettled([
        fetch(INVENTORY_PROPERTY_API),
        fetch(CONDO_PROPERTY_API),
      ]);

      const inventoryJson =
        inventoryResp.status === "fulfilled" && inventoryResp.value.ok
          ? await inventoryResp.value.json().catch(() => ({}))
          : {};

      const condoJson =
        condoResp.status === "fulfilled" && condoResp.value.ok
          ? await condoResp.value.json().catch(() => ({}))
          : {};

      const inventoryItems = extractItems(inventoryJson).map(normalizePropertyInput);
      const condoItems = extractItems(condoJson).map(normalizePropertyInput);

      const merged = mergeById(inventoryItems, condoItems);

      setPropertiesCatalog((prev) => {
        if (!prev || prev.length === 0) {
          savePropertiesToLocal(merged);
          return merged;
        }

        const next = mergeById(prev, merged);
        savePropertiesToLocal(next);
        return next;
      });
    } catch (err) {
      console.error("[useCatalogs] fetchProperties error", err);
      const cached = readPropertiesFromLocal();
      setPropertiesCatalog(cached);
    }
  }, [readPropertiesFromLocal, savePropertiesToLocal]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const postToInventory = useCallback(async (property: any) => {
    const itemForInventory = {
      ...normalizePropertyInput(property),
      meta: {
        ...(property?.meta ?? {}),
        route: "inventory",
      },
    };

    return await postJson(INVENTORY_PROPERTY_API, {
      action: "upsert",
      item: itemForInventory,
    });
  }, []);

  const postToCondo = useCallback(async (property: any, tx: TxType) => {
    const transaction = txToCondoTransaction(tx);

    const itemForCondo = {
      ...normalizePropertyInput(property),
      transaction,
      kind: "PROPERTY",
      meta: {
        ...(property?.meta ?? {}),
        transactionType: tx ?? property?.meta?.transactionType ?? null,
        route: "condo",
        hasPropietario: Boolean(
          property?.isPropietario ??
            property?.propietario ??
            property?.meta?.hasPropietario ??
            false
        ),
        hasContratista: Boolean(
          property?.isProveedorContratista ??
            property?.contratista ??
            property?.meta?.hasContratista ??
            false
        ),
      },
      isPropietario: Boolean(
        property?.isPropietario ?? property?.propietario ?? property?.meta?.hasPropietario ?? false
      ),
      isProveedorContratista: Boolean(
        property?.isProveedorContratista ??
          property?.contratista ??
          property?.meta?.hasContratista ??
          false
      ),
      propietario: Boolean(
        property?.propietario ?? property?.isPropietario ?? property?.meta?.hasPropietario ?? false
      ),
      contratista: Boolean(
        property?.contratista ??
          property?.isProveedorContratista ??
          property?.meta?.hasContratista ??
          false
      ),
    };

    return await postJson(CONDO_PROPERTY_API, {
      action: "upsert",
      transaction,
      item: itemForCondo,
    });
  }, []);

  const syncPropertyApis = useCallback(
    async (property: any, tx: TxType) => {
      const normalized = normalizePropertyInput(property);
      const detectedTx = tx ?? detectTxType(normalized);

      const useCondo = shouldUseCondoApi(normalized);
      const useInventory = shouldUseInventoryApi(normalized) || !useCondo;

      const ops: Promise<any>[] = [];

      if (useCondo) {
        if (!validateCondoPropertyPayload(normalized)) {
          console.warn(
            "[useCatalogs] propiedad detectada para CONDO API pero no cumple validación mínima"
          );
        } else {
          ops.push(postToCondo(normalized, detectedTx ?? "venta"));
        }
      }

      if (useInventory) {
        ops.push(postToInventory(normalized));
      }

      await Promise.allSettled(ops);
      return normalized;
    },
    [postToCondo, postToInventory, shouldUseCondoApi, shouldUseInventoryApi]
  );

  const createCatalogProperty = useCallback(
    async (rec: any) => {
      const newItem = normalizePropertyInput(rec);
      const tx = detectTxType(newItem);

      setPropertiesCatalog((prev) => {
        const exists = prev.some((p) => String(p.id) === String(newItem.id));

        const next = exists
          ? prev.map((x) =>
              String(x.id) === String(newItem.id)
                ? { ...x, ...newItem, updatedAt: new Date().toISOString() }
                : x
            )
          : [newItem, ...prev];

        savePropertiesToLocal(next);
        return next;
      });

      try {
        await syncPropertyApis(newItem, tx);
      } catch (e) {
        console.warn("[useCatalogs] createCatalogProperty sync failed", e);
      }

      return newItem;
    },
    [savePropertiesToLocal, syncPropertyApis]
  );

  const updateCatalogProperty = useCallback(
    async (rec: any) => {
      if (!rec || !rec.id) return null;

      const updated = normalizePropertyInput(rec);
      const tx = detectTxType(updated);

      setPropertiesCatalog((prev) => {
        const exists = prev.some((p) => String(p.id) === String(updated.id));
        let next: any[];

        if (exists) {
          next = prev.map((p) =>
            String(p.id) === String(updated.id)
              ? { ...p, ...updated, updatedAt: new Date().toISOString() }
              : p
          );
        } else {
          next = [updated, ...prev];
        }

        savePropertiesToLocal(next);
        return next;
      });

      try {
        await syncPropertyApis(updated, tx);
      } catch (e) {
        console.warn("[useCatalogs] updateCatalogProperty sync failed", e);
      }

      return updated;
    },
    [savePropertiesToLocal, syncPropertyApis]
  );

  const removeCatalogProperty = useCallback(async (id: string) => {
    if (!id) return;

    try {
      await Promise.allSettled([
        postJson(INVENTORY_PROPERTY_API, { action: "delete", id }),
        postJson(CONDO_PROPERTY_API, { action: "delete", id }),
      ]);
    } catch {}

    setPropertiesCatalog((p) => {
      const next = p.filter((x) => String(x.id) !== String(id));
      savePropertiesToLocal(next);
      return next;
    });
  }, [savePropertiesToLocal]);

  const cloneCatalogProperty = useCallback(
    async (source: string | any) => {
      const srcRec =
        typeof source === "string"
          ? propertiesCatalog.find((p) => String(p.id) === String(source))
          : source;

      if (!srcRec) return null;

      const cloned = normalizePropertyInput({
        ...srcRec,
        id: String(genId()),
        title: `${srcRec.title ?? "Propiedad"} (copia)`,
        name: `${srcRec.name ?? srcRec.title ?? "Propiedad"} (copia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setPropertiesCatalog((prev) => {
        const next = [cloned, ...prev];
        savePropertiesToLocal(next);
        return next;
      });

      const tx = detectTxType(cloned);

      try {
        await syncPropertyApis(cloned, tx);
      } catch (e) {
        console.warn("[useCatalogs] cloneCatalogProperty sync failed", e);
      }

      return cloned;
    },
    [propertiesCatalog, savePropertiesToLocal, syncPropertyApis]
  );

  return {
    propertiesCatalog,
    setPropertiesCatalog,
    createCatalogProperty,
    updateCatalogProperty,
    removeCatalogProperty,
    cloneCatalogProperty,
    fetchProperties,
  };
}