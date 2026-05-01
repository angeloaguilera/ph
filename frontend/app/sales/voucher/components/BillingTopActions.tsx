"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "../page.module.css";
import {
  ExportInvoice,
  exportAllToExcel,
  exportAllToImage,
  exportAllToPdf,
} from "../lib/billingExports";

type ExportSide = "right" | "left";

type BillingTopActionsProps = {
  allInvoices: ExportInvoice[];
  openNewModal: () => void;
  handleClearAll: () => void;
  onOpenManyVoucher: () => void;
};

export default function BillingTopActions({
  allInvoices,
  openNewModal,
  handleClearAll,
  onOpenManyVoucher,
}: BillingTopActionsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSide, setExportSide] = useState<ExportSide>("right");
  const [plusOpen, setPlusOpen] = useState(false);

  const actionsRef = useRef<HTMLDivElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);

  const updateExportSide = () => {
    const trigger = exportButtonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const submenuWidth = 220;
    const gap = 10;
    const margin = 8;

    const fitsRight = rect.right + gap + submenuWidth <= window.innerWidth - margin;
    const fitsLeft = rect.left - gap - submenuWidth >= margin;

    if (fitsRight) {
      setExportSide("right");
      return;
    }

    if (fitsLeft) {
      setExportSide("left");
      return;
    }

    setExportSide("right");
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
        setExportOpen(false);
        setPlusOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!exportOpen) return;

    updateExportSide();

    const onResizeOrScroll = () => updateExportSide();
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [exportOpen]);

  return (
    <div
      className={styles.heroActions}
      style={{ position: "relative", overflow: "visible" }}
      ref={actionsRef}
    >
      <div style={{ position: "relative", overflow: "visible" }}>
        <button
          type="button"
          onClick={() => setPlusOpen((v) => !v)}
          className={styles.plusButton}
          aria-haspopup="menu"
          aria-expanded={plusOpen}
          aria-label="Nuevo registro"
          title="Nuevo registro"
        >
          +
        </button>

        {plusOpen && (
          <div
            role="menu"
            aria-label="Nuevo registro"
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              left: 0,
              zIndex: 80,
              minWidth: 220,
              padding: 8,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(17, 24, 39, 0.98)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              backdropFilter: "blur(12px)",
            }}
          >
            <button
              type="button"
              className={styles.actionButton}
              style={{ width: "100%", justifyContent: "flex-start" }}
              onClick={() => {
                setPlusOpen(false);
                openNewModal();
              }}
            >
              Add Voucher
            </button>

            <button
              type="button"
              className={styles.actionButton}
              style={{
                width: "100%",
                justifyContent: "flex-start",
                marginTop: 6,
              }}
              onClick={() => {
                setPlusOpen(false);
                onOpenManyVoucher();
              }}
            >
              Many Voucher
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setSettingsOpen((v) => !v);
          setExportOpen(false);
          setPlusOpen(false);
        }}
        className={styles.actionButton}
        aria-haspopup="menu"
        aria-expanded={settingsOpen}
        title="Configuración"
      >
        ⚙ Configuración
      </button>

      {settingsOpen && (
        <div
          role="menu"
          aria-label="Configuración"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            zIndex: 50,
            minWidth: 240,
            padding: 8,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(17, 24, 39, 0.98)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
            backdropFilter: "blur(12px)",
            overflow: "visible",
          }}
        >
          <div style={{ position: "relative", overflow: "visible" }}>
            <button
              ref={exportButtonRef}
              type="button"
              className={styles.actionButton}
              style={{ width: "100%", justifyContent: "space-between" }}
              onClick={() => {
                setSettingsOpen(true);
                setExportOpen((v) => {
                  const next = !v;
                  if (next) requestAnimationFrame(updateExportSide);
                  return next;
                });
                setPlusOpen(false);
              }}
            >
              <span>Exportar</span>
              <span>›</span>
            </button>

            {exportOpen && (
              <div
                role="menu"
                aria-label="Exportar"
                style={{
                  position: "absolute",
                  top: 0,
                  zIndex: 60,
                  minWidth: 220,
                  padding: 8,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(17, 24, 39, 0.98)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
                  backdropFilter: "blur(12px)",
                  overflow: "visible",
                  left: exportSide === "right" ? "calc(100% + 10px)" : "auto",
                  right: exportSide === "left" ? "calc(100% + 10px)" : "auto",
                }}
              >
                <button
                  type="button"
                  className={styles.actionButton}
                  style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => {
                    setSettingsOpen(false);
                    setExportOpen(false);
                    exportAllToPdf(allInvoices);
                  }}
                >
                  Exportar todo en PDF
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    marginTop: 6,
                  }}
                  onClick={() => {
                    setSettingsOpen(false);
                    setExportOpen(false);
                    exportAllToExcel(allInvoices);
                  }}
                >
                  Exportar todo en Excel
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    marginTop: 6,
                  }}
                  onClick={async () => {
                    setSettingsOpen(false);
                    setExportOpen(false);
                    await exportAllToImage(allInvoices);
                  }}
                >
                  Exportar todo en imagen
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              setExportOpen(false);
              setPlusOpen(false);
              handleClearAll();
            }}
            className={styles.dangerButton}
            style={{
              width: "100%",
              justifyContent: "flex-start",
              marginTop: 8,
            }}
          >
            Borrar todo
          </button>
        </div>
      )}
    </div>
  );
}