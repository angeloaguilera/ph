import type { DocItem as AnnexDocItem } from "./AnnexesRow";

export const EMPTY_ANNEX_DOCS: AnnexDocItem[] = [];
export const EMPTY_ANNEX_LIST: any[] = [];

export function sameAnnexDocs(a: AnnexDocItem[] = [], b: AnnexDocItem[] = []) {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];

    if (
      String(x?.id ?? "") !== String(y?.id ?? "") ||
      String(x?.name ?? "") !== String(y?.name ?? "") ||
      String(x?.url ?? "") !== String(y?.url ?? "")
    ) {
      return false;
    }
  }

  return true;
}

export function toText(value: unknown): string {
  return String(value ?? "").trim();
}

export function toLowerText(value: unknown): string {
  return toText(value).toLowerCase();
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

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateTimeLocalValue(value: any): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatDateTimePreview(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "full",
      timeStyle: "medium",
      hour12: false,
    }).format(d);
  } catch {
    return value;
  }
}

export function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function getLineQuantity(item: any): number {
  const q = toNumber(item?.quantity ?? item?.qty ?? 1);
  return q > 0 ? q : 1;
}

export function getLineUnitValue(item: any): number {
  const candidates = [
    item?.unitPrice,
    item?.price,
    item?.rate,
    item?.tarifa,
    item?.fee,
    item?.valor,
  ];

  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }

  return 0;
}

export function getLineTotalValue(item: any): number {
  const explicitTotal = Number(item?.total ?? item?.amount ?? item?.lineTotal);
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
    return explicitTotal;
  }

  const qty = getLineQuantity(item);
  const unit = getLineUnitValue(item);
  const computed = qty * unit;

  return Number.isFinite(computed) ? computed : 0;
}

export function getLineEditableUnit(item: any): number {
  const unit = getLineUnitValue(item);
  if (unit > 0) return unit;

  const total = getLineTotalValue(item);
  const qty = getLineQuantity(item);
  if (qty > 0) return total / qty;

  return total;
}

export function matchById(record: any, id: string) {
  return (
    String(record?.id ?? "") === String(id) ||
    String(record?.masterId ?? record?.id ?? "") === String(id)
  );
}

export function normalizeCatalogRecordForSave(params: {
  rec: any;
  editorRec?: any;
  currentTx?: "venta" | "compra" | undefined;
  partyKey?: string;
  partyHasOwnerOrContractor?: boolean;
}) {
  const { rec, editorRec, currentTx, partyKey, partyHasOwnerOrContractor } =
    params;

  const detectedAux =
    hasOwnerOrContractorMarker(rec) ||
    hasOwnerOrContractorMarker(editorRec) ||
    Boolean(partyHasOwnerOrContractor);

  const normalizedDomain =
    String(rec?.domain ?? editorRec?.domain ?? "").toLowerCase() === "condo"
      ? "condo"
      : detectedAux
      ? "condo"
      : "general";

  const kind = String(rec?.kind ?? editorRec?.kind ?? "").toUpperCase();

  return {
    ...editorRec,
    ...rec,
    domain: normalizedDomain,
    kind,
    checklist: Array.isArray(rec?.checklist)
      ? rec.checklist
      : Array.isArray(editorRec?.checklist)
      ? editorRec.checklist
      : [],
    isPropietario: Boolean(
      rec?.isPropietario ?? editorRec?.isPropietario ?? detectedAux
    ),
    isProveedorContratista: Boolean(
      rec?.isProveedorContratista ??
        editorRec?.isProveedorContratista ??
        detectedAux
    ),
    propietario: Boolean(
      rec?.propietario ?? editorRec?.propietario ?? detectedAux
    ),
    contratista: Boolean(
      rec?.contratista ?? editorRec?.contratista ?? detectedAux
    ),
    meta: {
      ...(editorRec?.meta || {}),
      ...(rec?.meta || {}),
      transactionType: rec?.meta?.transactionType ?? currentTx,
      companyId: partyKey,
      domain: normalizedDomain,
      isPropietario: Boolean(
        rec?.isPropietario ?? editorRec?.isPropietario ?? detectedAux
      ),
      isProveedorContratista: Boolean(
        rec?.isProveedorContratista ??
          editorRec?.isProveedorContratista ??
          detectedAux
      ),
      propietario: Boolean(
        rec?.propietario ?? editorRec?.propietario ?? detectedAux
      ),
      contratista: Boolean(
        rec?.contratista ?? editorRec?.contratista ?? detectedAux
      ),
    },
  };
}