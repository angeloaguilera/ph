"use client";

import React from "react";

type Props = {
  selectedCount: number;
  onBulkClone: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
};

export default function BillingSelectionBar({
  selectedCount,
  onBulkClone,
  onBulkDelete,
  onClearSelection,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        marginTop: 16,
        padding: "14px 16px",
        borderRadius: 16,
        background: "rgba(17,24,39,0.06)",
        border: "1px solid rgba(17,24,39,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {selectedCount} seleccionado(s)
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Shift selecciona rango. Ctrl/Cmd suma o quita uno.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onBulkClone} className="actionButton">
          Clonar seleccionados
        </button>
        <button type="button" onClick={onBulkDelete} className="dangerButton">
          Eliminar seleccionados
        </button>
        <button type="button" onClick={onClearSelection} className="actionButton">
          Limpiar selección
        </button>
      </div>
    </div>
  );
}