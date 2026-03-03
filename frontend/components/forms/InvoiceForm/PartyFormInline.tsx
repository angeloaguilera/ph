// components/forms/InvoiceForm/PartyFormInline.tsx
"use client";
import React, { useEffect } from "react";
import type { PartyRecord } from "../../../types/invoice";

const EMPTY_PARTY_DRAFT = {
  partyType: "NATURAL" as "NATURAL" | "JURIDICA",
  firstName: "",
  lastName: "",
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
  photoDataUrl: undefined as string | undefined,
};

function generateCompanyId() {
  // Usa crypto.randomUUID() si está disponible en el navegador,
  // si no, crear fallback simple (timestamp + random).
  try {
    // @ts-ignore - crypto may not exist in some test environments
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch (e) {
    // ignore
  }
  return `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  setNewPartyDraft: (v: any) => void;
  partyPhotoPreview?: string;
  onPhotoChange: (files: FileList | null) => void;
  onSaveDraft: (selectAfterSave?: boolean) => void;
  onCancelForm: () => void;
  onRemoveParty: (id: string) => void;
}) {
  const safeDraft = {
    ...EMPTY_PARTY_DRAFT,
    ...(newPartyDraft ?? {}),
  };

  const partyType = safeDraft.partyType;

  // Generar companyId automáticamente cuando el formulario se abre,
  // y también asegurarnos de generarlo si el usuario hace click en + Nuevo.
  useEffect(() => {
    if (!showNewPartyForm) return;

    // Si por alguna razón el draft actual no tiene companyId, generarlo.
    setNewPartyDraft((d: any) => {
      const base = { ...EMPTY_PARTY_DRAFT, ...(d ?? {}) };
      if (base.companyId && base.companyId.toString().trim().length > 0) {
        // ya tiene companyId -> no sobrescribir
        return base;
      }
      const id = generateCompanyId();
      return { ...base, companyId: id };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewPartyForm]);

  // Handler local para abrir nuevo: aseguramos que el draft que se abre ya
  // tenga companyId (evita condiciones de carrera si el usuario guarda rápido).
  const handleOpenNew = () => {
    const id = generateCompanyId();
    // Seteamos inmediatamente el draft con companyId antes de abrir
    setNewPartyDraft((d: any) => {
      const base = { ...EMPTY_PARTY_DRAFT, ...(d ?? {}) };
      return { ...base, companyId: base.companyId && base.companyId.toString().trim().length ? base.companyId : id };
    });
    // Luego llamamos al callback que abre el formulario en el padre
    onOpenNew();
  };

  // Handler local para guardar: nos aseguramos que exista companyId en el draft
  // y llamamos al onSaveDraft. Usamos setTimeout 0 para dar oportunidad a React
  // de aplicar la actualización del estado antes de que el padre lea newPartyDraft.
  // Esto evita la carrera donde onSaveDraft en el padre lee un draft sin companyId.
  const handleSaveDraft = (selectAfterSave = true) => {
    if (safeDraft.companyId && safeDraft.companyId.toString().trim().length > 0) {
      // ya tiene companyId -> guardar de inmediato
      onSaveDraft(selectAfterSave);
      return;
    }
    const id = generateCompanyId();
    setNewPartyDraft((d: any) => {
      const base = { ...EMPTY_PARTY_DRAFT, ...(d ?? {}) };
      return { ...base, companyId: id };
    });
    // Llamada en siguiente macrotarea para dar tiempo a que el estado padre se actualice.
    // Esto es una práctica aceptada para garantizar que el setter se aplique
    // antes de leerlo en la función onSaveDraft del componente padre.
    setTimeout(() => {
      onSaveDraft(selectAfterSave);
    }, 0);
  };

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

              {/* Botón Eliminar: solo visible si hay una selección */}
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
                onChange={(e) =>
                  setNewPartyDraft((d: any) => ({
                    ...EMPTY_PARTY_DRAFT,
                    ...d,
                    partyType: e.target.value,
                    nit: e.target.value === "NATURAL" ? "" : d?.nit ?? "",
                  }))
                }
              >
                <option value="NATURAL">Natural</option>
                <option value="JURIDICA">Jurídica</option>
              </select>
            </div>

            {partyType === "JURIDICA" ? (
              <div className="col-span-2">
                <label className="block text-xs font-medium">Razón social / Empresa</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={safeDraft.companyName}
                  onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, companyName: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium">Nombre</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={safeDraft.firstName}
                    onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, firstName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium">Apellido</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={safeDraft.lastName}
                    onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, lastName: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium">RIF / ID</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.rif}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, rif: e.target.value }))}
              />
            </div>

            {partyType === "JURIDICA" && (
              <div>
                <label className="block text-xs font-medium">NIT (jurídica)</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={safeDraft.nit}
                  onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, nit: e.target.value }))}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium">Teléfono</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.phone}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">Correo</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.email}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, email: e.target.value }))}
              />
            </div>

            <div className="col-span-3">
              <label className="block text-xs font-medium">Dirección</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.address}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, address: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">Ciudad</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.city}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, city: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">Estado</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.state}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, state: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium">País</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={safeDraft.country}
                onChange={(e) => setNewPartyDraft((d: any) => ({ ...d, country: e.target.value }))}
              />
            </div>

            {/* El companyId se genera automáticamente y se mantiene oculto.
                Dejamos un input hidden para que el valor viaje en formularios si es necesario. */}
            <input type="hidden" name="companyId" value={safeDraft.companyId} />

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

            <div className="col-span-3 flex gap-2 mt-2">
              <button type="button" onClick={() => handleSaveDraft(true)} className="bg-green-600 text-white px-3 py-1 rounded">
                Guardar y usar
              </button>
              <button type="button" onClick={() => handleSaveDraft(false)} className="bg-blue-500 text-white px-3 py-1 rounded">
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
