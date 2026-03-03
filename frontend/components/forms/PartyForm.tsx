// components/forms/PartyForm.tsx
"use client";

import React from "react";

/**
 * Módulo independiente que renderiza el formulario emergente
 * para crear/usar sin registrar o registrar y usar un Cliente/Proveedor.
 *
 * Exporta el tipo NewPartyDraft para que InvoiceForm lo reutilice.
 */

/* Tipos locales exportados */
export type PartyType = "NATURAL" | "JURIDICA";

export type NewPartyDraft = {
  partyType: PartyType;
  // For NATURAL:
  firstName?: string;
  lastName?: string;
  // For JURIDICA:
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  rif?: string;
  nit?: string;
};

type Props = {
  show: boolean;
  // rol actual (sólo para mostrar en select de bandeja en InvoiceForm; se pasa por claridad)
  currentRoleLabel?: string;
  newPartyDraft: NewPartyDraft;
  setNewPartyDraft: (d: NewPartyDraft) => void;
  onRegisterAndUse: () => void;
  onUseWithoutRegister: () => void;
  onCancel: () => void;
};

export default function PartyForm({
  show,
  currentRoleLabel,
  newPartyDraft,
  setNewPartyDraft,
  onRegisterAndUse,
  onUseWithoutRegister,
  onCancel,
}: Props) {
  if (!show) return null;

  const setField = (patch: Partial<NewPartyDraft>) => setNewPartyDraft({ ...newPartyDraft, ...patch });

  return (
    <div className="border rounded p-3 mb-3 bg-gray-50 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">Tipo de persona</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={newPartyDraft.partyType}
            onChange={(e) => {
              const pt = String(e.target.value) === "JURIDICA" ? "JURIDICA" : "NATURAL";
              // reset campos dependientes al cambiar tipo
              setNewPartyDraft({
                ...newPartyDraft,
                partyType: pt,
                firstName: pt === "NATURAL" ? newPartyDraft.firstName ?? "" : "",
                lastName: pt === "NATURAL" ? newPartyDraft.lastName ?? "" : "",
                companyName: pt === "JURIDICA" ? newPartyDraft.companyName ?? "" : "",
                nit: pt === "NATURAL" ? "" : newPartyDraft.nit ?? "",
              });
            }}
          >
            <option value="NATURAL">Persona Natural</option>
            <option value="JURIDICA">Persona Jurídica</option>
          </select>
        </div>

        {/* Para NATURAL: Nombre + Apellido (col-span-2) */}
        {newPartyDraft.partyType === "NATURAL" ? (
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre</label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={newPartyDraft.firstName}
                onChange={(e) => setField({ firstName: e.target.value })}
                placeholder="Ej. Juan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Apellido</label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={newPartyDraft.lastName}
                onChange={(e) => setField({ lastName: e.target.value })}
                placeholder="Ej. Pérez"
              />
            </div>
          </div>
        ) : (
          // For JURIDICA: Company name full width
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">Nombre de la empresa</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={newPartyDraft.companyName}
              onChange={(e) => setField({ companyName: e.target.value })}
              placeholder="Ej. Proveedor S.A."
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">Teléfono</label>
          <input className="w-full border rounded px-2 py-1 text-sm" value={newPartyDraft.phone} onChange={(e) => setField({ phone: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Correo</label>
          <input className="w-full border rounded px-2 py-1 text-sm" value={newPartyDraft.email} onChange={(e) => setField({ email: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Dirección</label>
          <input className="w-full border rounded px-2 py-1 text-sm" value={newPartyDraft.address} onChange={(e) => setField({ address: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Ciudad</label>
          <input className="w-full border rounded px-2 py-1 text-sm" value={newPartyDraft.city} onChange={(e) => setField({ city: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">País</label>
          <input className="w-full border rounded px-2 py-1 text-sm" value={newPartyDraft.country} onChange={(e) => setField({ country: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">RIF</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={newPartyDraft.rif}
            onChange={(e) => setField({ rif: e.target.value })}
            placeholder={newPartyDraft.partyType === "JURIDICA" ? "J-..." : "V-..."}
          />
        </div>

        {newPartyDraft.partyType === "JURIDICA" ? (
          <div>
            <label className="block text-xs font-medium mb-1">NIT</label>
            <input className="w-full border rounded px-2 py-1 text-sm" value={newPartyDraft.nit} onChange={(e) => setField({ nit: e.target.value })} />
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onRegisterAndUse} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
          Registrar y usar
        </button>
        <button type="button" onClick={onUseWithoutRegister} className="bg-gray-700 text-white px-3 py-1 rounded text-sm">
          Usar sin registrar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm ml-auto"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
