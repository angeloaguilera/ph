import { useCallback, useEffect, useState } from "react";
import { genId } from "../../../../lib/invoiceUtils";
import { INVENTORY_API, CONDO_ARTICLE_API } from "./constants";
import { apiPostJson } from "./catalogHelpers";
import useInternalManagement from "./useInternalManagement";

type TxType = "venta" | "compra" | null;

const LOCAL_INV_KEY_INLINE = "admin_inventory_v1";

const CONTRACTOR_OWNER_KEYWORDS = [
  "contratista",
  "contratistas",
  "propietario",
  "propietarios",
  "propietaria",
  "propietarias",
  "dueño",
  "dueña",
  "owner",
  "owners",
  "proprietario",
  "proprietaria",
  "propiedad",
  "inmueble",
  "condominio",
  "condo",
];

const PROPERTY_KEYWORDS = [
  "inmueble",
  "propiedad",
  "property",
  "inmuebles",
  "apartamento",
  "terreno",
  "condominio",
  "condominios",
  "casa",
  "lote",
];

type AnyRecord = Record<string, any>;

function isPlainObject(value: any): value is AnyRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toStr(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function normalizeChecklist(raw: any): any[] {
  if (!Array.isArray(raw)) {
    if (raw === null || raw === undefined || raw === "") return [];
    return [raw];
  }

  const mapped = raw
    .filter((x) => x !== null && x !== undefined)
    .map((x) => (typeof x === "string" ? x.trim() : x))
    .filter((x) => (typeof x === "string" ? x.length > 0 : true));

  const uniq = Array.from(
    new Map(mapped.map((m) => [JSON.stringify(m), m])).values()
  );

  return uniq;
}

function collectTextDeep(input: any, out: string[] = [], depth = 0): string[] {
  if (input === null || input === undefined || depth > 4) return out;

  if (
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    out.push(String(input).toLowerCase());
    return out;
  }

  if (Array.isArray(input)) {
    for (const item of input) collectTextDeep(item, out, depth + 1);
    return out;
  }

  if (typeof input === "object") {
    for (const [k, v] of Object.entries(input)) {
      if (typeof k === "string") out.push(k.toLowerCase());
      collectTextDeep(v, out, depth + 1);
    }
  }

  return out;
}

function objContainsKeywords(obj: any, keywords: string[]) {
  if (!obj) return false;

  const texts: string[] = [];
  collectTextDeep(obj, texts);

  if (obj?.checklist) {
    collectTextDeep(normalizeChecklist(obj.checklist), texts);
  }

  const flags = [
    "isPropietario",
    "isProveedorContratista",
    "propietario",
    "contratista",
  ];
  for (const f of flags) {
    const v = obj?.[f];
    if (typeof v === "boolean" && v) texts.push(f.toLowerCase());
    if (typeof v === "string") texts.push(v.toLowerCase());
  }

  const flat = texts.join(" ").toLowerCase();
  return keywords.some((kw) => flat.includes(kw));
}

function isContractorOrOwner(record?: any) {
  try {
    return objContainsKeywords(record, CONTRACTOR_OWNER_KEYWORDS);
  } catch {
    return false;
  }
}

function isPropertyRecord(record?: any) {
  try {
    return objContainsKeywords(record, PROPERTY_KEYWORDS);
  } catch {
    return false;
  }
}

function decideApiParaRegistro(record?: any): string {
  try {
    if (isContractorOrOwner(record)) {
      return CONDO_ARTICLE_API.replace(/\/$/, "");
    }
  } catch {}
  return INVENTORY_API;
}

function mapTxToCondoTransaction(
  tx: TxType | string | null
): "sale" | "purchase" {
  const t = String(tx ?? "").toLowerCase();

  if (t === "venta" || t === "sale") return "sale";
  if (t === "compra" || t === "purchase") return "purchase";

  return "sale";
}

function detectCondoType(record: any): "product" | "service" | "property" {
  if (String(record?.type ?? "").toLowerCase() === "property") return "property";
  if (String(record?.category ?? "").toLowerCase() === "property")
    return "property";
  if (isPropertyRecord(record)) return "property";
  if (String(record?.meta?.resourceType ?? "").toLowerCase() === "property")
    return "property";

  if (
    typeof record?.sku !== "undefined" ||
    typeof record?.price !== "undefined"
  )
    return "product";

  if (
    typeof record?.serviceCode !== "undefined" ||
    String(record?.category ?? "").toLowerCase().includes("servicio")
  ) {
    return "service";
  }

  return "product";
}

function isCondoUrl(url: string) {
  return String(url ?? "").replace(/\/$/, "") === CONDO_ARTICLE_API.replace(/\/$/, "");
}

function readStoredUserIdentifier(): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;

    const keys = [
      "currentUser",
      "user",
      "authUser",
      "sessionUser",
      "auth",
      "session",
      "profile",
    ];

    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);

        if (typeof parsed === "string" && parsed.trim()) return parsed.trim();

        if (isPlainObject(parsed)) {
          const candidates = [
            parsed.id,
            parsed._id,
            parsed.userId,
            parsed.user_id,
            parsed.email,
            parsed.username,
            parsed.name,
          ];

          for (const c of candidates) {
            if (typeof c === "string" && c.trim()) return c.trim();
            if (typeof c === "number" && Number.isFinite(c)) return String(c);
          }
        }

        if (typeof raw === "string" && raw.trim()) {
          return raw.trim();
        }
      } catch {
        if (typeof raw === "string" && raw.trim()) return raw.trim();
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function resolveApprovedBy(source: any): string {
  const candidates = [
    source?.approvedBy,
    source?.userId,
    source?.user_id,
    source?.user?.id,
    source?.user?.email,
    source?.meta?.approvedBy,
    source?.meta?.approved_by,
    source?.meta?.approvedById,
    source?.meta?.approved_by_id,
    source?.meta?.checklist?.approvedBy,
    source?.meta?.checklist?.approved_by,
    source?.checklist?.approvedBy,
    source?.checklist?.approved_by,
    readStoredUserIdentifier(),
    "system",
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return "system";
}

function attachChecklistApproval(record: AnyRecord): AnyRecord {
  const next: AnyRecord = { ...record };

  const approvedBy = resolveApprovedBy(next);

  if (!isPlainObject(next.meta)) {
    next.meta = {};
  }

  if (Array.isArray(next.checklist)) {
    next.checklist = {
      approved: true,
      approvedBy,
      items: next.checklist,
    };
  } else if (isPlainObject(next.checklist)) {
    next.checklist.approved = true;
    next.checklist.approvedBy =
      next.checklist.approvedBy || next.checklist.approved_by || approvedBy;
  } else {
    next.checklist = {
      approved: true,
      approvedBy,
    };
  }

  if (Array.isArray(next.meta.checklist)) {
    next.meta.checklist = {
      approved: true,
      approvedBy,
      items: next.meta.checklist,
    };
  } else if (isPlainObject(next.meta.checklist)) {
    next.meta.checklist.approved = true;
    next.meta.checklist.approvedBy =
      next.meta.checklist.approvedBy ||
      next.meta.checklist.approved_by ||
      approvedBy;
  } else {
    next.meta.checklist = {
      approved: true,
      approvedBy,
    };
  }

  next.approvedBy = next.approvedBy || approvedBy;

  return next;
}

function validateCondoPayload(record: any): boolean {
  if (!record) return false;

  const name = String(record?.name ?? "").trim();
  if (!name) return false;

  const hasSku = typeof record?.sku !== "undefined" && String(record?.sku) !== "";
  const hasPrice =
    typeof record?.price !== "undefined" && !isNaN(Number(record.price));
  const hasServiceCode =
    typeof record?.serviceCode !== "undefined" && String(record.serviceCode) !== "";
  const isProperty = detectCondoType(record) === "property";

  return !!(hasSku || hasPrice || hasServiceCode || isProperty || name);
}

function normalizeItem(p: any) {
  const id = String(p?.id ?? genId());
  const providerId = p?.providerId ?? null;
  const companyId = p?.companyId ?? (providerId ? String(providerId) : "");

  const checklist = normalizeChecklist(p?.checklist);

  return {
    id,
    name: p?.name ?? "",
    sku: p?.sku ?? null,
    price: Number(p?.price ?? 0),
    quantity: Number(p?.quantity ?? 0),
    providerId,
    sourceRole: p?.sourceRole ?? null,
    companyId,
    category: p?.category ?? null,
    type: p?.type ?? null,
    description: p?.description ?? "",
    details: p?.details ?? {},
    owner: p?.owner ?? null,
    ownerType: p?.ownerType ?? null,
    specs: p?.specs ?? {},
    photos: p?.photos ?? [],
    meta: {
      ...(p?.meta ?? {}),
      checklist: {
        ...(isPlainObject(p?.meta?.checklist) ? p.meta.checklist : {}),
        approved: true,
        approvedBy:
          p?.meta?.checklist?.approvedBy ||
          p?.meta?.checklist?.approved_by ||
          resolveApprovedBy(p),
      },
    },
    checklist,
    isPropietario: p?.isPropietario ?? false,
    isProveedorContratista: p?.isProveedorContratista ?? false,
    propietario: p?.propietario ?? false,
    contratista: p?.contratista ?? false,
    createdAt: p?.createdAt ?? new Date().toISOString(),
    updatedAt: p?.updatedAt ?? new Date().toISOString(),
  };
}

async function postToApiAdaptive(url: string, action: string, payload: any) {
  if (isCondoUrl(url)) {
    if (action === "delete") {
      return apiPostJson(url, {
        action: "delete",
        id: payload?.id ?? payload,
      });
    }

    const transaction = mapTxToCondoTransaction(
      payload?.meta?.transactionType ??
        payload?.transaction ??
        payload?.meta?.tx ??
        payload?.sourceRole ??
        null
    );

    const condoData = attachChecklistApproval(payload);

    const body = {
      action: action === "upsert" ? "upsert" : action,
      transaction,
      data: condoData,
      checklist: condoData.checklist,
      approvedBy: condoData.approvedBy,
      meta: condoData.meta,
    };

    console.debug("[useProductsCatalog] POST CONDO_ARTICLE_API ->", body);
    return apiPostJson(url, body);
  }

  if (action === "delete") {
    return apiPostJson(url, { action: "delete", id: payload?.id ?? payload });
  }

  return apiPostJson(url, {
    action: action === "upsert" ? "upsert" : action,
    item: payload,
  });
}

export default function useProductsCatalog() {
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);
  const { createRecord: createInternalRecord } = useInternalManagement();

  const saveProductsToLocal = (arr: any[]) => {
    try {
      localStorage.setItem(LOCAL_INV_KEY_INLINE, JSON.stringify(arr));
    } catch {}
  };

  const readProductsFromLocal = (): any[] => {
    try {
      const raw = localStorage.getItem(LOCAL_INV_KEY_INLINE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const fetchProducts = useCallback(async () => {
    const controller = new AbortController();

    try {
      const res = await fetch(INVENTORY_API, { signal: controller.signal });

      if (res.ok) {
        const json = await res.json().catch(() => null);

        const prods = Array.isArray(json?.inventory)
          ? json.inventory
          : Array.isArray(json)
          ? json
          : [];

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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const detectTxType = (obj: any): TxType => {
    const src = String(obj?.sourceRole ?? "").toLowerCase();
    const metaTx = String(obj?.meta?.transactionType ?? "").toLowerCase();

    if (src === "sale" || metaTx === "venta" || metaTx === "sale") return "venta";
    if (src === "purchase" || metaTx === "compra" || metaTx === "purchase")
      return "compra";

    return null;
  };

  const createInternalManagementRecord = useCallback(
    async (product: any, txType: "compra" | "venta" | string) => {
      if (!product) return;

      try {
        const item = {
          name:
            txType === "compra"
              ? `Compra: ${product.name ?? "Producto"}`
              : txType === "venta"
              ? `Venta: ${product.name ?? "Producto"}`
              : `Movimiento: ${product.name ?? "Producto"}`,
          details: {
            productId: product.id,
            sku: product.sku ?? null,
            providerId: product.providerId ?? null,
            companyId: product.companyId ?? null,
            quantity: Number(product.quantity ?? 0),
            price: Number(product.price ?? 0),
            meta: product.meta ?? {},
            checklist: product.checklist ?? [],
          },
        };

        const payload = {
          referenceId: String(product.id ?? ""),
          item,
          meta: {
            autoCreatedBy: "useProductsCatalog",
            transactionType: String(txType).toLowerCase(),
            createdAt: new Date().toISOString(),
          },
        };

        await createInternalRecord(payload);
      } catch (e) {
        console.warn(
          "[useProductsCatalog] createInternalManagementRecord failed",
          e
        );
      }
    },
    [createInternalRecord]
  );

  const createCatalogProduct = useCallback(
    async (rec: any) => {
      const postUrl = decideApiParaRegistro(rec);
      const newItem = normalizeItem(rec);
      const tx = detectTxType(newItem);

      setProductsCatalog((prev) => {
        const exists = prev.some((p) => String(p.id) === String(newItem.id));

        if (exists) {
          const next = prev.map((x) =>
            String(x.id) === String(newItem.id)
              ? { ...x, ...newItem, updatedAt: new Date().toISOString() }
              : x
          );

          saveProductsToLocal(next);
          return next;
        } else {
          const next = [newItem, ...prev];
          saveProductsToLocal(next);
          return next;
        }
      });

      console.debug("[useProductsCatalog] createCatalogProduct", {
        id: newItem.id,
        name: newItem.name,
        checklist: newItem.checklist,
        approvedBy: newItem.meta?.checklist?.approvedBy,
        isContractorOrOwner: isContractorOrOwner(rec) || isContractorOrOwner(newItem),
        postUrl,
      });

      if (isCondoUrl(postUrl)) {
        if (!validateCondoPayload(newItem)) {
          console.warn(
            "[useProductsCatalog] detectado como CONDO pero no cumple validación mínima; no se enviará al CONDO_ARTICLE_API.",
            {
              id: newItem.id,
              name: newItem.name,
              checklist: newItem.checklist,
              approvedBy: newItem.meta?.checklist?.approvedBy,
            }
          );
          return newItem;
        }

        try {
          await postToApiAdaptive(postUrl, "upsert", newItem);
        } catch (e) {
          console.warn("[useProductsCatalog] CONDO upsert failed", e);
        }

        return newItem;
      }

      if (tx === "venta") {
        try {
          await postToApiAdaptive(postUrl, "upsert", newItem);
        } catch (e) {
          console.warn("createCatalogProduct upsert failed", e);
        }

        return newItem;
      }

      if (tx === "compra") {
        await createInternalManagementRecord(newItem, "compra");
        return newItem;
      }

      return newItem;
    },
    [createInternalManagementRecord]
  );

  const updateCatalogProduct = useCallback(
    async (id: string, patch: Partial<any>) => {
      const patchTx = detectTxType(patch);

      setProductsCatalog((p) => {
        const next = p.map((x) =>
          String(x.id) === String(id)
            ? { ...x, ...patch, updatedAt: new Date().toISOString() }
            : x
        );

        saveProductsToLocal(next);
        return next;
      });

      try {
        const raw = readProductsFromLocal();
        const localFound = raw.find((it) => String(it.id) === String(id));

        const found = localFound ? { ...localFound, ...patch } : { id, ...patch };
        const normalizedForValidation = normalizeItem(found);
        const postUrl = decideApiParaRegistro(found);

        console.debug("[useProductsCatalog] updateCatalogProduct", {
          id,
          checklist: normalizedForValidation.checklist,
          approvedBy: normalizedForValidation.meta?.checklist?.approvedBy,
          isContractorOrOwner:
            isContractorOrOwner(found) || isContractorOrOwner(normalizedForValidation),
          postUrl,
        });

        if (isCondoUrl(postUrl)) {
          if (!validateCondoPayload(normalizedForValidation)) {
            console.warn(
              "[useProductsCatalog] actualización detectada como CONDO pero el payload no cumple requisitos mínimos; se omitirá el envío.",
              {
                id,
                checklist: normalizedForValidation.checklist,
                approvedBy: normalizedForValidation.meta?.checklist?.approvedBy,
              }
            );
            return;
          }

          await postToApiAdaptive(postUrl, "upsert", normalizedForValidation);

          if (patchTx === "compra") {
            await createInternalManagementRecord(normalizedForValidation, "compra");
          }

          return;
        }

        if (patchTx === "venta") {
          await postToApiAdaptive(postUrl, "upsert", normalizedForValidation);
        } else if (patchTx === "compra") {
          await postToApiAdaptive(postUrl, "delete", { id });

          setProductsCatalog((prev) => {
            const next = prev.filter((x) => String(x.id) !== String(id));
            saveProductsToLocal(next);
            return next;
          });

          await createInternalManagementRecord(normalizedForValidation, "compra");
        }
      } catch (err) {
        console.warn("updateCatalogProduct error", err);
      }
    },
    [createInternalManagementRecord]
  );

  const removeCatalogProduct = useCallback(async (id: string) => {
    try {
      const raw = readProductsFromLocal();
      const found = raw.find((it) => String(it.id) === String(id));
      const postUrl = decideApiParaRegistro(found || { id });

      await postToApiAdaptive(postUrl, "delete", { id });
    } catch (e) {
      console.warn("[useProductsCatalog] removeCatalogProduct warning", e);
    }

    setProductsCatalog((p) => {
      const next = p.filter((x) => String(x.id) !== String(id));
      saveProductsToLocal(next);
      return next;
    });
  }, []);

  const cloneCatalogProduct = useCallback(
    async (id: string) => {
      const found = productsCatalog.find((x) => String(x.id) === String(id));
      if (!found) return;

      const clone = attachChecklistApproval({
        ...JSON.parse(JSON.stringify(found)),
        id: genId(),
        name: `${found.name ?? "Producto"} (copia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setProductsCatalog((p) => {
        const next = [clone, ...p];
        saveProductsToLocal(next);
        return next;
      });

      const tx = detectTxType(found);
      const postUrl = decideApiParaRegistro(found);

      if (isCondoUrl(postUrl)) {
        if (!validateCondoPayload(clone)) {
          console.warn(
            "[useProductsCatalog] clonación detectada como CONDO pero el clone no cumple validación mínima.",
            {
              originalId: id,
              cloneId: clone.id,
              approvedBy: clone.meta?.checklist?.approvedBy,
            }
          );
          if (tx === "compra") {
            await createInternalManagementRecord(clone, "compra");
          }
          return;
        }

        await postToApiAdaptive(postUrl, "upsert", clone);

        if (tx === "compra") {
          await createInternalManagementRecord(clone, "compra");
        }

        return;
      }

      if (tx === "venta") {
        await postToApiAdaptive(postUrl, "upsert", clone);
      } else if (tx === "compra") {
        await createInternalManagementRecord(clone, "compra");
      }
    },
    [productsCatalog, createInternalManagementRecord]
  );

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