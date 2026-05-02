"use client";

import React from "react";
import type { Invoice } from "@/types/invoice";
import styles from "../page.module.css";
import { formatDate, formatMoney } from "../lib/billingExports";
import type { SortKey } from "../lib/billing-notes";

type Props = {
  filtered: Invoice[];
  selectedSet: Set<string>;
  selectedIds: string[];
  totalCount: number;
  filteredCount: number;
  filteredSum: number;
  totalSum: number;
  loading: boolean;
  sortLabel: string;
  sortArrow: string;
  sortBy: SortKey;
  sortKeys: readonly SortKey[];
  toggleSort: (key: SortKey) => void;
  onRowClick: (
    inv: Invoice,
    index: number,
    e: React.MouseEvent<HTMLTableRowElement>
  ) => void;
  onRowCheckboxClick: (
    inv: Invoice,
    index: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => void;
  onOpenContextMenu: (e: React.MouseEvent, inv: Invoice) => void;
};

export default function BillingInvoicesTable({
  filtered,
  selectedSet,
  totalCount,
  filteredCount,
  filteredSum,
  totalSum,
  loading,
  sortLabel,
  sortArrow,
  sortBy,
  sortKeys,
  toggleSort,
  onRowClick,
  onRowCheckboxClick,
  onOpenContextMenu,
}: Props) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeaderColumn}>
        <div>
          <h2 className={styles.panelTitle}>Listado</h2>
          <p className={styles.panelText}>
            {loading
              ? "Cargando..."
              : `${filteredCount} resultado(s) · ordenado por ${sortLabel} ${sortArrow}`}
          </p>
        </div>

        <div className={styles.sortChips}>
          {sortKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSort(key)}
              className={[
                styles.chip,
                sortBy === key ? styles.chipActive : "",
              ].join(" ")}
            >
              {{
                date: "Fecha",
                invoiceName: "Nombre",
                total: "Total",
                bank: "Banco",
                type: "Tipo",
              }[key]}
              {sortBy === key ? ` ${sortArrow}` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <input
            placeholder="Buscar por nombre, fecha, banco, tipo o descripción..."
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filteredTotal}>
          Total filtrado:{" "}
          <span>{filtered.length ? formatMoney(filteredSum) : "0.00"}</span>
        </div>
      </div>

      <div className={styles.tableShell}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.thLeft} style={{ width: 48 }}>
                  Sel.
                </th>
                <th className={styles.thLeft}>Tipo</th>
                <th className={styles.thLeft}>Nombre</th>
                <th className={styles.thLeft}>Fecha</th>
                <th className={styles.thLeft}>Banco</th>
                <th className={styles.thRight}>Total</th>
              </tr>
            </thead>

            <tbody className={styles.tbody}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    <div className={styles.emptyBox}>
                      <div className={styles.emptyTitle}>No hay coincidencias</div>
                      <div className={styles.emptyText}>
                        Ajusta el filtro o agrega un nuevo registro.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((inv, index) => {
                  const isSelected = selectedSet.has(inv.id);

                  return (
                    <tr
                      key={inv.id || `${index}-${inv.invoiceName || "sin-nombre"}`}
                      className={styles.tableRow}
                      onClick={(e) => onRowClick(inv, index, e)}
                      onContextMenu={(e) => onOpenContextMenu(e, inv)}
                      title="Click para ver detalle · Shift para rango · Clic derecho para acciones"
                      style={{
                        background: isSelected ? "rgba(59,130,246,0.08)" : undefined,
                      }}
                    >
                      <td className={styles.td}>
                        <button
                          type="button"
                          onClick={(e) => onRowCheckboxClick(inv, index, e)}
                          aria-label={`Seleccionar ${inv.invoiceName || "registro"}`}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            border: "1px solid rgba(148,163,184,0.9)",
                            background: isSelected ? "#2563eb" : "#fff",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                          }}
                        >
                          {isSelected ? (
                            <span
                              style={{
                                color: "#fff",
                                fontSize: 12,
                                lineHeight: 1,
                                fontWeight: 700,
                              }}
                            >
                              ✓
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.typeTag}>{inv.type ?? "—"}</span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.cellTitle}>
                          {inv.invoiceName || "Sin nombre"}
                        </div>
                        {inv.description ? (
                          <div className={styles.cellDescription}>
                            {inv.description}
                          </div>
                        ) : (
                          <div className={styles.cellMuted}>Sin descripción</div>
                        )}
                      </td>
                      <td className={styles.tdMuted}>
                        {inv.date ? formatDate(inv.date) : "—"}
                      </td>
                      <td className={styles.tdMuted}>{inv.bank || "—"}</td>
                      <td className={styles.tdRightMono}>
                        {formatMoney(inv.total ?? 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            <tfoot className={styles.tfoot}>
              <tr>
                <td colSpan={5} className={styles.tfootLabel}>
                  Total registros: <span>{totalCount}</span>
                </td>
                <td className={styles.tfootValue}>{formatMoney(totalSum)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className={styles.tip}>
        Tip: haz clic sobre una fila para abrir el detalle. Usa Shift para
        seleccionar un rango o el cuadro para marcar varias.
      </div>
    </section>
  );
}