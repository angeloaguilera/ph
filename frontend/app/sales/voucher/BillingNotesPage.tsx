"use client";

import React, { useState } from "react";
import InvoiceForm from "@/components/forms/InvoiceForm";
import styles from "./page.module.css";
import { useBillingNotes } from "./hooks/useBillingNotes";
import BillingTopActions from "./components/BillingTopActions";
import { ExportInvoice, formatDate, formatMoney } from "./lib/billingExports";

const SORT_KEYS = ["date", "invoiceName", "total", "bank", "type"] as const;

export default function BillingNotesPage() {
  const { state, actions } = useBillingNotes();

  const [manyVoucherOpen, setManyVoucherOpen] = useState(false);

  const {
    loading,
    selected,
    editingInvoice,
    filter,
    sortBy,
    feedback,
    showNewModal,
    contextMenu,
    filtered,
    totalSum,
    filteredSum,
    uniqueBanks,
    totalCount,
    filteredCount,
    sortLabel,
    sortArrow,
  } = state;

  const {
    setSelected,
    setFilter,
    toggleSort,
    handleSave,
    handleDelete,
    handleClearAll,
    openNewModal,
    handleEdit,
    handleClone,
    handleDebitNote,
    handleCreditNote,
    closeNewModal,
    downloadInvoice,
    openContextMenu,
    runContextAction,
    goToView,
  } = actions;

  const allInvoices = state.invoices as ExportInvoice[];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.heroTopRow}>
            <span className={styles.kicker}>VOUCHER</span>
            <span className={styles.heroSubkicker}>Tabla de comprobantes</span>
          </div>

          <div className={styles.heroMainRow}>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}>Gestión de registros</h1>
              <p className={styles.subtitle}>
                Busca, ordena, exporta y revisa tus comprobantes desde una vista más limpia.
              </p>
            </div>

            <BillingTopActions
              allInvoices={allInvoices}
              openNewModal={openNewModal}
              handleClearAll={handleClearAll}
              onOpenManyVoucher={() => setManyVoucherOpen(true)}
            />
          </div>

          {feedback && (
            <div
              className={[
                styles.feedback,
                feedback.type === "success"
                  ? styles.feedbackSuccess
                  : feedback.type === "error"
                  ? styles.feedbackError
                  : styles.feedbackInfo,
              ].join(" ")}
            >
              {feedback.message}
            </div>
          )}

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Registros</div>
              <div className={styles.statValue}>{totalCount}</div>
              <div className={styles.statMeta}>En almacenamiento local</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Filtrados</div>
              <div className={styles.statValue}>{filteredCount}</div>
              <div className={styles.statMeta}>Coinciden con tu búsqueda</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total general</div>
              <div className={styles.statValue}>
                {state.invoices.length ? formatMoney(totalSum) : "0.00"}
              </div>
              <div className={styles.statMeta}>Suma de todos los registros</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Bancos únicos</div>
              <div className={styles.statValue}>{uniqueBanks}</div>
              <div className={styles.statMeta}>Detectados en los registros</div>
            </div>
          </div>
        </header>

        <main className={styles.mainGrid}>
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
                {SORT_KEYS.map((key) => (
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
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={styles.searchInput}
                />
                {filter && (
                  <button
                    type="button"
                    onClick={() => setFilter("")}
                    className={styles.clearSearchButton}
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className={styles.filteredTotal}>
                Total filtrado:{" "}
                <span>{state.invoices.length ? formatMoney(filteredSum) : "0.00"}</span>
              </div>
            </div>

            <div className={styles.tableShell}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
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
                        <td colSpan={5} className={styles.emptyCell}>
                          <div className={styles.emptyBox}>
                            <div className={styles.emptyTitle}>No hay coincidencias</div>
                            <div className={styles.emptyText}>
                              Ajusta el filtro o agrega un nuevo registro.
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((inv) => (
                        <tr
                          key={inv.id}
                          className={styles.tableRow}
                          onClick={() => setSelected(inv)}
                          onContextMenu={(e) => openContextMenu(e, inv)}
                          title="Click para ver detalle · Clic derecho para acciones"
                        >
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
                      ))
                    )}
                  </tbody>

                  <tfoot className={styles.tfoot}>
                    <tr>
                      <td colSpan={4} className={styles.tfootLabel}>
                        Total registros: <span>{totalCount}</span>
                      </td>
                      <td className={styles.tfootValue}>{formatMoney(totalSum)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className={styles.tip}>
              Tip: haz clic sobre una fila para abrir el detalle completo. Clic derecho sobre la fila para ver acciones.
            </div>
          </section>
        </main>

        {showNewModal && (
          <div role="dialog" aria-modal="true" className={styles.modalOverlay}>
            <div className={styles.modalBackdrop} onClick={closeNewModal} />
            <div className={styles.modalCardLarge}>
              <div className={styles.modalHeader}>
                <div>
                  <div className={styles.kickerDark}>
                    {editingInvoice ? "EDITAR REGISTRO" : "NUEVO REGISTRO"}
                  </div>
                  <h3 className={styles.modalTitle}>
                    {editingInvoice ? "Editar comprobante" : "Crear comprobante"}
                  </h3>
                  <div className={styles.modalSubtext}>
                    {editingInvoice
                      ? "Modifica los datos y guarda los cambios."
                      : "Completa los datos y guarda el registro."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeNewModal}
                  className={styles.actionButton}
                >
                  Cerrar
                </button>
              </div>

              <div className={styles.modalBodyScroll}>
                <div className={styles.formFrame}>
                  <InvoiceForm
                    key={editingInvoice?.id ?? "new"}
                    onSave={handleSave}
                    initialData={editingInvoice ?? undefined}
                    initialValues={editingInvoice ?? undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {manyVoucherOpen && (
          <div role="dialog" aria-modal="true" className={styles.modalOverlay}>
            <div
              className={styles.modalBackdrop}
              onClick={() => setManyVoucherOpen(false)}
            />
            <div className={styles.modalCardLarge}>
              <div className={styles.modalHeader}>
                <div>
                  <div className={styles.kickerDark}>MANY VOUCHER</div>
                  <h3 className={styles.modalTitle}>Formulario múltiple pendiente</h3>
                  <div className={styles.modalSubtext}>
                    Aquí irá el formulario para cargar varios vouchers al mismo tiempo.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setManyVoucherOpen(false)}
                  className={styles.actionButton}
                >
                  Cerrar
                </button>
              </div>

              <div className={styles.modalBodyScroll}>
                <div className={styles.formFrame}>
                  <div style={{ padding: 24 }}>
                    <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                      Formulario en desarrollo. Ya quedó listo el punto de entrada para conectar el componente de Many Voucher.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selected && (
          <div role="dialog" aria-modal="true" className={styles.modalOverlay}>
            <div className={styles.modalBackdrop} onClick={() => setSelected(null)} />
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}>
                  <div className={styles.modalBadges}>
                    <span className={styles.kickerDark}>DETALLE</span>
                    <span className={styles.modalType}>{selected.type ?? "—"}</span>
                  </div>
                  <h3 className={styles.modalTitle}>
                    {selected.invoiceName || "Sin nombre"}
                  </h3>
                  <div className={styles.modalSubtext}>
                    {selected.date ? formatDate(selected.date) : "—"} ·{" "}
                    {selected.bank || "—"}
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <div className={styles.totalCard}>
                    <div className={styles.totalLabel}>Total</div>
                    <div className={styles.totalValue}>
                      {formatMoney(selected.total ?? 0)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToView(selected.id)}
                    className={styles.actionButton}
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(selected)}
                    className={styles.actionButton}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClone(selected)}
                    className={styles.actionButton}
                  >
                    Clonar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDebitNote(selected)}
                    className={styles.actionButton}
                  >
                    Nota débito
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreditNote(selected)}
                    className={styles.actionButton}
                  >
                    Nota crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadInvoice(selected)}
                    className={styles.actionButton}
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selected.id)}
                    className={styles.dangerButton}
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className={styles.actionButton}
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailCard}>
                    <div className={styles.detailLabel}>Monto</div>
                    <div className={styles.detailValue}>
                      {formatMoney(selected.amount ?? 0)}
                    </div>
                  </div>
                  <div className={styles.detailCard}>
                    <div className={styles.detailLabel}>IVA</div>
                    <div className={styles.detailValue}>
                      {formatMoney(selected.iva ?? 0)}
                    </div>
                  </div>
                  <div className={styles.detailWide}>
                    <div className={styles.detailLabel}>Descripción</div>
                    <div className={styles.detailText}>
                      {selected.description || "—"}
                    </div>
                  </div>
                  <div className={styles.detailGrid3}>
                    <div className={styles.detailCard}>
                      <div className={styles.detailLabel}>ID</div>
                      <div className={styles.detailMono}>{selected.id}</div>
                    </div>
                    <div className={styles.detailCard}>
                      <div className={styles.detailLabel}>Banco</div>
                      <div className={styles.detailValueSmall}>
                        {selected.bank || "—"}
                      </div>
                    </div>
                    <div className={styles.detailCard}>
                      <div className={styles.detailLabel}>Fecha</div>
                      <div className={styles.detailValueSmall}>
                        {selected.date ? formatDate(selected.date) : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {contextMenu && (
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
                  onClick={() => runContextAction(item.action, contextMenu.invoice)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: item.danger
                      ? "rgba(239,68,68,0.14)"
                      : "transparent",
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
        )}
      </div>
    </div>
  );
}