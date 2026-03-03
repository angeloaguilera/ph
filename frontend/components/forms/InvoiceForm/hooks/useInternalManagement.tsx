// hooks/useInternalManagement.ts
import { useCallback, useEffect, useState } from "react";
import { INTERNAL_MANAGEMENT_API } from "./constants";
import { apiPostJson } from "./catalogHelpers";

type InternalPayload = { referenceId?: string; item: any; meta?: any };

export default function useInternalManagement() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = useCallback(async (type?: string) => {
    try {
      setLoading(true);
      const url = type ? `${INTERNAL_MANAGEMENT_API}?type=${encodeURIComponent(String(type))}` : INTERNAL_MANAGEMENT_API;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const json = await res.json();
      const arr = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
      setRecords(arr);
      return arr;
    } catch (err) {
      console.warn("[useInternalManagement] fetchRecords failed", err);
      setRecords([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(async (payload: InternalPayload) => {
    const res = await apiPostJson(INTERNAL_MANAGEMENT_API, payload);
    const record = res?.record ?? res;
    if (record) setRecords((prev) => [record, ...prev]);
    return record;
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    const res = await fetch(`${INTERNAL_MANAGEMENT_API}?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${txt}`);
    }
    const json = await res.json();
    const removedId = json?.id ?? id;
    setRecords((prev) => prev.filter((r) => String(r.id) !== String(removedId)));
    return removedId;
  }, []);

  useEffect(() => {
    // carga inicial (sin filtro)
    fetchRecords().catch(() => {});
  }, [fetchRecords]);

  return { records, loading, fetchRecords, createRecord, deleteRecord };
}
