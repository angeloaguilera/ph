"use client";

import React from "react";
import InvoiceForm from "@/components/forms/InvoiceForm";
import type { Invoice } from "@/types/invoice";
import styles from "../page.module.css";
import { formatDate, formatMoney } from "../lib/billingExports";

type ModalCopy = {
  kicker: string;
  title: string;
  subtitle: string;
};

type Props = {
  showNewModal: boolean;
  closeNewModal: () => void;
  modalCopy: ModalCopy;
  modalMode: "new" | "edit" | "clone" | "debit" | "credit";
  editingInvoice: Invoice | null;
  handleSave: (invoiceOrWrapper: any) => void;

  showCloneConfirm: boolean;
  cancelClone: () => void;
  confirmClone: () => void;
  cloneTarget: Invoice | null;

  selected: Invoice | null;
  goToView: (id: string) => void;
  handleEdit: (inv: Invoice) => void;
  requestClone: (inv: Invoice) => void;
  handleDebitNote: (inv: Invoice) => void;
  handleCreditNote: (inv: Invoice) => void;
  downloadInvoice: (inv: Invoice) => void;
  handleDelete: (id: string) => void;
  closeSelected: () => void;
};

export default function BillingDialogs({
  showNewModal,
  closeNewModal,
  modalCopy,
  modalMode,
  editingInvoice,
  handleSave,
  showCloneConfirm,
  cancelClone,
  confirmClone,
  cloneTarget,
  selected,
  goToView,
  handleEdit,
  requestClone,
  handleDebitNote,
  handleCreditNote,
  downloadInvoice,
  handleDelete,
  closeSelected,
}: Props) {
  return (
    <>
      {showNewModal && (
        <div role="dialog" aria-modal="true" className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={closeNewModal} />
          <div className={styles.modalCardLarge}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.kickerDark}>{modalCopy.kicker}</div>
                <h3 className={styles.modalTitle}>{modalCopy.title}</h3>
                <div className={styles.modalSubtext}>{modalCopy.subtitle}</div>
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
                  key={`${modalMode}-${editingInvoice?.id ?? "new"}`}
                  onSave={handleSave}
                  initialData={editingInvoice ?? undefined}
                  initialValues={editingInvoice ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloneConfirm && (
        <div role="dialog" aria-modal="true" className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={cancelClone} />
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalBadges}>
                  <span className={styles.kickerDark}>CONFIRMACIÓN</span>
                  <span className={styles.modalType}>CLONAR</span>
                </div>
                <h3 className={styles.modalTitle}>
                  ¿En serio vas a clonar este comprobante?
                </h3>
                <div className={styles.modalSubtext}>
                  Se creará una copia nueva para editarla sin tocar el original.
                </div>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailWide}>
                  <div className={styles.detailLabel}>Registro a clonar</div>
                  <div className={styles.detailText}>
                    {cloneTarget?.invoiceName || "Sin nombre"}
                  </div>
                </div>

                <div className={styles.detailGrid3}>
                  <div className={styles.detailCard}>
                    <div className={styles.detailLabel}>Fecha</div>
                    <div className={styles.detailValueSmall}>
                      {cloneTarget?.date ? formatDate(cloneTarget.date) : "—"}
                    </div>
                  </div>
                  <div className={styles.detailCard}>
                    <div className={styles.detailLabel}>Banco</div>
                    <div className={styles.detailValueSmall}>
                      {cloneTarget?.bank || "—"}
                    </div>
                  </div>
                  <div className={styles.detailCard}>
                    <div className={styles.detailLabel}>Total</div>
                    <div className={styles.detailValueSmall}>
                      {formatMoney(cloneTarget?.total ?? 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                  marginTop: 20,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={cancelClone}
                  className={styles.actionButton}
                >
                  No, cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmClone}
                  className={styles.actionButton}
                >
                  Sí, clonar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={closeSelected} />
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
                  onClick={() => requestClone(selected)}
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
                  onClick={closeSelected}
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
    </>
  );
}