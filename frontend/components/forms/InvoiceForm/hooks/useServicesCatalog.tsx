"use client";

import { useCallback, useEffect, useState } from "react";

/* ---- Types ---- */
export interface CatalogService {
  id: string;
  masterId?: string; // se mantiene el campo por compatibilidad, pero ya no se trata como "master"
  companyId?: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

/* ---- Consts ---- */
const LOCAL_SERV_KEY = "local_services_catalog_v1";
const SERVICES_API = "/api/administration/services"; // ajusta si tu ruta es distinta

/* ---- Utilities ---- */
function genId(): string {
  try {
    const win = typeof window !== "undefined" ? (window as any) : undefined;
    if (win?.crypto && "randomUUID" in win.crypto) {
      return win.crypto.randomUUID();
    }
  } catch (e) {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

/* ---- Hook ---- */
export default function useServicesCatalog() {
  const [servicesCatalog, setServicesCatalog] = useState<CatalogService[]>([]);

  const saveServicesToLocal = (arr: CatalogService[]) => {
    try {
      localStorage.setItem(LOCAL_SERV_KEY, JSON.stringify(arr));
    } catch (err) {
      // ignore storage errors
    }
  };

  /**
   * applyServerServices
   * - Reemplaza la lista local por la canonical que venga del servidor.
   * - El servidor puede devolver { services: [...] } o un array directo.
   */
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
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(SERVICES_API);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const servs = Array.isArray(json?.services) ? json.services : Array.isArray(json) ? json : [];
        applyServerServices(servs);
        return;
      }
      // fallback a localStorage si la respuesta no es ok
      const raw = localStorage.getItem(LOCAL_SERV_KEY);
      const servs = raw ? JSON.parse(raw) : [];
      setServicesCatalog(Array.isArray(servs) ? servs : []);
    } catch (err) {
      console.error("[useServicesCatalog] fetchServices error", err);
      try {
        const raw = localStorage.getItem(LOCAL_SERV_KEY);
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

  /**
   * mergeVisibleServices
   * - Con la eliminación de "masters" esta función simplemente filtra
   *   los servicios por companyId (si se provee) o devuelve todos.
   */
  const mergeVisibleServices = useCallback(
    (companyId?: string) => {
      if (!companyId || String(companyId).trim() === "") return servicesCatalog;
      return servicesCatalog.filter((s) => String(s.companyId ?? "") === String(companyId));
    },
    [servicesCatalog]
  );

  /* ---- helpers locales (upsert solo en servicesCatalog) ---- */
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
      try { saveServicesToLocal(arr); } catch (e) {}
      return arr;
    });
  }, []);

  /* ---- CRUD servicios (sin concepto de master) ---- */

  const createCatalogService = useCallback(
    async (rec: Partial<CatalogService>) => {
      const explicitCompanyId = rec?.companyId && String(rec.companyId).trim() ? String(rec.companyId).trim() : "";
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

      // guardado optimista local
      setServicesCatalog((prev) => {
        const prevArr = Array.isArray(prev) ? [...prev] : [];
        const exists = prevArr.some((p) => p.id === tempId);
        if (exists) return prevArr;
        const next = [optimistic, ...prevArr];
        try { saveServicesToLocal(next); } catch (e) {}
        return next;
      });

      try {
        const apiRes = await apiPostJson(SERVICES_API, { action: "upsert", service: incoming });

        // servidor devuelve lista completa -> reemplazo total
        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
          const created = (apiRes.json.services as any[]).find((s) => String(s.id) === String(incoming.id) || String(s.masterId ?? s.id) === String(incoming.masterId ?? incoming.id));
          return created ?? apiRes.json.service ?? null;
        }

        // servidor devuelve el registro creado/actualizado
        if (apiRes.ok && apiRes.json?.service) {
          const svc = apiRes.json.service as CatalogService;
          upsertServiceLocal(svc);

          // si el servidor asignó un id distinto al temp, reemplazamos el optimista
          if (svc.id && svc.id !== tempId) {
            setServicesCatalog((p) => {
              const arr = Array.isArray(p) ? [...p] : [];
              const idx = arr.findIndex((x) => x.id === tempId);
              if (idx >= 0) {
                arr[idx] = { ...arr[idx], ...svc, id: svc.id };
                try { saveServicesToLocal(arr); } catch (e) {}
                return arr;
              }
              return arr;
            });
          }
          return svc;
        }

        // fallback: devolver el optimista
        return optimistic;
      } catch (e) {
        console.warn("[useServicesCatalog] createCatalogService - server upsert failed", e);
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
        try { saveServicesToLocal(next); } catch (e) {}
        return next;
      });

      try {
        const apiRes = await apiPostJson(SERVICES_API, { action: "upsert", service: { id, ...patch } });

        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
          return;
        }

        if (apiRes.ok && apiRes.json?.service) {
          const svc = apiRes.json.service as CatalogService;
          upsertServiceLocal(svc);
        }
      } catch (e) {
        console.warn("[useServicesCatalog] updateCatalogService - server upsert failed", e);
      }
    },
    [applyServerServices, upsertServiceLocal]
  );

  const removeCatalogService = useCallback(
    async (id: string) => {
      setServicesCatalog((p) => {
        const next = (p || []).filter((x) => x.id !== id && x.masterId !== id);
        try { saveServicesToLocal(next); } catch (e) {}
        return next;
      });

      try {
        const apiRes = await apiPostJson(SERVICES_API, { action: "delete", id });

        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
        }
      } catch (e) {
        console.warn("[useServicesCatalog] removeCatalogService - server delete failed", e);
      }
    },
    [applyServerServices]
  );

  const cloneCatalogService = useCallback(
    async (id: string) => {
      const found = servicesCatalog.find((x) => x.id === id || x.masterId === id);
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
        const exists = prevArr.some((x) => x.name === clone.name && String(x.masterId ?? x.id) === String(clone.masterId ?? clone.id));
        if (exists) return prevArr;
        const next = [clone, ...prevArr];
        try { saveServicesToLocal(next); } catch (e) {}
        return next;
      });

      try {
        const apiRes = await apiPostJson(SERVICES_API, { action: "upsert", service: { ...clone, id: undefined } });

        if (apiRes.ok && Array.isArray(apiRes.json?.services)) {
          applyServerServices(apiRes.json.services);
          return;
        }

        if (apiRes.ok && apiRes.json?.service) {
          const svc = apiRes.json.service as CatalogService;
          upsertServiceLocal(svc);

          setServicesCatalog((p) => {
            const arr = Array.isArray(p) ? [...p] : [];
            const idx = arr.findIndex((x) => x.id === clone.id);
            if (idx >= 0) {
              arr[idx] = { ...arr[idx], ...svc, id: svc.id };
              try { saveServicesToLocal(arr); } catch (e) {}
              return arr;
            }
            return arr;
          });
        }
      } catch (e) {
        console.warn("[useServicesCatalog] cloneCatalogService - server upsert failed", e);
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
    applyServerServices, // expuesto por si quieres forzar replace manualmente
  };
}
