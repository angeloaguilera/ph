// hooks/useParties.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { genId, readFileAsDataUrl } from "../../../../lib/invoiceUtils";
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
  CONDO_AUXILIARY_API,
} from "./constants";

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function toLowerText(value: unknown): string {
  return toText(value).toLowerCase();
}

function hasOwnerOrContractorMarker(source: any): boolean {
  if (!source) return false;

  const directFlags = [
    source?.isPropietario,
    source?.isProveedorContratista,
    source?.propietario,
    source?.contratista,
    source?.esPropietario,
    source?.esContratista,
    source?.propietarios,
    source?.contratistas,
    source?.hasPropietario,
    source?.hasContratista,
  ];

  if (directFlags.some(Boolean)) return true;

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

  const metaText = toLowerText(source?.meta ? JSON.stringify(source.meta) : "");
  if (
    metaText.includes("propiet") ||
    metaText.includes("contrat") ||
    metaText.includes("dueñ") ||
    metaText.includes("dueño")
  ) {
    return true;
  }

  return false;
}

export default function useParties(initialParty?: Partial<PartyInfo>) {
  const defaultParty: PartyInfo = {
    partyType: (initialParty?.partyType as any) ?? "NATURAL",
    name: initialParty?.name ?? "",
    phone: initialParty?.phone ?? "",
    email: initialParty?.email ?? "",
    address: initialParty?.address ?? "",
    city: initialParty?.city ?? "",
    country: initialParty?.country ?? "",
    rif: initialParty?.rif ?? "",
    nit: initialParty?.nit ?? "",
    photoDataUrl: (initialParty as any)?.photoDataUrl ?? undefined,
    companyId: (initialParty as any)?.companyId ?? undefined,
  };

  const [partyInfo, setPartyInfo] = useState<PartyInfo>(defaultParty);
  const [parties, setParties] = useState<PartyRecord[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | "">("");
  const [showNewPartyForm, setShowNewPartyForm] = useState(false);

  type NewPartyDraft = Partial<PartyRecord> & {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    isPropietario?: boolean;
    isProveedorContratista?: boolean;
  };

  const [newPartyDraft, setNewPartyDraft] = useState<NewPartyDraft>({
    partyType: "NATURAL",
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "",
    rif: "",
    nit: "",
    photoDataUrl: undefined,
    companyId: "",
    checklist: [] as unknown as PartyChecklist,
    isPropietario: false,
    isProveedorContratista: false,
  });

  const [partyPhotoPreview, setPartyPhotoPreview] = useState<string | undefined>(
    defaultParty.photoDataUrl
  );
  const [editingPartyId, setEditingPartyId] = useState<string | undefined>(undefined);
  const [receiptPartyRole, setReceiptPartyRole] = useState<PartyRole>("CLIENTE");
  const pendingSavedRef = useRef<Map<string, PartyRecord>>(new Map());

  const normalizeChecklistRaw = useCallback((raw: any): PartyChecklist => {
    const arr = Array.isArray(raw) ? raw.slice() : raw ? [raw] : [];
    const mapped = arr
      .filter((x) => x !== undefined && x !== null)
      .map((x) => {
        if (typeof x === "string") return toText(x) as unknown as ChecklistItem;
        return x as ChecklistItem;
      })
      .filter((x) => {
        if (typeof x === "string") return toText(x).length > 0;
        return true;
      });

    const uniq = Array.from(
      new Map(mapped.map((m) => [JSON.stringify(m), m])).values()
    );
    return uniq as PartyChecklist;
  }, []);

  const checklistIncludes = useCallback(
    (list: PartyChecklist | undefined, item: string | ChecklistItem) => {
      if (!Array.isArray(list)) return false;
      const key = JSON.stringify(item);
      return list.some((i) => JSON.stringify(i) === key);
    },
    []
  );

  const checklistAdd = useCallback(
    (list: PartyChecklist | undefined, item: string | ChecklistItem) => {
      const base = Array.isArray(list) ? list.slice() : [];
      if (checklistIncludes(base as PartyChecklist, item)) return base as PartyChecklist;
      base.push(
        typeof item === "string"
          ? (item as unknown as ChecklistItem)
          : (item as ChecklistItem)
      );
      return normalizeChecklistRaw(base) as PartyChecklist;
    },
    [checklistIncludes, normalizeChecklistRaw]
  );

  const checklistRemove = useCallback(
    (list: PartyChecklist | undefined, item: string | ChecklistItem) => {
      const base = Array.isArray(list) ? list.slice() : [];
      const key = JSON.stringify(item);
      const filtered = base.filter((i) => JSON.stringify(i) !== key);
      return filtered as PartyChecklist;
    },
    []
  );

  const normalizePartyRecord = useCallback(
    (raw: any): PartyRecord => {
      const id = raw?.id && toText(raw.id) ? String(raw.id) : genId();
      const companyId = raw?.companyId && toText(raw.companyId) ? String(raw.companyId) : id;
      const partyType = (raw?.partyType ?? "NATURAL") as PartyRecord["partyType"];

      const firstName = toText(raw?.firstName);
      const lastName = toText(raw?.lastName);
      const companyName = toText(raw?.companyName);
      const rawName = toText(raw?.name);

      const name =
        (
          partyType === "JURIDICA"
            ? companyName || rawName
            : rawName || `${firstName} ${lastName}`.trim()
        ) || "Sin nombre";

      let checklist: PartyChecklist = normalizeChecklistRaw(raw?.checklist);

      if (raw?.propietario) checklist = checklistAdd(checklist, "propietario");
      if (raw?.contratista) checklist = checklistAdd(checklist, "contratista");

      return {
        id,
        companyId,
        role: raw?.role ?? "CLIENTE",
        partyType,
        name,
        phone: raw?.phone ?? "",
        email: raw?.email ?? "",
        address: raw?.address ?? "",
        city: raw?.city ?? "",
        country: raw?.country ?? "",
        rif: raw?.rif ?? "",
        nit: partyType === "JURIDICA" ? raw?.nit ?? "" : undefined,
        photoDataUrl: raw?.photoDataUrl ?? undefined,
        checklist,
        meta: raw?.meta ?? {},
        createdAt: raw?.createdAt,
        updatedAt: raw?.updatedAt,
      } as PartyRecord;
    },
    [checklistAdd, normalizeChecklistRaw]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = Array.isArray(parsed)
          ? parsed.map((p) => normalizePartyRecord(p))
          : [];
        setParties(normalized);
        return;
      }
    } catch (err) {
      console.warn("[useParties] error reading LOCAL_STORAGE_KEY", err);
    }

    try {
      const rawAux = localStorage.getItem(AUXILIARIES_LOCAL_KEY);
      if (rawAux) {
        const parsed = JSON.parse(rawAux);
        setParties(
          Array.isArray(parsed)
            ? parsed.map((p: any) => normalizePartyRecord(p))
            : []
        );
      }
    } catch (err) {
      console.warn("[useParties] error reading AUXILIARIES_LOCAL_KEY", err);
    }
  }, [normalizePartyRecord]);

  useEffect(() => {
    try {
      const normalized = parties.map((p) => normalizePartyRecord(p));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      localStorage.setItem(AUXILIARIES_LOCAL_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.warn("[useParties] error saving to localStorage", err);
    }
  }, [parties, normalizePartyRecord]);

  const partyKeyFromParty = useCallback(
    (partyRec: PartyRecord | { companyId?: string; id?: string } | undefined) => {
      if (!partyRec) return "";
      const cid = partyRec.companyId;
      if (cid && toText(cid)) return String(cid);
      const id = partyRec.id;
      if (id && toText(id)) return String(id);
      return "";
    },
    []
  );

  const isMarkedAsAuxiliary = useCallback((rec: any) => {
    return hasOwnerOrContractorMarker(rec);
  }, []);

  const validateCondoAuxPayload = useCallback((rec: any) => {
    if (!rec) return false;
    const name = toText(rec?.name ?? rec?.companyName);
    if (!name) return false;
    return true;
  }, []);

  const trySendToCondoAuxiliary = useCallback(
    async (rec: any) => {
      if (!rec) return;
      try {
        if (!isMarkedAsAuxiliary(rec)) return;
        if (!validateCondoAuxPayload(rec)) return;

        const resp = await fetch(CONDO_AUXILIARY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upsert", item: rec }),
        });

        const text = await resp.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }

        if (!resp.ok) {
          console.warn("[useParties] CONDO_AUXILIARY_API upsert failed", {
            status: resp.status,
            body: parsed,
            sent: rec,
          });
        } else {
          console.info("[useParties] CONDO_AUXILIARY_API upsert success", {
            status: resp.status,
            body: parsed,
          });
        }
      } catch (e) {
        console.error("[useParties] trySendToCondoAuxiliary error", e, rec);
      }
    },
    [isMarkedAsAuxiliary, validateCondoAuxPayload]
  );

  const tryDeleteFromCondoAuxiliary = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const resp = await fetch(CONDO_AUXILIARY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });

      const text = await resp.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      if (!resp.ok) {
        console.warn("[useParties] CONDO_AUXILIARY_API delete failed", {
          status: resp.status,
          body: parsed,
          id,
        });
      } else {
        console.info("[useParties] CONDO_AUXILIARY_API delete success", {
          status: resp.status,
          body: parsed,
          id,
        });
      }
    } catch (e) {
      console.error("[useParties] tryDeleteFromCondoAuxiliary failed", e, id);
    }
  }, []);

  const tryFindAndDeleteDoneFalseFromCondo = useCallback(
    async (identifier: string) => {
      if (!identifier) return;

      try {
        const queryBody = {
          action: "find",
          query: {
            $or: [{ id: identifier }, { companyId: identifier }],
            done: false,
          },
        };

        const respFind = await fetch(CONDO_AUXILIARY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queryBody),
        });

        const text = await respFind.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }

        const items: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.items)
          ? parsed.items
          : [];

        if (!items || items.length === 0) return;

        for (const it of items) {
          try {
            const itemId = it?.id ?? it?.companyId ?? identifier;
            await tryDeleteFromCondoAuxiliary(itemId);
          } catch (innerErr) {
            console.warn(
              "[useParties] tryFindAndDeleteDoneFalseFromCondo - error en item loop",
              innerErr,
              it
            );
          }
        }
      } catch (e) {
        console.error(
          "[useParties] tryFindAndDeleteDoneFalseFromCondo failed",
          e,
          identifier
        );
      }
    },
    [tryDeleteFromCondoAuxiliary]
  );

  const findExistingSavedRecord = useCallback(
    (rec: { id?: string; companyId?: string } | undefined) => {
      if (!rec) return null;
      const id = rec.id ?? undefined;
      const cid = rec.companyId ?? undefined;

      if (id) {
        const found = parties.find(
          (p) => String(p.id) === String(id) || String(p.companyId) === String(id)
        );
        if (found) return found;
      }

      if (cid) {
        const found = parties.find(
          (p) =>
            String(p.companyId) === String(cid) || String(p.id) === String(cid)
        );
        if (found) return found;
      }

      try {
        const raw =
          localStorage.getItem(LOCAL_STORAGE_KEY) ??
          localStorage.getItem(AUXILIARIES_LOCAL_KEY);
        if (raw) {
          const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
          const found = (arr as any[]).find(
            (x) =>
              String(x.id) === String(id) ||
              String(x.companyId) === String(id) ||
              String(x.id) === String(cid) ||
              String(x.companyId) === String(cid)
          );
          if (found) return normalizePartyRecord(found);
        }
      } catch {}

      return null;
    },
    [parties, normalizePartyRecord]
  );

  function buildPartyRecordFromDraft(
    draft: any,
    role: PartyRole,
    id?: string
  ): PartyRecord {
    const partyType = (draft.partyType ?? "NATURAL") as PartyRecord["partyType"];

    const companyName = toText(draft.companyName);
    const draftName = toText(draft.name);
    const firstName = toText(draft.firstName);
    const lastName = toText(draft.lastName);

    let name = "";

    if (partyType === "JURIDICA") {
      name = companyName || draftName;
    } else {
      name = draftName || `${firstName} ${lastName}`.trim();
    }

    if (!name) name = "Sin nombre";

    const finalId = id ?? genId();
    const companyId = toText(draft.companyId) ? String(draft.companyId) : finalId;

    let checklist = normalizeChecklistRaw(draft?.checklist);

    if (draft?.isPropietario) {
      checklist = checklistAdd(checklist, "propietario");
    }

    if (draft?.isProveedorContratista) {
      checklist = checklistAdd(checklist, "contratista");
    }

    const rec: PartyRecord = {
      id: finalId,
      role,
      partyType,
      name,
      phone: draft.phone ?? "",
      email: draft.email ?? "",
      address: draft.address ?? "",
      city: draft.city ?? "",
      country: draft.country ?? "",
      rif: draft.rif ?? "",
      nit: partyType === "JURIDICA" ? draft.nit ?? "" : undefined,
      photoDataUrl: draft.photoDataUrl ?? undefined,
      companyId,
      checklist,
      meta: draft.meta ?? {},
    } as PartyRecord;

    return rec;
  }

  const handleSelectParty = useCallback(
    (idOrRec: string | PartyRecord | undefined) => {
      if (!idOrRec) {
        setSelectedPartyId("");
        setPartyInfo({
          partyType: "NATURAL",
          name: "",
          phone: "",
          email: "",
          address: "",
          city: "",
          country: "",
          rif: "",
          nit: "",
          photoDataUrl: undefined,
        });
        setPartyPhotoPreview(undefined);
        return;
      }

      let found: PartyRecord | undefined;

      if (typeof idOrRec === "string") {
        const idStr = String(idOrRec);
        found = parties.find(
          (p) => String(p.id) === idStr || String(p.companyId) === idStr
        );

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
            typeof idOrRec === "string"
              ? idOrRec
              : (idOrRec as any)?.id ?? "<no-id>"
          }`
        );
        return;
      }

      const normalized = normalizePartyRecord(found);

      setSelectedPartyId(normalized.id);
      setPartyInfo({
        partyType: normalized.partyType,
        name: normalized.name,
        phone: normalized.phone,
        email: normalized.email,
        address: normalized.address,
        city: normalized.city,
        country: normalized.country,
        rif: normalized.rif,
        nit: normalized.nit ?? "",
        photoDataUrl: normalized.photoDataUrl,
        companyId: normalized.companyId,
      });
      setPartyPhotoPreview(normalized.photoDataUrl);

      return normalized;
    },
    [parties, normalizePartyRecord]
  );

  const upsertIntoParties = useCallback((newRec: PartyRecord, editingId?: string) => {
    setParties((prev) => {
      const foundIndex = prev.findIndex(
        (p) => p.id === newRec.id || (newRec.companyId && p.companyId === newRec.companyId)
      );

      if (editingId) {
        return prev.map((p) => (p.id === editingId ? newRec : p));
      }

      if (foundIndex !== -1) {
        const copy = [...prev];
        copy[foundIndex] = newRec;
        return copy;
      }

      return [newRec, ...prev];
    });
  }, []);

  const saveChecklistToDb = useCallback(async (partyId: string, checklist: PartyChecklist) => {
    try {
      await fetch(AUX_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_checklist",
          partyId: String(partyId),
          checklist,
        }),
      });
    } catch (e) {
      console.warn("[useParties] saveChecklistToDb failed", e);
    }
  }, []);

  async function handleSavePartyDraft(
    draft: any,
    role: PartyRole,
    selectAfterSave = true,
    editingId?: string
  ) {
    const rec = buildPartyRecordFromDraft(draft, role, editingId);

    const prevSaved = findExistingSavedRecord({ id: rec.id, companyId: rec.companyId });
    const prevMarked = isMarkedAsAuxiliary(prevSaved);

    try {
      const body = { action: "upsert", item: rec };

      const resp = await fetch(AUX_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        pendingSavedRef.current.set(saved.id, saved);
        upsertIntoParties(saved, editingId);

        if (Array.isArray(saved.checklist) && saved.checklist.length > 0) {
          saveChecklistToDb(saved.id, saved.checklist);
        }

        if (selectAfterSave) {
          setSelectedPartyId(saved.id);
          setPartyInfo({
            partyType: saved.partyType,
            name: saved.name,
            phone: saved.phone,
            email: saved.email,
            address: saved.address,
            city: saved.city,
            country: saved.country,
            rif: saved.rif,
            nit: saved.nit ?? "",
            photoDataUrl: saved.photoDataUrl,
            companyId: saved.companyId,
          });
          setPartyPhotoPreview(saved.photoDataUrl);
        }

        try {
          const nowMarked = isMarkedAsAuxiliary(saved);
          if (nowMarked) {
            await trySendToCondoAuxiliary(saved);
          } else if (prevMarked && !nowMarked) {
            const identifier = saved.id ?? saved.companyId ?? "";
            if (identifier) {
              await tryFindAndDeleteDoneFalseFromCondo(identifier);
            }
          }
        } catch {}

        return saved;
      } else {
        pendingSavedRef.current.set(rec.id, rec);
        upsertIntoParties(rec, editingId);

        if (Array.isArray(rec.checklist) && rec.checklist.length > 0) {
          saveChecklistToDb(rec.id, rec.checklist);
        }

        if (selectAfterSave) {
          setSelectedPartyId(rec.id);
          setPartyInfo({
            partyType: rec.partyType,
            name: rec.name,
            phone: rec.phone,
            email: rec.email,
            address: rec.address,
            city: rec.city,
            country: rec.country,
            rif: rec.rif,
            nit: rec.nit ?? "",
            photoDataUrl: rec.photoDataUrl,
            companyId: rec.companyId,
          });
          setPartyPhotoPreview(rec.photoDataUrl);
        }

        try {
          const nowMarked = isMarkedAsAuxiliary(rec);
          if (nowMarked) {
            await trySendToCondoAuxiliary(rec);
          } else if (prevMarked && !nowMarked) {
            const identifier = rec.id ?? rec.companyId ?? "";
            if (identifier) {
              await tryFindAndDeleteDoneFalseFromCondo(identifier);
            }
          }
        } catch {}

        return rec;
      }
    } catch (e) {
      console.warn("[useParties] handleSavePartyDraft error", e);

      pendingSavedRef.current.set(rec.id, rec);
      upsertIntoParties(rec, editingId);

      if (Array.isArray(rec.checklist) && rec.checklist.length > 0) {
        saveChecklistToDb(rec.id, rec.checklist);
      }

      if (selectAfterSave) {
        setSelectedPartyId(rec.id);
        setPartyInfo({
          partyType: rec.partyType,
          name: rec.name,
          phone: rec.phone,
          email: rec.email,
          address: rec.address,
          city: rec.city,
          country: rec.country,
          rif: rec.rif,
          nit: rec.nit ?? "",
          photoDataUrl: rec.photoDataUrl,
          companyId: rec.companyId,
        });
        setPartyPhotoPreview(rec.photoDataUrl);
      }

      try {
        const nowMarked = isMarkedAsAuxiliary(rec);
        if (nowMarked) {
          await trySendToCondoAuxiliary(rec);
        } else if (prevMarked && !nowMarked) {
          const identifier = rec.id ?? rec.companyId ?? "";
          if (identifier) {
            await tryFindAndDeleteDoneFalseFromCondo(identifier);
          }
        }
      } catch {}

      return rec;
    }
  }

  function handleRemoveParty(id: string) {
    if (!confirm("¿Eliminar este registro?")) return;

    setParties((p) => p.filter((x) => x.id !== id));

    (async () => {
      try {
        await fetch(AUX_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id }),
        });
      } catch {}

      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        let found: any = null;

        if (raw) {
          try {
            const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
            found =
              (arr as any[]).find(
                (x) =>
                  String(x.id) === String(id) || String(x.companyId) === String(id)
              ) ?? null;
          } catch {}
        }

        if (!found) {
          const rawAux = localStorage.getItem(AUXILIARIES_LOCAL_KEY);
          if (rawAux) {
            try {
              const arr = Array.isArray(JSON.parse(rawAux)) ? JSON.parse(rawAux) : [];
              found =
                (arr as any[]).find(
                  (x) =>
                    String(x.id) === String(id) ||
                    String(x.companyId) === String(id)
                ) ?? null;
            } catch {}
          }
        }

        if (found && isMarkedAsAuxiliary(found)) {
          const identifier = String(found.id ?? found.companyId ?? id);
          await tryFindAndDeleteDoneFalseFromCondo(identifier);
        }
      } catch (e) {
        console.warn("[useParties] handleRemoveParty - condo delete attempt failed", e);
      }
    })();

    if (selectedPartyId === id) {
      setSelectedPartyId("");
      setPartyInfo({
        partyType: "NATURAL",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        country: "",
        rif: "",
        nit: "",
        photoDataUrl: undefined,
      });
      setPartyPhotoPreview(undefined);
    }
  }

  const handleNewPartyPhotoChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const dataUrl = (await readFileAsDataUrl(file)) ?? undefined;
    setNewPartyDraft((d: any) => ({ ...d, photoDataUrl: dataUrl }));
    setPartyPhotoPreview(dataUrl);
  };

  const currentRole = useMemo(() => receiptPartyRole, [receiptPartyRole]);
  const partiesForRole = useMemo(
    () => parties.filter((r) => r.role === currentRole),
    [parties, currentRole]
  );

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
        await fetch(AUX_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upsert_checklist",
            partyId: String(partyId),
            checklist: normalized,
          }),
        });

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
    [
      isMarkedAsAuxiliary,
      normalizeChecklistRaw,
      tryFindAndDeleteDoneFalseFromCondo,
      trySendToCondoAuxiliary,
    ]
  );

  const toggleChecklistForParty = useCallback(
    async (partyId: string, item: string | ChecklistItem) => {
      if (!partyId) return null;
      let newChecklist: PartyChecklist = [] as PartyChecklist;

      setParties((prev) => {
        const copy = prev.map((p) => {
          if (String(p.id) !== String(partyId)) return p;
          const list = Array.isArray(p.checklist)
            ? p.checklist.slice()
            : ([] as PartyChecklist);
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
    [checklistAdd, checklistIncludes, checklistRemove, updatePartyChecklist]
  );

  const toggleChecklistInDraft = useCallback(
    (item: string | ChecklistItem) => {
      setNewPartyDraft((d: any) => {
        const list = Array.isArray(d.checklist) ? d.checklist.slice() : ([] as PartyChecklist);
        const has = checklistIncludes(list, item);
        const next = has ? checklistRemove(list, item) : checklistAdd(list, item);
        return { ...d, checklist: next };
      });
    },
    [checklistAdd, checklistIncludes, checklistRemove]
  );

  const addChecklistItemToDraft = useCallback(
    (item: string | ChecklistItem) => {
      setNewPartyDraft((d: any) => {
        const list = Array.isArray(d.checklist) ? d.checklist.slice() : ([] as PartyChecklist);
        const next = checklistAdd(list, item);
        return { ...d, checklist: next };
      });
    },
    [checklistAdd]
  );

  const removeChecklistItemFromDraft = useCallback(
    (item: string | ChecklistItem) => {
      setNewPartyDraft((d: any) => {
        const list = Array.isArray(d.checklist) ? d.checklist.slice() : ([] as PartyChecklist);
        const next = checklistRemove(list, item);
        return { ...d, checklist: next };
      });
    },
    [checklistRemove]
  );

  const selectedNormalizedParty = useCallback(
    (idOrRec?: string | PartyRecord) => {
      if (!idOrRec) return undefined;
      if (typeof idOrRec === "string") {
        return parties.find((p) => p.id === idOrRec || p.companyId === idOrRec);
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
      setNewPartyDraft({
        partyType: "NATURAL",
        firstName: "",
        lastName: "",
        companyName: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        country: "",
        rif: "",
        nit: "",
        photoDataUrl: undefined,
        companyId: "",
        checklist: [] as unknown as PartyChecklist,
        isPropietario: false,
        isProveedorContratista: false,
      });
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