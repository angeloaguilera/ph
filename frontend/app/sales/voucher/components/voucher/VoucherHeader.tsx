"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "../../view/[id]/page.module.css";

type VoucherHeaderProps = {
  title: string;
  subtitle: string;
  hasVoucher: boolean;
  editMode: boolean;
  saving: boolean;
  deleting: boolean;
  downloadType: string;
  onBack: () => void;
  onViewReal: () => void;
  onDownloadTypeChange: (value: string) => void;
  onEditOrPublish: () => void;
  onCancelEdit: () => void;
  onDeleteInvoice: () => void;
};

const downloadOptions = [
  {
    value: "pdf",
    label: "PDF",
    desc: "Ideal para imprimir o compartir",
    badge: "PDF",
  },
  {
    value: "excel",
    label: "Excel",
    desc: "Para edición y cálculo",
    badge: "XLSX",
  },
  {
    value: "image",
    label: "Imagen",
    desc: "Descarga rápida visual",
    badge: "IMG",
  },
];

export function VoucherHeader({
  title,
  subtitle,
  hasVoucher,
  editMode,
  saving,
  deleting,
  downloadType,
  onBack,
  onViewReal,
  onDownloadTypeChange,
  onEditOrPublish,
  onCancelEdit,
  onDeleteInvoice,
}: VoucherHeaderProps) {
  const [openDownload, setOpenDownload] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadRef.current &&
        !downloadRef.current.contains(event.target as Node)
      ) {
        setOpenDownload(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDownload(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedLabel =
    downloadOptions.find((item) => item.value === downloadType)?.label ||
    "Descargar";

  const handleDownloadSelect = (value: string) => {
    onDownloadTypeChange(value);
    setOpenDownload(false);
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <h1 className={styles.topTitle}>{title}</h1>
        <p className={styles.topSubtitle}>{subtitle}</p>
      </div>

      <div className={styles.actions} style={{ flexWrap: "wrap" }}>
        <button className={styles.button} onClick={onBack}>
          Volver
        </button>

        <button
          className={styles.primary}
          onClick={onViewReal}
          disabled={!hasVoucher || editMode}
          title={
            hasVoucher
              ? "Abrir la factura real"
              : "No hay imagen de factura disponible"
          }
        >
          Ver factura real
        </button>

        <div ref={downloadRef} style={{ position: "relative" }}>
          <button
            type="button"
            className={styles.button}
            onClick={() => setOpenDownload((v) => !v)}
            disabled={editMode}
            title="Descargar"
            aria-haspopup="menu"
            aria-expanded={openDownload}
            style={{
              minWidth: 150,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span>{selectedLabel}</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "rgba(0,0,0,0.06)",
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ▾
            </span>
          </button>

          {openDownload && !editMode && (
            <div
              role="menu"
              aria-label="Opciones de descarga"
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                zIndex: 50,
                minWidth: 260,
                padding: 10,
                borderRadius: 16,
                border: "1px solid rgba(148, 163, 184, 0.25)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
                boxShadow:
                  "0 20px 45px rgba(15, 23, 42, 0.14), 0 4px 14px rgba(15, 23, 42, 0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "4px 8px 10px",
                }}
              >
                Descargar como
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {downloadOptions.map((item) => {
                  const active = downloadType === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="menuitem"
                      onClick={() => handleDownloadSelect(item.value)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        padding: "12px 12px",
                        borderRadius: 14,
                        border: active
                          ? "1px solid rgba(59, 130, 246, 0.35)"
                          : "1px solid transparent",
                        background: active
                          ? "linear-gradient(180deg, rgba(239, 246, 255, 1), rgba(219, 234, 254, 0.8))"
                          : "rgba(255,255,255,0.75)",
                        boxShadow: active
                          ? "inset 0 0 0 1px rgba(59, 130, 246, 0.08)"
                          : "none",
                        cursor: "pointer",
                        transition:
                          "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 10px 18px rgba(15, 23, 42, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = active
                          ? "inset 0 0 0 1px rgba(59, 130, 246, 0.08)"
                          : "none";
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          color:
                            item.value === "pdf"
                              ? "#b91c1c"
                              : item.value === "excel"
                              ? "#166534"
                              : "#1d4ed8",
                          background:
                            item.value === "pdf"
                              ? "linear-gradient(180deg, #fee2e2, #fecaca)"
                              : item.value === "excel"
                              ? "linear-gradient(180deg, #dcfce7, #bbf7d0)"
                              : "linear-gradient(180deg, #dbeafe, #bfdbfe)",
                          border: "1px solid rgba(255,255,255,0.75)",
                        }}
                      >
                        {item.badge}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            {item.label}
                          </span>

                          {active && (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#2563eb",
                              }}
                            >
                              Seleccionado
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            margin: "3px 0 0",
                            fontSize: 12,
                            lineHeight: 1.35,
                            color: "#64748b",
                          }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          className={styles.button}
          onClick={onEditOrPublish}
          disabled={saving || deleting}
          title={editMode ? "Publicar cambios" : "Editar factura"}
        >
          {editMode ? (saving ? "Publicando..." : "Publicar") : "Editar"}
        </button>

        {editMode && (
          <button
            className={styles.button}
            onClick={onCancelEdit}
            disabled={saving || deleting}
          >
            Cancelar
          </button>
        )}

        <button
          className={styles.button}
          onClick={onDeleteInvoice}
          disabled={saving || deleting}
          style={{
            background: "#fee2e2",
            borderColor: "#fecaca",
            color: "#991b1b",
          }}
        >
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}