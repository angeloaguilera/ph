import { genId } from "../../../../../lib/invoiceUtils";
import type {
  PartyInfo,
  PartyRecord,
  PartyRole,
  PartyChecklist,
  ChecklistItem,
} from "../../../../../types/invoice";

export type PartyDraft = {
  partyType: PartyInfo["partyType"];
  firstName: string;
  lastName: string;
  companyName: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  rif: string;
  nit: string;
  photoDataUrl?: string;
  companyId: string;
  checklist: PartyChecklist;
  isPropietario: boolean;
  isProveedorContratista: boolean;
  actividadEconomica: string;
  condicionRetencion: string;
  retencion: string;
  activityEconomic: string;
  condition: string;
  retentionNote: string;
  rifMatchedLine: string;
  rawText: string;
  needsManualReview: boolean;
  documentType: string;
  meta?: Record<string, unknown>;
};

export function toText(value: unknown): string {
  return String(value ?? "").trim();
}

export function toLowerText(value: unknown): string {
  return toText(value).toLowerCase();
}

export function createEmptyPartyInfo(initial?: Partial<PartyInfo>): PartyInfo {
  return {
    partyType: (initial?.partyType as any) ?? "NATURAL",
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    state: (initial as any)?.state ?? "",
    country: initial?.country ?? "",
    rif: initial?.rif ?? "",
    nit: initial?.nit ?? "",
    photoDataUrl: (initial as any)?.photoDataUrl ?? undefined,
    companyId: (initial as any)?.companyId ?? undefined,
  };
}

export function normalizeChecklistRaw(raw: any): PartyChecklist {
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

  const uniq = Array.from(new Map(mapped.map((m) => [JSON.stringify(m), m])).values());
  return uniq as PartyChecklist;
}

export function checklistIncludes(
  list: PartyChecklist | undefined,
  item: string | ChecklistItem
): boolean {
  if (!Array.isArray(list)) return false;
  const key = JSON.stringify(item);
  return list.some((i) => JSON.stringify(i) === key);
}

export function checklistAdd(
  list: PartyChecklist | undefined,
  item: string | ChecklistItem
): PartyChecklist {
  const base = Array.isArray(list) ? list.slice() : [];
  if (checklistIncludes(base as PartyChecklist, item)) return base as PartyChecklist;

  base.push(
    typeof item === "string"
      ? (item as unknown as ChecklistItem)
      : (item as ChecklistItem)
  );
  return normalizeChecklistRaw(base) as PartyChecklist;
}

export function checklistRemove(
  list: PartyChecklist | undefined,
  item: string | ChecklistItem
): PartyChecklist {
  const base = Array.isArray(list) ? list.slice() : [];
  const key = JSON.stringify(item);
  return base.filter((i) => JSON.stringify(i) !== key) as PartyChecklist;
}

export function hasOwnerOrContractorMarker(source: any): boolean {
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

      if (item?.done === true && (text.includes("propiet") || text.includes("contrat"))) {
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

export function isMarkedAsAuxiliary(rec: any): boolean {
  return hasOwnerOrContractorMarker(rec);
}

export function createEmptyPartyDraft(initial?: Partial<PartyDraft>): PartyDraft {
  return {
    partyType: "NATURAL",
    firstName: "",
    lastName: "",
    companyName: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "",
    rif: "",
    nit: "",
    photoDataUrl: undefined,
    companyId: "",
    isPropietario: false,
    isProveedorContratista: false,
    actividadEconomica: "",
    condicionRetencion: "",
    retencion: "",
    activityEconomic: "",
    condition: "",
    retentionNote: "",
    rifMatchedLine: "",
    rawText: "",
    needsManualReview: false,
    documentType: "rif",
    meta: {},
    ...initial,
    checklist: normalizeChecklistRaw(initial?.checklist ?? []),
  };
}

export function normalizePartyRecord(raw: any): PartyRecord {
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
        ? rawName || companyName
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
    state: raw?.state ?? raw?.estado ?? "",
    country: raw?.country ?? "",
    rif: raw?.rif ?? "",
    nit: partyType === "JURIDICA" ? raw?.nit ?? "" : undefined,
    photoDataUrl: raw?.photoDataUrl ?? undefined,
    checklist,
    meta: raw?.meta ?? {},
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,

    activityEconomic:
      raw?.activityEconomic ?? raw?.actividadEconomica ?? raw?.activity_economic ?? "",

    condition:
      raw?.condition ?? raw?.condicionRetencion ?? raw?.retentionNote ?? "",

    retentionNote: raw?.retentionNote ?? raw?.retencion ?? "",

    actividadEconomica:
      raw?.actividadEconomica ?? raw?.activityEconomic ?? raw?.activity_economic ?? "",

    condicionRetencion:
      raw?.condicionRetencion ?? raw?.condition ?? raw?.retentionNote ?? "",
  } as PartyRecord;
}

export function normalizeDraftFromParty(p: PartyRecord) {
  const anyP = p as any;
  return {
    partyType: p.partyType ?? "NATURAL",
    firstName: "",
    lastName: "",
    companyName: p.partyType === "JURIDICA" ? p.name ?? "" : "",
    name: p.name ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    state: anyP.state ?? anyP.estado ?? "",
    country: p.country ?? "",
    rif: p.rif ?? "",
    nit: p.nit ?? "",
    photoDataUrl: p.photoDataUrl ?? undefined,
    companyId: p.companyId ?? "",
    checklist: (p.checklist ?? []) as PartyChecklist,
    isPropietario: false,
    isProveedorContratista: false,
    actividadEconomica: anyP.actividadEconomica ?? anyP.activityEconomic ?? "",
    condicionRetencion:
      anyP.condicionRetencion ?? anyP.condition ?? anyP.retentionNote ?? "",
    retencion: anyP.retentionNote ?? anyP.retencion ?? "",
    activityEconomic: anyP.activityEconomic ?? anyP.actividadEconomica ?? "",
    condition: anyP.condition ?? anyP.condicionRetencion ?? "",
    retentionNote: anyP.retentionNote ?? anyP.retencion ?? "",
    rifMatchedLine: anyP.rifMatchedLine ?? "",
    rawText: anyP.rawText ?? "",
    needsManualReview: Boolean(anyP.needsManualReview),
    documentType: anyP.documentType ?? "rif",
    meta: anyP.meta ?? {},
  };
}

export function buildPartyRecordFromDraft(
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
    name = draftName || companyName;
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
    state: draft.state ?? draft.estado ?? "",
    country: draft.country ?? "",
    rif: draft.rif ?? "",
    nit: partyType === "JURIDICA" ? draft.nit ?? "" : undefined,
    photoDataUrl: draft.photoDataUrl ?? undefined,
    companyId,
    checklist,
    meta: draft.meta ?? {},

    activityEconomic: draft.activityEconomic ?? draft.actividadEconomica ?? "",
    condition: draft.condition ?? draft.condicionRetencion ?? "",
    retentionNote: draft.retentionNote ?? draft.retencion ?? "",

    actividadEconomica: draft.actividadEconomica ?? draft.activityEconomic ?? "",
    condicionRetencion: draft.condicionRetencion ?? draft.condition ?? "",
  } as PartyRecord;

  return rec;
}

export function createPartyInfoFromRecord(p: PartyRecord): PartyInfo {
  return {
    partyType: p.partyType ?? "NATURAL",
    name: p.name ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    state: (p as any).state ?? "",
    country: p.country ?? "",
    rif: p.rif ?? "",
    nit: p.nit ?? "",
    photoDataUrl: p.photoDataUrl,
    companyId: p.companyId,
  };
}

export function partyKeyFromParty(
  partyRec: PartyRecord | { companyId?: string; id?: string } | undefined
): string {
  if (!partyRec) return "";
  const cid = partyRec.companyId;
  if (cid && toText(cid)) return String(cid);
  const id = partyRec.id;
  if (id && toText(id)) return String(id);
  return "";
}