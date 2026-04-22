import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readFileAsDataUrl } from "../../../../lib/invoiceUtils";
import type {
  PartyInfo,
  PartyRecord,
  PartyRole,
  PartyChecklist,
  ChecklistItem,
} from "../../../../types/invoice";
import {
  LOCAL_STORAGE_KEY,
  AUXILIARIES_LOCAL_KEY,
  AUX_API,
} from "./constants";

import {
  buildPartyRecordFromDraft,
  checklistAdd,
  checklistIncludes,
  checklistRemove,
  createEmptyPartyDraft,
  createEmptyPartyInfo,
  normalizeDraftFromParty,
  normalizeChecklistRaw,
  normalizePartyRecord,
  partyKeyFromParty,
  isMarkedAsAuxiliary,
  type PartyDraft,
} from "./parties/partyHelpers";

import {
  saveChecklistToDb,
  getChecklistFromDb,
  trySendToCondoAuxiliary,
  tryFindAndDeleteDoneFalseFromCondo,
} from "./parties/partyApi";

async function getJson(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>
) {
  const isAbsolute = /^https?:\/\//i.test(url);
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";

  const finalUrl = new URL(url, isAbsolute ? undefined : origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      finalUrl.searchParams.set(key, String(value));
    }
  }

  const resp = await fetch(finalUrl.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const text = await resp.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return { resp, parsed, text };
}

function extractChecklist(payload: any): PartyChecklist | null {
  if (!payload) return null;
  if (Array.isArray(payload)) return normalizeChecklistRaw(payload);
  if (Array.isArray(payload?.checklist)) return normalizeChecklistRaw(payload.checklist);
  if (Array.isArray(payload?.items)) return normalizeChecklistRaw(payload.items);
  if (Array.isArray(payload?.data)) return normalizeChecklistRaw(payload.data);
  return null;
}

function extractRecords(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.parties)) return payload.parties;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function useParties(initialParty?: Partial<PartyInfo>) {
  const defaultParty: PartyInfo = useMemo(
    () => createEmptyPartyInfo(initialParty),
    [initialParty]
  );

  const emptyDraft: PartyDraft = useMemo(() => createEmptyPartyDraft(), []);

  const [partyInfo, setPartyInfo] = useState<PartyInfo>(defaultParty);
  const [parties, setParties] = useState<PartyRecord[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | "">("");
  const [showNewPartyForm, setShowNewPartyForm] = useState(false);
  const [newPartyDraft, setNewPartyDraft] = useState<PartyDraft>(emptyDraft);
  const [partyPhotoPreview, setPartyPhotoPreview] = useState<string | undefined>(
    defaultParty.photoDataUrl
  );
  const [editingPartyId, setEditingPartyId] = useState<string | undefined>(undefined);
  const [receiptPartyRole, setReceiptPartyRole] = useState<PartyRole>("CLIENTE");

  const pendingSavedRef = useRef<Map<string, PartyRecord>>(new Map());
  const hydratedChecklistRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadInitialParties = async () => {
      try {
        const { resp, parsed } = await getJson(AUX_API, { action: "list" });

        if (resp.ok) {
          const remoteRecords = extractRecords(parsed).map((p) => normalizePartyRecord(p));
          if (!cancelled && remoteRecords.length > 0) {
            setParties(remoteRecords);
            return;
          }
        } else {
          console.warn("[useParties] remote load failed", {
            status: resp.status,
            body: parsed,
          });
        }
      } catch (err) {
        console.warn("[useParties] error loading parties from GET", err);
      }

      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const normalized = Array.isArray(parsed)
            ? parsed.map((p) => normalizePartyRecord(p))
            : [];
          if (!cancelled) {
            setParties(normalized);
            return;
          }
        }
      } catch (err) {
        console.warn("[useParties] error reading LOCAL_STORAGE_KEY", err);
      }

      try {
        const rawAux = localStorage.getItem(AUXILIARIES_LOCAL_KEY);
        if (rawAux) {
          const parsed = JSON.parse(rawAux);
          if (!cancelled) {
            setParties(
              Array.isArray(parsed)
                ? parsed.map((p: any) => normalizePartyRecord(p))
                : []
            );
          }
        }
      } catch (err) {
        console.warn("[useParties] error reading AUXILIARIES_LOCAL_KEY", err);
      }
    };

    loadInitialParties();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const normalized = parties.map((p) => normalizePartyRecord(p));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      localStorage.setItem(AUXILIARIES_LOCAL_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.warn("[useParties] error saving to localStorage", err);
    }
  }, [parties]);

  useEffect(() => {
    let cancelled = false;

    const hydrateAllChecklists = async () => {
      for (const party of parties) {
        const partyId = String(party.id ?? "");
        if (!partyId) continue;
        if (hydratedChecklistRef.current.has(partyId)) continue;

        hydratedChecklistRef.current.add(partyId);

        try {
          const remote = await getChecklistFromDb(partyId);
          if (cancelled) return;

          const checklist = extractChecklist(remote);
          if (!checklist || checklist.length === 0) continue;

          setParties((prev) =>
            prev.map((p) =>
              String(p.id) === partyId ? { ...p, checklist } : p
            )
          );
        } catch (e) {
          console.warn("[useParties] hydrateAllChecklists failed", e, partyId);
        }
      }
    };

    if (parties.length > 0) {
      void hydrateAllChecklists();
    }

    return () => {
      cancelled = true;
    };
  }, [parties]);

  const currentRole = useMemo(() => receiptPartyRole, [receiptPartyRole]);

  const partiesForRole = useMemo(
    () => parties.filter((r) => r.role === currentRole),
    [parties, currentRole]
  );

  const syncSelectedPartyState = useCallback(
    (record: PartyRecord) => {
      const normalized = normalizePartyRecord(record);

      setSelectedPartyId(normalized.id);
      setPartyInfo(createEmptyPartyInfo(normalized));
      setPartyPhotoPreview(normalized.photoDataUrl);
      setNewPartyDraft(normalizeDraftFromParty(normalized));

      return normalized;
    },
    []
  );

  const resetSelection = useCallback(() => {
    setSelectedPartyId("");
    setPartyInfo(createEmptyPartyInfo());
    setNewPartyDraft(createEmptyPartyDraft());
    setPartyPhotoPreview(undefined);
  }, []);

  const findExistingSavedRecord = useCallback(
    (rec: { id?: string; companyId?: string } | undefined) => {
      if (!rec) return null;

      const id = rec.id ? String(rec.id) : "";
      const cid = rec.companyId ? String(rec.companyId) : "";

      const inMemory = parties.find(
        (p) =>
          (id && String(p.id) === id) ||
          (cid && (String(p.id) === cid || String(p.companyId) === cid))
      );
      if (inMemory) return inMemory;

      try {
        const candidates: any[] = [];
        const rawMain = localStorage.getItem(LOCAL_STORAGE_KEY);
        const rawAux = localStorage.getItem(AUXILIARIES_LOCAL_KEY);

        if (rawMain) {
          const parsed = JSON.parse(rawMain);
          if (Array.isArray(parsed)) candidates.push(...parsed);
        }
        if (rawAux) {
          const parsed = JSON.parse(rawAux);
          if (Array.isArray(parsed)) candidates.push(...parsed);
        }

        const found = candidates.find(
          (x) =>
            (id && String(x.id) === id) ||
            (cid && (String(x.id) === cid || String(x.companyId) === cid))
        );

        if (found) return normalizePartyRecord(found);
      } catch {}

      return null;
    },
    [parties]
  );

  const handleSelectParty = useCallback(
    (idOrRec: string | PartyRecord | undefined) => {
      if (!idOrRec) {
        resetSelection();
        return;
      }

      let found: PartyRecord | undefined;

      if (typeof idOrRec === "string") {
        const idStr = String(idOrRec);

        found = parties.find((p) => String(p.id) === idStr);

        if (!found) {
          const pending = pendingSavedRef.current.get(idStr);
          if (pending) {
            found = pending;
            pendingSavedRef.current.delete(idStr);
          }
        }
      } else {
        found = idOrRec;
      }

      if (!found) {
        console.warn(
          `[useParties] handleSelectParty - not found ${
            typeof idOrRec === "string" ? idOrRec : (idOrRec as any)?.id ?? "<no-id>"
          }`
        );
        return;
      }

      return syncSelectedPartyState(found);
    },
    [parties, resetSelection, syncSelectedPartyState]
  );

  const upsertIntoParties = useCallback((newRec: PartyRecord, editingId?: string) => {
    setParties((prev) => {
      if (editingId) {
        return prev.map((p) => (p.id === editingId ? newRec : p));
      }

      const foundIndex = prev.findIndex((p) => p.id === newRec.id);
      if (foundIndex !== -1) {
        const copy = [...prev];
        copy[foundIndex] = newRec;
        return copy;
      }

      return [newRec, ...prev];
    });
  }, []);

  const handleSavePartyDraft = useCallback(
    async (
      draft: PartyDraft,
      role: PartyRole,
      selectAfterSave = true,
      editingId?: string
    ) => {
      const rec = buildPartyRecordFromDraft(draft, role, editingId);

      const prevSaved = findExistingSavedRecord({
        id: rec.id,
        companyId: rec.companyId,
      });
      const prevMarked = isMarkedAsAuxiliary(prevSaved);

      const persistLocalRecord = async (recordToStore: PartyRecord) => {
        pendingSavedRef.current.set(recordToStore.id, recordToStore);
        upsertIntoParties(recordToStore, editingId);

        if (Array.isArray(recordToStore.checklist) && recordToStore.checklist.length > 0) {
          await saveChecklistToDb(recordToStore.id, recordToStore.checklist);
        }

        if (selectAfterSave) {
          syncSelectedPartyState(recordToStore);
        }

        try {
          const nowMarked = isMarkedAsAuxiliary(recordToStore);
          if (nowMarked) {
            await trySendToCondoAuxiliary(recordToStore);
          } else if (prevMarked && !nowMarked) {
            const identifier = recordToStore.id ?? recordToStore.companyId ?? "";
            if (identifier) {
              await tryFindAndDeleteDoneFalseFromCondo(identifier);
            }
          }
        } catch {}

        return recordToStore;
      };

      try {
        const resp = await fetch(AUX_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upsert", item: rec }),
        });

        const text = await resp.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }

        if (resp.ok && parsed?.item) {
          const saved = normalizePartyRecord(parsed.item);
          return await persistLocalRecord(saved);
        }

        return await persistLocalRecord(rec);
      } catch (e) {
        console.warn("[useParties] handleSavePartyDraft error", e);
        return await persistLocalRecord(rec);
      }
    },
    [findExistingSavedRecord, syncSelectedPartyState, upsertIntoParties]
  );

  const handleRemoveParty = useCallback(
    (id: string) => {
      if (!confirm("¿Eliminar este registro?")) return;

      setParties((p) => p.filter((x) => x.id !== id));
      hydratedChecklistRef.current.delete(String(id));

      (async () => {
        try {
          await fetch(AUX_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id }),
          });
        } catch {}

        try {
          const rawMain = localStorage.getItem(LOCAL_STORAGE_KEY);
          const rawAux = localStorage.getItem(AUXILIARIES_LOCAL_KEY);

          const candidates: any[] = [];
          if (rawMain) {
            try {
              const arr = JSON.parse(rawMain);
              if (Array.isArray(arr)) candidates.push(...arr);
            } catch {}
          }
          if (rawAux) {
            try {
              const arr = JSON.parse(rawAux);
              if (Array.isArray(arr)) candidates.push(...arr);
            } catch {}
          }

          const found = candidates.find((x) => String(x.id) === String(id)) ?? null;

          if (found && isMarkedAsAuxiliary(found)) {
            const identifier = String(found.id ?? found.companyId ?? id);
            await tryFindAndDeleteDoneFalseFromCondo(identifier);
          }
        } catch (e) {
          console.warn("[useParties] handleRemoveParty - condo delete attempt failed", e);
        }
      })();

      if (selectedPartyId === id) {
        resetSelection();
      }
    },
    [resetSelection, selectedPartyId]
  );

  const handleNewPartyPhotoChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const dataUrl = (await readFileAsDataUrl(file)) ?? undefined;
    setNewPartyDraft((d) => ({ ...d, photoDataUrl: dataUrl }));
    setPartyPhotoPreview(dataUrl);
  }, []);

  const updatePartyChecklist = useCallback(
    async (partyId: string, checklist: any[]) => {
      if (!partyId) return null;
      const normalized = normalizeChecklistRaw(checklist);

      let snapshot: any = null;
      setParties((prev) => {
        const copy = prev.map((p) =>
          String(p.id) === String(partyId) ? { ...p, checklist: normalized } : p
        );
        snapshot =
          copy.find((p) => String(p.id) === String(partyId)) ?? {
            id: partyId,
            checklist: normalized,
          };
        return copy;
      });

      try {
        await saveChecklistToDb(partyId, normalized);

        await fetch(AUX_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upsert",
            item: { id: partyId, checklist: normalized },
          }),
        });

        try {
          if (!snapshot) snapshot = { id: partyId, checklist: normalized };
          const nowMarked = isMarkedAsAuxiliary(snapshot);
          if (nowMarked) {
            await trySendToCondoAuxiliary(snapshot);
          } else {
            await tryFindAndDeleteDoneFalseFromCondo(String(partyId));
          }
        } catch {}
      } catch (e) {
        console.warn("[useParties] updatePartyChecklist failed", e);
      }

      return normalized;
    },
    []
  );

  const toggleChecklistForParty = useCallback(
    async (partyId: string, item: string | ChecklistItem) => {
      if (!partyId) return null;
      let newChecklist: PartyChecklist = [] as PartyChecklist;

      setParties((prev) => {
        const copy = prev.map((p) => {
          if (String(p.id) !== String(partyId)) return p;
          const list = Array.isArray(p.checklist) ? p.checklist.slice() : ([] as PartyChecklist);
          const has = checklistIncludes(list, item);
          newChecklist = has ? checklistRemove(list, item) : checklistAdd(list, item);
          return { ...p, checklist: newChecklist };
        });
        return copy;
      });

      try {
        await updatePartyChecklist(partyId, newChecklist as any);
      } catch (e) {
        console.warn("[useParties] toggleChecklistForParty - persist failed", e);
      }

      return newChecklist;
    },
    [updatePartyChecklist]
  );

  const toggleChecklistInDraft = useCallback((item: string | ChecklistItem) => {
    setNewPartyDraft((d) => {
      const list = Array.isArray(d.checklist) ? d.checklist.slice() : ([] as PartyChecklist);
      const has = checklistIncludes(list, item);
      const next = has ? checklistRemove(list, item) : checklistAdd(list, item);
      return { ...d, checklist: next };
    });
  }, []);

  const addChecklistItemToDraft = useCallback((item: string | ChecklistItem) => {
    setNewPartyDraft((d) => {
      const list = Array.isArray(d.checklist) ? d.checklist.slice() : ([] as PartyChecklist);
      const next = checklistAdd(list, item);
      return { ...d, checklist: next };
    });
  }, []);

  const removeChecklistItemFromDraft = useCallback((item: string | ChecklistItem) => {
    setNewPartyDraft((d) => {
      const list = Array.isArray(d.checklist) ? d.checklist.slice() : ([] as PartyChecklist);
      const next = checklistRemove(list, item);
      return { ...d, checklist: next };
    });
  }, []);

  const selectedNormalizedParty = useCallback(
    (idOrRec?: string | PartyRecord) => {
      if (!idOrRec) return undefined;
      if (typeof idOrRec === "string") {
        return parties.find((p) => p.id === idOrRec);
      }
      return idOrRec;
    },
    [parties]
  );

  return {
    partyInfo,
    setPartyInfo,
    parties,
    setParties,
    selectedPartyId,
    setSelectedPartyId: handleSelectParty,
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
    handleCancelPartyForm: () => {
      setShowNewPartyForm(false);
      setEditingPartyId(undefined);
      setNewPartyDraft(createEmptyPartyDraft());
      setPartyPhotoPreview(undefined);
    },
    handleRemoveParty,
    handleNewPartyPhotoChange,
    partyKeyFromParty,
    partiesForRole,
    selectedNormalizedParty,
    updatePartyChecklist,
    toggleChecklistInDraft,
    addChecklistItemToDraft,
    removeChecklistItemFromDraft,
    toggleChecklistForParty,
  };
}