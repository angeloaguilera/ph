"use client";

import { useCallback, useEffect, useState } from "react";
import { SERVICES_API, CONDO_SERVICE_API } from "./constants";

/* ---- Types ---- */
export interface CatalogService {
  id: string;
  masterId?: string; // se mantiene el campo por compatibilidad
  companyId?: string;
  name?: string;
  description?: string;
  type?: string;
  role?: string;
  ownerType?: string;
  partyType?: string;
  domain?: "general" | "condo";
  meta?: Record<string, any>;
  [key: string]: any;
}

/* ---- Local-only key (inline, no export) ---- */
const LOCAL_SERV_KEY_INLINE = "admin_services_v1";

/* ---- Utilities ---- */
function genId(): string {
  try {
    const win = typeof window !== "undefined" ? (window as any) : undefined;
    if (win?.crypto && "randomUUID" in win.crypto) {
      return win.crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function toLowerText(value: unknown): string {
  return toText(value).toLowerCase();
}

function isTrueFlag(value: any): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function hasOwnerOrContractorMarker(source: any): boolean {
  if (!source) return false;

  // Solo valores explícitos en true
  const directFlags = [
    source?.isPropietario,
    source?.isProveedorContratista,
    source?.propietario,
    source?.contratista,
    source?.esPropietario,
    source?.esContratista,
    source?.hasPropietario,
    source?.hasContratista,
  ];

  if (directFlags.some(isTrueFlag)) return true;

  // Arrays/listas o items con etiquetas explícitas
  const candidateLists: any[] = [
    source?.checklist,
    source?.meta?.checklist,
    source?.meta?.items,
    source?.items,
    source?.tags,
  ];

  for (const list of candidateLists) {
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    for (const item of arr) {
      const text =
        typeof item === "string"
          ? toLowerText(item)
          : toLowerText(
              item?.label ??
                item?.name ??
                item?.title ??
                item?.value ??
                item?.text ??
                JSON.stringify(item)
            );

      if (
        text.includes("propiet") ||
        text.includes("contrat") ||
        text.includes("dueñ") ||
        text.includes("dueño")
      ) {
        return true;
      }

      if (
        item?.done === true &&
        (text.includes("propiet") || text.includes("contrat"))
      ) {
        return true;
      }
    }
  }

  return false;
}

async function apiPostJson(
  url: string,
  body: any
): Promise<{ ok: boolean; status?: number; json?: any; error?: any }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function isCondoRecord(record?: any): boolean {
  if (!record) return false;

  const domain = String(record?.domain ?? record?.meta?.domain ?? "").toLowerCase();
  if (domain !== "condo") return false;

  // Importante:
  // Aunque domain sea "condo", solo va a CONDO_SERVICE_API si hay señal real
  // de propietario/contratista en true.
  return hasOwnerOrContractorMarker(record);
}

function getTransaction(record?: any): string {
  return String(
    record?.transaction ??
      record?.meta?.transactionType ??
      record?.meta?.transaction ??
      ""
  ).trim();
}

function pickBaseApi(record?: any): string {
  return isCondoRecord(record) ? CONDO_SERVICE_API : SERVICES_API;
}

/* ---- Hook ---- */
export default function useServicesCatalog() {
  const [servicesCatalog, setServicesCatalog] = useState<CatalogService[]>([]);

  const saveServicesToLocal = (arr: CatalogService[]) => {
    try {
      localStorage.setItem(LOCAL_SERV_KEY_INLINE, JSON.stringify(arr));
    } catch {
      // ignore storage errors
    }
  };

  const applyServerServices = useCallback((arr: any[]) => {
    const canonical = Array.isArray(arr) ? arr : [];
    const normalized = canonical.map((s: any) => ({
      ...s,
      id: String(s.id ?? genId()),
      masterId: s.masterId ? String(s.masterId) : s.masterId ?? undefined,
      companyId: s.companyId ? String(s.companyId) : s.companyId ?? "",
    }));

    try {
      setServicesCatalog(normalized);
      saveServicesToLocal(normalized);
    } catch {
      // ignore
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(SERVICES_API);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const servs = Array.isArray(json?.services)
          ? json.services
          : Array.isArray(json)
            ? json
            : [];
        applyServerServices(servs);
        return;
      }

      const raw = localStorage.getItem(LOCAL_SERV_KEY_INLINE);
      const servs = raw ? JSON.parse(raw) : [];
      setServicesCatalog(Array.isArray(servs) ? servs : []);
    } catch (err) {
      console.error("[useServicesCatalog] fetchServices error", err);
      try {
        const raw = localStorage.getItem(LOCAL_SERV_KEY_INLINE);
        const servs = raw ? JSON.parse(raw) : [];
        setServicesCatalog(Array.isArray(servs) ? servs : []);
      } catch (err2) {
        console.error("[useServicesCatalog] fallback error", err2);
        setServicesCatalog([]);
      }
    }
  }, [applyServerServices]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const mergeVisibleServices = useCallback(
    (companyId?: string) => {
      if (!companyId || String(companyId).trim() === "") return servicesCatalog;
      return servicesCatalog.filter(
        (s) => String(s.companyId ?? "") === String(companyId)
      );
    },
    [servicesCatalog]
  );

  const upsertServiceLocal = useCallback((svc: CatalogService) => {
    setServicesCatalog((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const id = String(svc.id ?? genId());
      const idx = arr.findIndex((x) => String(x.id) === id);

      const normalized: CatalogService = {
        ...svc,
        id,
        masterId: svc.masterId ? String(svc.masterId) : svc.masterId,
        companyId: svc.companyId ? String(svc.companyId) : svc.companyId ?? "",
        updatedAt: new Date().toISOString(),
      };

      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...normalized };
      } else {
        arr.unshift(normalized);
      }

      try {
        saveServicesToLocal(arr);
      } catch {}
      return arr;
    });
  }, []);

  const createCatalogService = useCallback(
    async (rec: Partial<CatalogService>) => {
      const explicitCompanyId =
        rec?.companyId && String(rec.companyId).trim()
          ? String(rec.companyId).trim()
          : "";

      const masterId = rec?.masterId ? String(rec.masterId) : undefined;

      const incoming: CatalogService = {
        ...(rec as CatalogService),
        id: rec?.id ? String(rec.id) : undefined,
        masterId,
        companyId: explicitCompanyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as CatalogService;

      const tempId = `temp-${genId()}`;
      const optimistic: CatalogService = { ...incoming, id: tempId };

      setServicesCatalog((prev) => {
        const prevArr = Array.isArray(prev) ? [...prev] : [];
        const exists = prevArr.some((p) => p.id === tempId);
        if (exists) return prevArr;
        const next = [optimistic, ...prevArr];
        try {
          saveServicesToLocal(next);
        } catch {}
        return next;
      });

      const chosenBaseApi = pickBaseApi(incoming);
      const transaction = getTransaction(incoming);

      try {
        const apiRes = await apiPostJson(chosenBaseApi, {
          action: "upsert",
          transaction,
          data: {
            ...incoming,
            transaction,
          },
        });

        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
          const created =
            (apiRes.json.services as any[]).find(
              (s) =>
                String(s.id) === String(incoming.id) ||
                String(s.masterId ?? s.id) ===
                  String(incoming.masterId ?? incoming.id)
            ) ?? null;
          return created ?? apiRes.json.service ?? null;
        }

        if (apiRes.ok && apiRes.json?.item) {
          const svc = apiRes.json.item as CatalogService;
          upsertServiceLocal(svc);

          if (svc.id && svc.id !== tempId) {
            setServicesCatalog((p) => {
              const arr = Array.isArray(p) ? [...p] : [];
              const idx = arr.findIndex((x) => x.id === tempId);
              if (idx >= 0) {
                arr[idx] = { ...arr[idx], ...svc, id: svc.id };
                try {
                  saveServicesToLocal(arr);
                } catch {}
                return arr;
              }
              return arr;
            });
          }
          return svc;
        }

        return optimistic;
      } catch (e) {
        console.warn(
          "[useServicesCatalog] createCatalogService - server upsert failed",
          e
        );
        return optimistic;
      }
    },
    [applyServerServices, upsertServiceLocal]
  );

  const updateCatalogService = useCallback(
    async (id: string, patch: Partial<CatalogService>) => {
      setServicesCatalog((p) => {
        const next = (p || []).map((x) =>
          x.id === id || (x.masterId && x.masterId === (patch.masterId ?? id))
            ? { ...x, ...patch, updatedAt: new Date().toISOString() }
            : x
        );
        try {
          saveServicesToLocal(next);
        } catch {}
        return next;
      });

      try {
        const localRaw = localStorage.getItem(LOCAL_SERV_KEY_INLINE);
        const localArr = localRaw ? JSON.parse(localRaw) : [];
        const found =
          (Array.isArray(localArr) ? localArr : []).find(
            (x) => String(x.id) === String(id) || String(x.masterId) === String(id)
          ) ?? null;

        const combined = found ? { ...found, ...patch, id } : { id, ...patch };
        const chosenBaseApi = pickBaseApi(combined);
        const transaction = getTransaction(combined);

        const apiRes = await apiPostJson(chosenBaseApi, {
          action: "upsert",
          transaction,
          data: {
            ...combined,
            id,
            transaction,
          },
        });

        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
          return;
        }

        if (apiRes.ok && apiRes.json?.item) {
          const svc = apiRes.json.item as CatalogService;
          upsertServiceLocal(svc);
        }
      } catch (e) {
        console.warn(
          "[useServicesCatalog] updateCatalogService - server upsert failed",
          e
        );
      }
    },
    [applyServerServices, upsertServiceLocal]
  );

  const removeCatalogService = useCallback(
    async (id: string) => {
      setServicesCatalog((p) => {
        const next = (p || []).filter((x) => x.id !== id && x.masterId !== id);
        try {
          saveServicesToLocal(next);
        } catch {}
        return next;
      });

      try {
        const localRaw = localStorage.getItem(LOCAL_SERV_KEY_INLINE);
        const localArr = localRaw ? JSON.parse(localRaw) : [];
        const found = (Array.isArray(localArr) ? localArr : []).find(
          (x) => x.id === id || x.masterId === id
        );

        const chosenBaseApi = pickBaseApi(found);

        const apiRes = await apiPostJson(chosenBaseApi, { action: "delete", id });

        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
        }
      } catch (e) {
        console.warn(
          "[useServicesCatalog] removeCatalogService - server delete failed",
          e
        );
      }
    },
    [applyServerServices]
  );

  const cloneCatalogService = useCallback(
    async (id: string) => {
      const found =
        servicesCatalog.find((x) => x.id === id || x.masterId === id) ?? null;
      if (!found) return;

      const clone: CatalogService = {
        ...structuredClone(found),
        id: `temp-${genId()}`,
        name: `${found.name ?? ""} (copia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setServicesCatalog((p) => {
        const prevArr = Array.isArray(p) ? [...p] : [];
        const exists = prevArr.some(
          (x) =>
            x.name === clone.name &&
            String(x.masterId ?? x.id) === String(clone.masterId ?? clone.id)
        );
        if (exists) return prevArr;
        const next = [clone, ...prevArr];
        try {
          saveServicesToLocal(next);
        } catch {}
        return next;
      });

      try {
        const chosenBaseApi = pickBaseApi(found);
        const transaction = getTransaction(found);

        const apiRes = await apiPostJson(chosenBaseApi, {
          action: "upsert",
          transaction,
          data: {
            ...clone,
            id: undefined,
            transaction,
          },
        });

        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
          return;
        }

        if (apiRes.ok && apiRes.json?.item) {
          const svc = apiRes.json.item as CatalogService;
          upsertServiceLocal(svc);

          setServicesCatalog((p) => {
            const arr = Array.isArray(p) ? [...p] : [];
            const idx = arr.findIndex((x) => x.id === clone.id);
            if (idx >= 0) {
              arr[idx] = { ...arr[idx], ...svc, id: svc.id };
              try {
                saveServicesToLocal(arr);
              } catch {}
              return arr;
            }
            return arr;
          });
        }
      } catch (e) {
        console.warn(
          "[useServicesCatalog] cloneCatalogService - server upsert failed",
          e
        );
      }
    },
    [servicesCatalog, applyServerServices, upsertServiceLocal]
  );

  return {
    servicesCatalog,
    setServicesCatalog,
    createCatalogService,
    updateCatalogService,
    removeCatalogService,
    cloneCatalogService,
    fetchServices,
    mergeVisibleServices,
    applyServerServices,
  };
}