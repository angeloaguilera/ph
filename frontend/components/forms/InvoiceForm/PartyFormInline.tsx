"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { PartyRecord } from "../../../types/invoice";
import SeniatRifConsult from "./SeniatRifConsult";

type PartyType = "NATURAL" | "JURIDICA";

type PartyDraft = {
  partyType: PartyType;
  firstName: string;
  lastName: string;
  name: string;
  companyName: string;
  rif: string;
  nit: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  companyId: string;
  photoDataUrl?: string;
  isPropietario: boolean;
  isProveedorContratista: boolean;
  needsManualReview: boolean;
  rifMatchedLine: string;
  activityEconomic: string;
  condition: string;
  retentionNote: string;
  rawText: string;
  defaultTargets: string[];
  checklist: any[];
};

const EMPTY_PARTY_DRAFT: PartyDraft = {
  partyType: "NATURAL",
  firstName: "",
  lastName: "",
  name: "",
  companyName: "",
  rif: "",
  nit: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "",
  companyId: "",
  photoDataUrl: undefined,
  isPropietario: false,
  isProveedorContratista: false,
  needsManualReview: false,
  rifMatchedLine: "",
  activityEconomic: "",
  condition: "",
  retentionNote: "",
  rawText: "",
  defaultTargets: [],
  checklist: [],
};

function generateCompanyId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateChecklistId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeChecklist(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeStringArray(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v)).filter(Boolean);
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function isTruthyLike(v: any) {
  return v === true || v === "1" || v === 1 || v === "true";
}

function normalizeComparableText(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function stripDuplicateParenthetical(input: string) {
  const text = String(input ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";

  const match = text.match(/^(.*?)(?:\s*\(([^()]*)\)\s*)$/);
  if (!match) return text;

  const base = match[1].trim();
  const inner = String(match[2] ?? "").trim();

  if (!base || !inner) return text;

  const baseNorm = normalizeComparableText(base.replace(/[.,;:]+$/g, ""));
  const innerNorm = normalizeComparableText(inner.replace(/[.,;:]+$/g, ""));

  if (baseNorm && baseNorm === innerNorm) {
    return base;
  }

  return text;
}

function splitNaturalName(fullName: string) {
  const cleaned = stripDuplicateParenthetical(fullName);

  const tokens = String(cleaned)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: "" };
  }

  if (tokens.length === 2) {
    return { firstName: tokens[0], lastName: tokens[1] };
  }

  if (tokens.length === 3) {
    return { firstName: tokens[0], lastName: tokens.slice(1).join(" ") };
  }

  return {
    firstName: tokens.slice(0, 2).join(" "),
    lastName: tokens.slice(2).join(" "),
  };
}

function parseRifMatchedLine(input: string) {
  const text = String(input ?? "").trim();
  if (!text) return null;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates = lines.length > 0 ? lines : [text];

  for (const line of candidates) {
    const normalized = line.replace(/\s+/g, " ").trim();

    const match = normalized.match(/^([A-Z]\s*[-]?\s*\d[\d-]*)\s+(.+)$/i);
    if (!match) continue;

    const rif = match[1].replace(/\s+/g, "").toUpperCase().trim();
    const rawName = match[2].trim();
    const cleanedName = stripDuplicateParenthetical(rawName);

    const { firstName, lastName } = splitNaturalName(cleanedName);

    return {
      rif,
      firstName,
      lastName,
      fullName: cleanedName,
      name: cleanedName,
      companyName: cleanedName,
    };
  }

  return null;
}

export default function PartyFormInline({
  currentRole,
  partiesForRole,
  selectedPartyId,
  onSelectParty,
  onOpenNew,
  onEditSelected,
  showNewPartyForm,
  newPartyDraft,
  setNewPartyDraft,
  partyPhotoPreview,
  onPhotoChange,
  onSaveDraft,
  onCancelForm,
  onRemoveParty,
}: {
  currentRole: "CLIENTE" | "PROVEEDOR";
  partiesForRole: PartyRecord[];
  selectedPartyId: string | "";
  onSelectParty: (id: string) => void;
  onOpenNew: () => void;
  onEditSelected: () => void;
  showNewPartyForm: boolean;
  newPartyDraft: any;
  setNewPartyDraft: React.Dispatch<React.SetStateAction<any>>;
  partyPhotoPreview?: string;
  onPhotoChange: (files: FileList | null) => void;
  onSaveDraft: (selectAfterSave?: boolean) => void;
  onCancelForm: () => void;
  onRemoveParty: (id: string) => void;
}) {
  const lastAutofillKeyRef = useRef<string>("");

  const safeDraft = useMemo<PartyDraft>(() => {
    const checklist = normalizeChecklist(newPartyDraft?.checklist);
    const defaultTargets = normalizeStringArray(newPartyDraft?.defaultTargets);

    return {
      ...EMPTY_PARTY_DRAFT,
      ...(newPartyDraft ?? {}),
      name: String(newPartyDraft?.name ?? newPartyDraft?.companyName ?? "").trim(),
      companyName: String(newPartyDraft?.companyName ?? newPartyDraft?.name ?? "").trim(),
      isPropietario: isTruthyLike(newPartyDraft?.isPropietario),
      isProveedorContratista: isTruthyLike(newPartyDraft?.isProveedorContratista),
      needsManualReview: isTruthyLike(newPartyDraft?.needsManualReview),
      defaultTargets,
      checklist,
    };
  }, [newPartyDraft]);

  const partyType = safeDraft.partyType as PartyType;

  useEffect(() => {
    if (!showNewPartyForm) {
      lastAutofillKeyRef.current = "";
      return;
    }

    setNewPartyDraft((d: any) => {
      const base = { ...(d ?? {}) };

      base.checklist = normalizeChecklist(base.checklist);
      base.defaultTargets = normalizeStringArray(base.defaultTargets);

      const propietarioItem = base.checklist.find(
        (it: any) => String(it.label).toLowerCase() === "propietario"
      );
      const contratistaItem = base.checklist.find(
        (it: any) => String(it.label).toLowerCase() === "contratista"
      );

      base.isPropietario = propietarioItem ? !!propietarioItem.done : !!base.isPropietario;
      base.isProveedorContratista = contratistaItem ? !!contratistaItem.done : !!base.isProveedorContratista;
      base.needsManualReview = !!base.needsManualReview;

      if (
        (base.isPropietario || base.isProveedorContratista) &&
        (!Array.isArray(base.defaultTargets) || base.defaultTargets.length === 0)
      ) {
        base.defaultTargets = ["SERVICIOS", "PRODUCTOS", "INMUEBLES"];
      }

      if (!base.companyId || !String(base.companyId).trim()) {
        base.companyId = generateCompanyId();
      }

      if (base.partyType === "JURIDICA") {
        base.name = String(base.name ?? base.companyName ?? "").trim();
        base.companyName = String(base.companyName ?? base.name ?? "").trim();
      }

      return base;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewPartyForm]);

  useEffect(() => {
    if (!showNewPartyForm) return;

    const source = String(safeDraft.rifMatchedLine || safeDraft.rawText || "").trim();
    if (!source) return;

    const autofillKey = `${partyType}::${source}`;
    if (lastAutofillKeyRef.current === autofillKey) return;

    const parsed = parseRifMatchedLine(source);
    if (!parsed) return;

    lastAutofillKeyRef.current = autofillKey;

    setNewPartyDraft((d: any) => {
      const base = { ...(d ?? {}) };

      base.rif = parsed.rif || base.rif || "";

      if (partyType === "JURIDICA") {
        const company = parsed.companyName || parsed.name || "";
        base.name = company || base.name || "";
        base.companyName = company || base.companyName || "";
        base.firstName = "";
        base.lastName = "";
      } else {
        const names = splitNaturalName(parsed.fullName || "");
        base.firstName = names.firstName || base.firstName || "";
        base.lastName = names.lastName || base.lastName || "";
        base.name = "";
        base.companyName = "";
      }

      return base;
    });
  }, [
    showNewPartyForm,
    partyType,
    safeDraft.rifMatchedLine,
    safeDraft.rawText,
    setNewPartyDraft,
  ]);

  const handleOpenNew = () => {
    const id = generateCompanyId();
    lastAutofillKeyRef.current = "";
    setNewPartyDraft(() => ({ ...EMPTY_PARTY_DRAFT, companyId: id }));
    onOpenNew();
  };

  const handleSaveDraft = (selectAfterSave = true) => {
    if (safeDraft.companyId && String(safeDraft.companyId).trim().length > 0) {
      onSaveDraft(selectAfterSave);
      return;
    }

    const id = generateCompanyId();
    setNewPartyDraft((d: any) => {
      const base = { ...EMPTY_PARTY_DRAFT, ...(d ?? {}) };
      return { ...base, companyId: id };
    });

    setTimeout(() => {
      onSaveDraft(selectAfterSave);
    }, 0);
  };

  function upsertChecklist(base: any, label: string, done: boolean) {
    base.checklist = normalizeChecklist(base.checklist);
    const idx = base.checklist.findIndex((it: any) => String(it.label).toLowerCase() === label.toLowerCase());
    const now = new Date().toISOString();

    if (idx >= 0) {
      base.checklist[idx] = { ...base.checklist[idx], done, updatedAt: now };
    } else {
      base.checklist = [
        ...base.checklist,
        {
          id: generateChecklistId(),
          label,
          done,
          meta: {},
          createdAt: now,
          updatedAt: now,
        },
      ];
    }

    return base.checklist;
  }

  const setPropietario = (checked: boolean) => {
    setNewPartyDraft((d: any) => {
      const base = { ...(d ?? {}) };
      base.checklist = normalizeChecklist(base.checklist);

      base.isPropietario = checked;
      if (checked) base.isProveedorContratista = false;

      upsertChecklist(base, "propietario", checked);
      base.defaultTargets = checked ? ["SERVICIOS", "PRODUCTOS", "INMUEBLES"] : [];

      return base;
    });
  };

  const setProveedorContratista = (checked: boolean) => {
    setNewPartyDraft((d: any) => {
      const base = { ...(d ?? {}) };
      base.checklist = normalizeChecklist(base.checklist);

      base.isProveedorContratista = checked;
      if (checked) base.isPropietario = false;

      upsertChecklist(base, "contratista", checked);
      base.defaultTargets = checked ? ["SERVICIOS", "PRODUCTOS", "INMUEBLES"] : [];

      return base;
    });
  };

  const showPropietarioCheckbox =
    currentRole === "CLIENTE" ||
    safeDraft.isPropietario === true ||
    safeDraft.checklist.some((it: any) => String(it.label).toLowerCase() === "propietario");

  const showProveedorCheckbox =
    currentRole === "PROVEEDOR" ||
    safeDraft.isProveedorContratista === true ||
    safeDraft.checklist.some((it: any) => String(it.label).toLowerCase() === "contratista");

  return (
    <div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">
          Seleccionar {currentRole === "CLIENTE" ? "cliente" : "proveedor"}
        </label>

        <div className="flex gap-2">
          <select
            className="flex-1 border rounded px-2 py-1"
            value={selectedPartyId}
            onChange={(e) => onSelectParty(e.target.value)}
          >
            <option value="">-- Nuevo / Seleccionar --</option>
            {partiesForRole.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.rif ? `• ${p.rif}` : ""}
              </option>
            ))}
          </select>

          <button type="button" onClick={handleOpenNew} className="px-3 py-1 bg-gray-200 rounded">
            + Nuevo
          </button>

          {selectedPartyId && (
            <>
              <button type="button" onClick={onEditSelected} className="px-3 py-1 bg-yellow-100 rounded">
                Editar
              </button>

              <button
                type="button"
                onClick={() => onRemoveParty(selectedPartyId)}
                className="px-3 py-1 bg-red-600 text-white rounded"
                title="Eliminar cliente/proveedor seleccionado"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {showNewPartyForm && (
        <div className="border rounded p-3 bg-gray-50 mt-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium">Tipo de persona</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={partyType}
                onChange={(e) => {
                  const nextType = e.target.value as PartyType;
                  setNewPartyDraft((d: any) => ({
                    ...EMPTY_PARTY_DRAFT,
                    ...(d ?? {}),
                    partyType: nextType,
                    nit: "",
                    rif: "",
                    needsManualReview: false,
                    rifMatchedLine: "",
                    activityEconomic: "",
                    condition: "",
                    retentionNote: "",
                    rawText: "",
                    name: nextType === "NATURAL" ? "" : d?.name ?? d?.companyName ?? "",
                    companyName: nextType === "NATURAL" ? "" : d?.companyName ?? d?.name ?? "",
                    firstName: nextType === "NATURAL" ? d?.firstName ?? "" : "",
                    lastName: nextType === "NATURAL" ? d?.lastName ?? "" : "",
                  }));
                }}
              >
                <option value="NATURAL">Natural</option>
                <option value="JURIDICA">Jurídica</option>
              </select>
            </div>

            {partyType === "JURIDICA" ? (
              <div className="col-span-2">
                <label className="block text-xs font-medium">Nombre de la Empresa</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={safeDraft.name || safeDraft.companyName}
                  onChange={(e) =>
                    setNewPartyDraft((d: any) => ({
                      ...(d ?? {}),
                      name: e.target.value,
                      companyName: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium">Nombre</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={safeDraft.firstName}
                    onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), firstName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium">Apellido</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={safeDraft.lastName}
                    onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), lastName: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div className="col-span-3">
              <SeniatRifConsult draft={safeDraft} setNewPartyDraft={setNewPartyDraft} />
            </div>

            {partyType === "NATURAL" && (
              <div className="col-span-3">
                <label className="block text-xs font-medium">RIF</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={safeDraft.rif || ""}
                  onChange={(e) => {
                    const value = String(e.target.value ?? "")
                      .toUpperCase()
                      .replace(/[^A-Z0-9-]/g, "")
                      .trim();

                    setNewPartyDraft((d: any) => ({
                      ...(d ?? {}),
                      rif: value,
                    }));
                  }}
                  placeholder="J-12345678-9"
                />
              </div>
            )}

            {partyType === "JURIDICA" && (
              <div>
                <label className="block text-xs font-medium">NIT</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={safeDraft.nit || ""}
                  onChange={(e) => {
                    const value = String(e.target.value ?? "")
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .trim();

                    setNewPartyDraft((d: any) => {
                      const base = { ...(d ?? {}) };
                      base.nit = value;
                      return base;
                    });
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium">Teléfono</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.phone}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">Correo</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.email}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), email: e.target.value }))}
              />
            </div>

            <div className="col-span-3">
              <label className="block text-xs font-medium">Dirección</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.address}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), address: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">Ciudad</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.city}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), city: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">Estado</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.state}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), state: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">País</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.country}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...(d ?? {}), country: e.target.value }))}
              />
            </div>

            {partyType === "JURIDICA" && (
              <>
                <div>
                  <label className="block text-xs font-medium">Actividad económica</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={safeDraft.activityEconomic || ""}
                    onChange={(e) =>
                      setNewPartyDraft((d: any) => ({
                        ...(d ?? {}),
                        activityEconomic: e.target.value,
                      }))
                    }
                    placeholder="Ej: Comercio al por mayor"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium">Condición</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={safeDraft.condition || ""}
                    onChange={(e) =>
                      setNewPartyDraft((d: any) => ({
                        ...(d ?? {}),
                        condition: e.target.value,
                      }))
                    }
                    placeholder="Ej: Contribuyente especial"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-medium">Retención</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={safeDraft.retentionNote || ""}
                    onChange={(e) =>
                      setNewPartyDraft((d: any) => ({
                        ...(d ?? {}),
                        retentionNote: e.target.value,
                      }))
                    }
                    placeholder="Ej: Sujeto a retención, 2%, 75%, etc."
                  />
                </div>
              </>
            )}

            <input type="hidden" name="companyId" value={safeDraft.companyId} />

            <div className="col-span-3">
              {showPropietarioCheckbox && (
                <label className="inline-flex items-center gap-2 mr-4">
                  <input
                    type="checkbox"
                    checked={Boolean(safeDraft.isPropietario)}
                    onChange={(e) => setPropietario(e.target.checked)}
                  />
                  <span className="text-xs">
                    Propietario — si está activado, todo lo que se cree irá a: servicios, productos, inmuebles
                  </span>
                </label>
              )}

              {showProveedorCheckbox && (
                <label className="inline-flex items-center gap-2 mr-4">
                  <input
                    type="checkbox"
                    checked={Boolean(safeDraft.isProveedorContratista)}
                    onChange={(e) => setProveedorContratista(e.target.checked)}
                  />
                  <span className="text-xs">
                    Contratista — si está activado, todo lo que se cree irá a: servicios, productos, inmuebles
                  </span>
                </label>
              )}

              <div className="mt-2 text-xs text-gray-700">
                {safeDraft.activityEconomic ? <div>Actividad económica: {safeDraft.activityEconomic}</div> : null}
                {safeDraft.condition ? <div>Condición: {safeDraft.condition}</div> : null}
                {safeDraft.retentionNote ? <div>Retención: {safeDraft.retentionNote}</div> : null}
              </div>

              {safeDraft.rawText ? (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Texto completo detectado</div>
                  <pre className="max-h-40 overflow-auto rounded bg-black p-2 text-[11px] text-green-400 whitespace-pre-wrap">
                    {safeDraft.rawText}
                  </pre>
                </div>
              ) : null}

              <div className="mt-2 text-xs text-gray-600">
                {safeDraft.rifMatchedLine ? (
                  <>Coincidencia: {safeDraft.rifMatchedLine}</>
                ) : safeDraft.checklist && safeDraft.checklist.length > 0 ? (
                  <>
                    Checklist:{" "}
                    {safeDraft.checklist
                      .map((it: any) => `${it.label} (${it.done ? "✓" : "✗"})`)
                      .join(" • ")}
                  </>
                ) : (
                  <>Checklist vacío</>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium">Foto</label>
              <input type="file" accept="image/*" onChange={(e) => onPhotoChange(e.target.files)} />
            </div>

            <div className="col-span-1">
              {partyPhotoPreview ? (
                <img src={partyPhotoPreview} alt="preview" className="w-24 h-24 object-cover rounded" />
              ) : (
                <div className="text-xs text-gray-500">No hay foto</div>
              )}
            </div>

            <input type="hidden" name="isPropietario" value={safeDraft.isPropietario ? "1" : "0"} />
            <input
              type="hidden"
              name="isProveedorContratista"
              value={safeDraft.isProveedorContratista ? "1" : "0"}
            />
            <input type="hidden" name="needsManualReview" value={safeDraft.needsManualReview ? "1" : "0"} />
            <input type="hidden" name="rifMatchedLine" value={safeDraft.rifMatchedLine || ""} />
            <input type="hidden" name="activityEconomic" value={safeDraft.activityEconomic || ""} />
            <input type="hidden" name="condition" value={safeDraft.condition || ""} />
            <input type="hidden" name="retentionNote" value={safeDraft.retentionNote || ""} />
            <input type="hidden" name="rawText" value={safeDraft.rawText || ""} />
            <input type="hidden" name="defaultTargets" value={JSON.stringify(safeDraft.defaultTargets || [])} />
            <input type="hidden" name="checklist" value={JSON.stringify(safeDraft.checklist || [])} />

            <div className="col-span-3 flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleSaveDraft(true)}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Guardar y usar
              </button>
              <button
                type="button"
                onClick={() => handleSaveDraft(false)}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Guardar (no seleccionar)
              </button>
              <button type="button" onClick={onCancelForm} className="bg-gray-200 px-3 py-1 rounded">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}