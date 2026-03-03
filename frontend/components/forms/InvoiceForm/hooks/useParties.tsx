// hooks/useParties.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { genId, readFileAsDataUrl } from "../../../../lib/invoiceUtils";
import type { PartyInfo, PartyRecord, PartyRole } from "../../../../types/invoice";
import { LOCAL_STORAGE_KEY, AUXILIARIES_LOCAL_KEY, AUX_API, EMPLOYEES_LOCAL_KEY } from "./constants";

/**
 * useParties
 * - mantiene parties en localStorage
 * - buildPartyRecordFromDraft + save handler
 * - handleSelectParty (acepta id o PartyRecord)
 */
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
  const [newPartyDraft, setNewPartyDraft] = useState<any>({
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
  });
  const [partyPhotoPreview, setPartyPhotoPreview] = useState<string | undefined>(defaultParty.photoDataUrl);
  const [editingPartyId, setEditingPartyId] = useState<string | undefined>(undefined);
  const [receiptPartyRole, setReceiptPartyRole] = useState<PartyRole>("CLIENTE");

  // ref para guardar temporalmente registros recién guardados y evitar races
  const pendingSavedRef = useRef<Map<string, PartyRecord>>(new Map());

  // normalize helper (re-usable)
  const normalizePartyRecord = useCallback((raw: any): PartyRecord => {
    const id = raw?.id && String(raw.id).trim() ? String(raw.id) : genId();
    // ensure companyId falls back to id
    const companyId = raw?.companyId && String(raw.companyId).trim() ? String(raw.companyId) : id;
    const partyType = (raw?.partyType ?? "NATURAL") as PartyRecord["partyType"];
    const name =
      (partyType === "JURIDICA"
        ? raw?.companyName ?? raw?.name
        : raw?.name ?? `${(raw?.firstName ?? "").toString().trim()} ${(raw?.lastName ?? "").toString().trim()}`)
      .toString()
      .trim() || "Sin nombre";

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
      nit: partyType === "JURIDICA" ? (raw?.nit ?? "") : undefined,
      photoDataUrl: raw?.photoDataUrl ?? undefined,
    } as PartyRecord;
  }, []);

  /* load parties from localStorage on mount
     -> prefer LOCAL_STORAGE_KEY, use AUXILIARIES_LOCAL_KEY only as fallback
  */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = Array.isArray(parsed) ? parsed.map((p) => normalizePartyRecord(p)) : [];
        setParties(normalized);
        return; // stop: we prefer the main key
      }
    } catch (err) {
      console.warn("[useParties] error reading LOCAL_STORAGE_KEY", err);
    }

    // fallback: try auxiliaries only if main key gave nothing
    try {
      const rawAux = localStorage.getItem(AUXILIARIES_LOCAL_KEY);
      if (rawAux) setParties(JSON.parse(rawAux).map((p: any) => normalizePartyRecord(p)));
    } catch (err) {
      console.warn("[useParties] error reading AUXILIARIES_LOCAL_KEY", err);
    }

    // other initial loads (kept for compatibility)
    try {
      const rawE = localStorage.getItem(EMPLOYEES_LOCAL_KEY);
      // other initial loads can be done by other hooks if necessary
    } catch (err) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const normalized = parties.map((p) => normalizePartyRecord(p));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      // keep auxiliaries cache as well
      localStorage.setItem(AUXILIARIES_LOCAL_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.warn("[useParties] error saving to localStorage", err);
    }
  }, [parties, normalizePartyRecord]);

  const partyKeyFromParty = useCallback((partyRec: PartyRecord | { companyId?: string; id?: string } | undefined) => {
    if (!partyRec) return "";
    const cid = partyRec.companyId ?? (partyRec as any).companyId;
    if (cid && String(cid).trim()) return String(cid);
    const id = partyRec.id ?? (partyRec as any).id;
    if (id && String(id).trim()) return String(id);
    return "";
  }, []);

  function buildPartyRecordFromDraft(draft: any, role: PartyRole, id?: string): PartyRecord {
    const partyType = (draft.partyType ?? "NATURAL") as PartyRecord["partyType"];
    let name = "";
    if (partyType === "JURIDICA") {
      name = (draft.companyName ?? draft.name ?? "").toString().trim();
    } else {
      name = ((draft.name ?? "") || `${(draft.firstName ?? "").toString().trim()} ${(draft.lastName ?? "").toString().trim()}`).toString().trim();
    }
    if (!name) name = "Sin nombre";

    const finalId = id ?? genId();
    const companyId = (draft.companyId && String(draft.companyId).trim()) ? String(draft.companyId) : finalId;

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
      nit: partyType === "JURIDICA" ? (draft.nit ?? "") : undefined,
      photoDataUrl: draft.photoDataUrl ?? undefined,
      companyId,
    } as PartyRecord;

    return rec;
  }

  // Busca por id o por companyId, o acepta un PartyRecord
  const handleSelectParty = useCallback((idOrRec: string | PartyRecord | undefined) => {
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
      found = parties.find((p) => String(p.id) === idStr || String(p.companyId) === idStr);

      // si no lo encontramos en parties, chequea el pendingSavedRef (evita race después de guardar)
      if (!found) {
        const pending = pendingSavedRef.current.get(idStr);
        if (pending) {
          found = pending;
          // opcional: limpiar del mapa si ya se resolvió
          pendingSavedRef.current.delete(idStr);
        }
      }
    } else {
      found = idOrRec;
    }

    if (!found) {
      console.warn(`[useParties] handleSelectParty - not found ${typeof idOrRec === "string" ? idOrRec : (idOrRec as any)?.id ?? "<no-id>"}`);
      return;
    }

    const normalized = normalizePartyRecord(found);

    // establecer estado de selección directamente (no depender de parties listo)
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
  }, [parties, normalizePartyRecord]);

  // helper upsert function: reemplaza por id o companyId, o inserta al inicio
  const upsertIntoParties = useCallback((newRec: PartyRecord, editingId?: string) => {
    setParties((prev) => {
      const foundIndex = prev.findIndex((p) => p.id === newRec.id || (newRec.companyId && p.companyId === newRec.companyId));
      if (editingId) {
        // si estamos editando, preferimos mapear por id
        return prev.map((p) => (p.id === editingId ? newRec : p));
      }
      if (foundIndex !== -1) {
        // reemplazar el existente (evita duplicados)
        const copy = [...prev];
        copy[foundIndex] = newRec;
        return copy;
      }
      // si no existe, insertarlo al inicio
      return [newRec, ...prev];
    });
  }, []);

  async function handleSavePartyDraft(draft: any, role: PartyRole, selectAfterSave = true, editingId?: string) {
    const rec = buildPartyRecordFromDraft(draft, role, editingId);
    try {
      const resp = await fetch(AUX_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upsert", item: rec }) });
      const text = await resp.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = null; }

      if (resp.ok && parsed?.item) {
        const saved = normalizePartyRecord(parsed.item);
        // guardar en mapa temporal para que las llamadas con id encuentren el registro si hay race
        pendingSavedRef.current.set(saved.id, saved);
        // upsert en parties (async)
        upsertIntoParties(saved, editingId);
        // setear selección inmediatamente (evita race con llamadas externas)
        if (selectAfterSave) {
          setSelectedPartyId(saved.id); // estado directo
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
        return saved;
      } else {
        // fallback to local update (también con upsert)
        pendingSavedRef.current.set(rec.id, rec);
        upsertIntoParties(rec, editingId);
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
        return rec;
      }
    } catch (e) {
      // error de red -> fallback local (upsert)
      pendingSavedRef.current.set(rec.id, rec);
      upsertIntoParties(rec, editingId);
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
      return rec;
    }
  }

  function handleRemoveParty(id: string) {
    if (!confirm("¿Eliminar este registro?")) return;
    setParties((p) => p.filter((x) => x.id !== id));
    (async () => {
      try { await fetch(AUX_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) }); } catch (e) {}
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

  const currentRole = useMemo(() => {
    // UI consumer will set this appropriately; default CLIENTE
    return receiptPartyRole;
  }, [receiptPartyRole]);

  const partiesForRole = useMemo(() => parties.filter((r) => r.role === currentRole), [parties, currentRole]);

  return {
    partyInfo,
    setPartyInfo,
    parties,
    setParties,
    selectedPartyId,
    // exponemos la función de selección (no el setter de estado crudo)
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
      });
      setPartyPhotoPreview(undefined);
    },
    handleRemoveParty,
    handleNewPartyPhotoChange,
    partyKeyFromParty,
    partiesForRole,
    // utilidad para obtener el registro normalizado (admite id o record)
    selectedNormalizedParty: (idOrRec?: string | PartyRecord) => (idOrRec ? (typeof idOrRec === "string" ? parties.find((p) => p.id === idOrRec || p.companyId === idOrRec) : idOrRec) : undefined),
  };
}
