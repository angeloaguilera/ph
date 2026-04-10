// hooks/useAnnexesCatalog.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { genId } from "../../../../lib/invoiceUtils";
import {
  CONDO_ANNEXES_API,
  CONDO_ANNEXES_ATTACH_API,
  CONDO_ANNEXES_WITH_CATALOG_API,
} from "./constants";
import { apiPostJson } from "./catalogHelpers";

/**
 * Hook: useAnnexesCatalog
 *
 * - party?: any  -> registro de la parte / propietario. Si no hay propietario detectable,
 *                   el hook será invisible y no hará llamadas a la API (no-ops).
 *
 * Retorna:
 * { visible, loading, annexes, catalog, error, fetchAnnexes, addFromCatalog, createAnexo, removeAnexo }
 */

const LOCAL_ANNEXES_KEY = "admin_annexes_v1";

/* ---------- helpers de detección (propietario) ---------- */

/** verifica si un objeto contiene alguna de las keywords (insensible a mayúsculas) */
function objContainsKeywords(obj: any, keywords: string[]) {
  if (!obj) return false;
  const lower = JSON.stringify(obj).toLowerCase();
  for (const kw of keywords) {
    if (!kw) continue;
    if (lower.includes(kw.toLowerCase())) return true;
  }
  return false;
}

/** Detecta estrictamente si el party corresponde a propietario */
function isOwner(record?: any) {
  if (!record) return false;

  // campos a revisar explícitamente
  const explicit = [
    "role",
    "ownerType",
    "partyType",
    "type",
    "sourceRole",
    "category",
    "description",
    "name",
    "meta",
  ];

  for (const f of explicit) {
    const v = record?.[f];
    if (typeof v === "string" && /propietari|owner/i.test(v)) return true;
    if (typeof v === "object" && v !== null) {
      try {
        if (JSON.stringify(v).toLowerCase().includes("propietari")) return true;
        if (JSON.stringify(v).toLowerCase().includes("owner")) return true;
      } catch {}
    }
  }

  // keywords más amplias
  const KW = ["propietario", "propietarios", "owner", "owners", "propiedad"];
  if (objContainsKeywords(record, KW)) return true;

  return false;
}

/* ---------- util localStorage ---------- */
function readAnnexesFromLocal(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_ANNEXES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveAnnexesToLocal(arr: any[]) {
  try {
    localStorage.setItem(LOCAL_ANNEXES_KEY, JSON.stringify(arr));
  } catch {}
}

/* ---------- Hook ---------- */
export default function useAnnexesCatalog(party?: any) {
  // visible: sólo true si detectamos propietario
  const visible = useMemo(() => isOwner(party), [party]);

  const [annexes, setAnnexes] = useState<any[]>(() => readAnnexesFromLocal());
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- fetch anexos + catálogo ---------- */
  const fetchAnnexes = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!visible) {
        // si no hay propietario no hace nada
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // pedimos el endpoint que devuelve annexes + catalog cuando se indica ?catalog=true
        const url = CONDO_ANNEXES_WITH_CATALOG_API;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Error fetching annexes: ${res.status}`);
        }
        const json = await res.json().catch(() => null);

        // El servidor puede devolver { annexes, catalog } o un array simple.
        const nextAnnexes = Array.isArray(json?.annexes)
          ? json.annexes
          : Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];
        const nextCatalog = Array.isArray(json?.catalog) ? json.catalog : [];

        setAnnexes((prev) => {
          // si no forzamos y ya tenemos datos, hacemos merge (único por id)
          if (!opts.force && prev && prev.length > 0) {
            const map = new Map(prev.map((p) => [String(p.id), p]));
            for (const a of nextAnnexes) {
              map.set(String(a.id), { ...(map.get(String(a.id)) ?? {}), ...a });
            }
            const merged = Array.from(map.values());
            saveAnnexesToLocal(merged);
            return merged;
          }
          saveAnnexesToLocal(nextAnnexes);
          return nextAnnexes;
        });

        setCatalog(nextCatalog);
      } catch (e: any) {
        console.warn("[useAnnexesCatalog] fetchAnnexes failed", e);
        setError(String(e?.message ?? e));
        // fallback a local
        const cached = readAnnexesFromLocal();
        setAnnexes(cached);
      } finally {
        setLoading(false);
      }
    },
    [visible]
  );

  useEffect(() => {
    // solo cargar si visible (hay propietario)
    if (!visible) return;
    fetchAnnexes();
  }, [visible, fetchAnnexes]);

  /* ---------- Añadir anexo desde catálogo ---------- */
  const addFromCatalog = useCallback(
    async (catalogId: string) => {
      if (!visible) return;
      if (!catalogId) return;
      setLoading(true);
      setError(null);
      try {
        // endpoint: POST ?action=attach&catalogId=...
        const url = `${CONDO_ANNEXES_API}?action=attach&catalogId=${encodeURIComponent(
          catalogId
        )}`;
        // usamos apiPostJson para mantener consistencia (puede devolver Partial<DocItem>)
        const res = await apiPostJson(url, {}); // el backend no requiere body para attach, pero usamos helper
        // res expected partial DocItem or new annex
        const anexo = res ?? null;
        if (anexo) {
          setAnnexes((prev) => {
            const next = [anexo, ...prev.filter((p) => String(p.id) !== String(anexo.id))];
            saveAnnexesToLocal(next);
            return next;
          });
        } else {
          // fallback: refrescar servidor
          await fetchAnnexes({ force: true });
        }
        return anexo;
      } catch (e: any) {
        console.warn("[useAnnexesCatalog] addFromCatalog failed", e);
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    },
    [visible, fetchAnnexes]
  );

  /* ---------- Crear anexo (inline) ---------- */
  /**
   * body: {
   *  name: string,
   *  url?: string,
   *  fileDataUrl?: string, // data:...;base64,...
   *  description?, tags?, type?, date?, expiresAt?, private?, notes?, uploadedBy?
   * }
   */
  const createAnexo = useCallback(
    async (body: any) => {
      if (!visible) return null;
      setLoading(true);
      setError(null);
      try {
        // minimal local object before server responds
        const local = {
          id: String(body.id ?? genId()),
          name: String(body.name ?? "Anexo"),
          url: body.url ?? (body.fileDataUrl ? "(uploading...)" : undefined),
          description: body.description ?? undefined,
          tags: Array.isArray(body.tags) ? body.tags : undefined,
          type: body.type ?? undefined,
          date: body.date ?? null,
          expiresAt: body.expiresAt ?? null,
          private: !!body.private,
          notes: body.notes ?? undefined,
          uploadedBy: body.uploadedBy ?? null,
          fromCatalog: false,
          createdAt: new Date().toISOString(),
        };

        setAnnexes((prev) => {
          const next = [local, ...prev];
          saveAnnexesToLocal(next);
          return next;
        });

        // send to server
        const url = CONDO_ANNEXES_API;
        // body may include fileDataUrl or url
        const res = await apiPostJson(url, body);
        // server should respond with created annex (with real url and id)
        if (res) {
          setAnnexes((prev) => {
            // replace local placeholder if same name or id
            const next = [
              res,
              ...prev.filter((p) => String(p.id) !== String(res.id) && String(p.name) !== String(res.name)),
            ];
            saveAnnexesToLocal(next);
            return next;
          });
          return res;
        }

        return local;
      } catch (e: any) {
        console.warn("[useAnnexesCatalog] createAnexo failed", e);
        setError(String(e?.message ?? e));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [visible]
  );

  /* ---------- Eliminar anexo ---------- */
  const removeAnexo = useCallback(
    async (id: string) => {
      if (!visible) return;
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // DELETE /api/.../annexes?id=...
        const url = `${CONDO_ANNEXES_API}?id=${encodeURIComponent(id)}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          // attempt to parse error
          const txt = await res.text().catch(() => "");
          throw new Error(`delete failed: ${res.status} ${txt}`);
        }
        // remove locally
        setAnnexes((prev) => {
          const next = prev.filter((p) => String(p.id) !== String(id));
          saveAnnexesToLocal(next);
          return next;
        });
        return true;
      } catch (e: any) {
        console.warn("[useAnnexesCatalog] removeAnexo failed", e);
        setError(String(e?.message ?? e));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [visible]
  );

  /* ---------- utilities expuestos ---------- */
  return {
    visible,
    loading,
    error,
    annexes,
    catalog,
    fetchAnnexes,
    addFromCatalog,
    createAnexo,
    removeAnexo,
    // util: refresh forced
    refresh: () => fetchAnnexes({ force: true }),
  };
}