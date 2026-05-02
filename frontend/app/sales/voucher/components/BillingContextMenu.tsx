"use client";

import React from "react";
import type { Invoice } from "@/types/invoice";
import type { ContextAction, ContextMenuState } from "../lib/billing-notes";

type Props = {
  contextMenu: ContextMenuState;
  onRunContextAction: (action: ContextAction, inv: Invoice) => void;
};

export default function BillingContextMenu({
  contextMenu,
  onRunContextAction,
}: Props) {
  if (!contextMenu) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 9999,
        width: 206,
        background: "rgba(17, 24, 39, 0.96)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        padding: 6,
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.7,
          textTransform: "uppercase",
          padding: "6px 8px 8px",
          opacity: 0.72,
        }}
      >
        Acciones
      </div>

      <div style={{ display: "grid", gap: 2 }}>
        {[
          { label: "Ver", action: "view" as const },
          { label: "Editar", action: "edit" as const },
          { label: "Clonar", action: "clone" as const },
          { label: "Nota débito", action: "debit" as const },
          { label: "Nota crédito", action: "credit" as const },
          { label: "Descargar", action: "download" as const },
          { label: "Eliminar", action: "delete" as const, danger: true },
        ].map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => onRunContextAction(item.action, contextMenu.invoice)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              borderRadius: 8,
              border: "none",
              background: item.danger ? "rgba(239,68,68,0.14)" : "transparent",
              color: item.danger ? "#fecaca" : "#fff",
              cursor: "pointer",
              fontSize: 13,
              lineHeight: 1.15,
              fontWeight: 600,
              letterSpacing: 0.1,
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}