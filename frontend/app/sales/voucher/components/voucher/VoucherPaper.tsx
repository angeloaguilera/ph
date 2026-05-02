"use client";

import React from "react";
import styles from "../../view/[id]/page.module.css";
import {
  formatCurrency,
  formatDate,
  getFacturaAnuladaInfo,
  safeText,
} from "../../lib/voucher/voucher.utils";

type VoucherPaperProps = {
  invoiceRef: React.RefObject<HTMLDivElement | null>;
  activeInvoice: any;
  editMode: boolean;
  editInvoice: any;
  inputStyle: React.CSSProperties;
  onTopFieldChange: (field: string, value: any) => void;
  onCustomerChange: (field: string, value: any) => void;
  onPaymentChange: (field: string, value: any) => void;
  onItemChange: (index: number, field: string, value: any) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
};

export function VoucherPaper({
  invoiceRef,
  activeInvoice,
  editMode,
  editInvoice,
  inputStyle,
  onTopFieldChange,
  onCustomerChange,
  onPaymentChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
}: VoucherPaperProps) {
  const items: any[] = Array.isArray(activeInvoice?.items) ? activeInvoice.items : [];
  const customer = activeInvoice?.customer ?? {};
  const payment = activeInvoice?.payment ?? {};

  const subtotal = Number(activeInvoice?.amount ?? 0);
  const iva = Number(activeInvoice?.iva ?? 0);
  const total = Number(activeInvoice?.total ?? subtotal + iva);
  const ivaPercent = Number(activeInvoice?.ivaPercent ?? 0);

  const numeroFactura = safeText(activeInvoice?.numeroFactura);
  const numeroControl = safeText(activeInvoice?.numeroControl);

  const facturaAnuladaInfo = getFacturaAnuladaInfo(activeInvoice?.facturaAnulada);

  return (
    <div className={styles.paperWrap}>
      <div className={styles.paper} ref={invoiceRef}>
        <div className={styles.paperHeader}>
          <div className={styles.brandBlock}>
            <div className={styles.logoBox} aria-hidden="true">
              <div className={styles.logoMark} />
            </div>
            <div>
              <div className={styles.brandName}>TU EMPRESA</div>
              <div className={styles.brandMeta}>
                Dirección: — · Tel: — · Email: —
              </div>
            </div>
          </div>

          <div className={styles.docBlock}>
            <div style={{ marginBottom: 10 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: facturaAnuladaInfo.color,
                  background: facturaAnuladaInfo.bg,
                  border: `1px solid ${facturaAnuladaInfo.border}`,
                }}
              >
                {facturaAnuladaInfo.isCancelled
                  ? "FACTURA ANULADA"
                  : "FACTURA NO ANULADA"}
              </span>
            </div>

            <div className={styles.docTitle}>
              {safeText(activeInvoice?.docKind ?? "FACTURA")}
            </div>

            <div className={styles.docRow}>
              <span className={styles.docLabel}>Estado:</span>
              <span className={styles.docValue}>{facturaAnuladaInfo.label}</span>
            </div>

            <div className={styles.docRow}>
              <span className={styles.docLabel}>Nro / ID:</span>
              <span className={styles.docValue}>{safeText(activeInvoice?.id)}</span>
            </div>

            <div className={styles.docRow}>
              <span className={styles.docLabel}>Nro Factura:</span>
              {editMode ? (
                <input
                  value={editInvoice?.numeroFactura ?? ""}
                  onChange={(e) => onTopFieldChange("numeroFactura", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.docValue}>{numeroFactura}</span>
              )}
            </div>

            <div className={styles.docRow}>
              <span className={styles.docLabel}>Nro Control:</span>
              {editMode ? (
                <input
                  value={editInvoice?.numeroControl ?? ""}
                  onChange={(e) => onTopFieldChange("numeroControl", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.docValue}>{numeroControl}</span>
              )}
            </div>

            <div className={styles.docRow}>
              <span className={styles.docLabel}>Fecha:</span>
              {editMode ? (
                <input
                  type="date"
                  value={editInvoice?.date ?? ""}
                  onChange={(e) => onTopFieldChange("date", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.docValue}>
                  {formatDate(activeInvoice?.date)}
                </span>
              )}
            </div>

            <div className={styles.docRow}>
              <span className={styles.docLabel}>Banco:</span>
              {editMode ? (
                <input
                  value={editInvoice?.bank ?? ""}
                  onChange={(e) => onTopFieldChange("bank", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.docValue}>{safeText(activeInvoice?.bank)}</span>
              )}
            </div>

            <div className={styles.docRow}>
              <span className={styles.docLabel}>Estado factura:</span>
              {editMode ? (
                <select
                  value={editInvoice?.facturaAnulada ?? "NO_ANULADA"}
                  onChange={(e) => onTopFieldChange("facturaAnulada", e.target.value)}
                  style={inputStyle}
                >
                  <option value="NO_ANULADA">NO_ANULADA</option>
                  <option value="ANULADA">ANULADA</option>
                </select>
              ) : (
                <span className={styles.docValue}>{facturaAnuladaInfo.label}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.invoiceName}>
          {editMode ? (
            <input
              value={editInvoice?.invoiceName ?? ""}
              onChange={(e) => onTopFieldChange("invoiceName", e.target.value)}
              style={{
                ...inputStyle,
                width: "100%",
                fontSize: 18,
                fontWeight: 700,
              }}
            />
          ) : (
            safeText(activeInvoice?.invoiceName)
          )}
        </div>

        <div className={styles.blocks}>
          <div className={styles.block}>
            <div className={styles.blockTitle}>Cliente</div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Nombre:</span>
              {editMode ? (
                <input
                  value={editInvoice?.customer?.name ?? ""}
                  onChange={(e) => onCustomerChange("name", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.name)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>RIF:</span>
              {editMode ? (
                <input
                  value={editInvoice?.customer?.rif ?? ""}
                  onChange={(e) => onCustomerChange("rif", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.rif)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Teléfono:</span>
              {editMode ? (
                <input
                  value={editInvoice?.customer?.phone ?? ""}
                  onChange={(e) => onCustomerChange("phone", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.phone)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Email:</span>
              {editMode ? (
                <input
                  value={editInvoice?.customer?.email ?? ""}
                  onChange={(e) => onCustomerChange("email", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.email)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Dirección:</span>
              {editMode ? (
                <textarea
                  value={editInvoice?.customer?.address ?? ""}
                  onChange={(e) => onCustomerChange("address", e.target.value)}
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.address)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Ciudad:</span>
              {editMode ? (
                <input
                  value={editInvoice?.customer?.city ?? ""}
                  onChange={(e) => onCustomerChange("city", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.city)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Estado:</span>
              {editMode ? (
                <input
                  value={editInvoice?.customer?.state ?? ""}
                  onChange={(e) => onCustomerChange("state", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.state)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>País:</span>
              {editMode ? (
                <input
                  value={editInvoice?.customer?.country ?? ""}
                  onChange={(e) => onCustomerChange("country", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(customer.country)}</span>
              )}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>Pago</div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Método:</span>
              {editMode ? (
                <input
                  value={editInvoice?.payment?.method ?? ""}
                  onChange={(e) => onPaymentChange("method", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(payment.method)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Referencia:</span>
              {editMode ? (
                <input
                  value={editInvoice?.payment?.reference ?? ""}
                  onChange={(e) => onPaymentChange("reference", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(payment.reference)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Tipo:</span>
              {editMode ? (
                <input
                  value={editInvoice?.type ?? ""}
                  onChange={(e) => onTopFieldChange("type", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(activeInvoice?.type)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Documento:</span>
              {editMode ? (
                <input
                  value={editInvoice?.docKind ?? ""}
                  onChange={(e) => onTopFieldChange("docKind", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(activeInvoice?.docKind)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>IVA %:</span>
              {editMode ? (
                <input
                  type="number"
                  value={editInvoice?.ivaPercent ?? 0}
                  onChange={(e) =>
                    onTopFieldChange("ivaPercent", Number(e.target.value))
                  }
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{safeText(String(ivaPercent))}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>IVA:</span>
              {editMode ? (
                <input
                  type="number"
                  value={editInvoice?.iva ?? 0}
                  onChange={(e) => onTopFieldChange("iva", Number(e.target.value))}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{formatCurrency(iva)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Subtotal:</span>
              {editMode ? (
                <input
                  type="number"
                  value={editInvoice?.amount ?? 0}
                  onChange={(e) => onTopFieldChange("amount", Number(e.target.value))}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{formatCurrency(subtotal)}</span>
              )}
            </div>

            <div className={styles.blockLine}>
              <span className={styles.k}>Total:</span>
              {editMode ? (
                <input
                  type="number"
                  value={editInvoice?.total ?? 0}
                  onChange={(e) => onTopFieldChange("total", Number(e.target.value))}
                  style={inputStyle}
                />
              ) : (
                <span className={styles.v}>{formatCurrency(total)}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.table}>
          <div className={styles.thead}>
            <div className={styles.th}>Descripción</div>
            <div className={styles.thCenter}>Cant.</div>
            <div className={styles.thRight}>Precio Unit.</div>
            <div className={styles.thRight}>Total</div>
            <div className={styles.thCenter}>Acciones</div>
          </div>

          {items.length === 0 ? (
            <div className={styles.trow}>
              <div className={styles.td} style={{ gridColumn: "1 / -1" }}>
                No hay items registrados.
              </div>
            </div>
          ) : (
            items.map((it, index) => {
              const qty = Number(it.quantity ?? 1);
              const unit = Number(it.unitPrice ?? it.rate ?? 0);
              const lineTotal = Number(it.total ?? qty * unit);

              return (
                <div className={styles.trow} key={String(it.id ?? `${it.name}-${index}`)}>
                  <div className={styles.td}>
                    {editMode ? (
                      <>
                        <input
                          value={it.name ?? ""}
                          onChange={(e) => onItemChange(index, "name", e.target.value)}
                          style={inputStyle}
                          placeholder="Descripción"
                        />
                        <input
                          value={it.kind ?? ""}
                          onChange={(e) => onItemChange(index, "kind", e.target.value)}
                          style={{ ...inputStyle, marginTop: 6 }}
                          placeholder="Tipo"
                        />
                        <input
                          value={it.serviceDescription ?? ""}
                          onChange={(e) =>
                            onItemChange(index, "serviceDescription", e.target.value)
                          }
                          style={{ ...inputStyle, marginTop: 6 }}
                          placeholder="Descripción servicio"
                        />
                      </>
                    ) : (
                      <>
                        <div className={styles.itemName}>{safeText(it.name)}</div>
                        <div className={styles.itemMeta}>
                          {safeText(it.kind)}{" "}
                          {it.serviceDescription ? `· ${it.serviceDescription}` : ""}
                        </div>
                      </>
                    )}
                  </div>

                  <div className={styles.tdCenter}>
                    {editMode ? (
                      <input
                        type="number"
                        value={it.quantity ?? 1}
                        onChange={(e) =>
                          onItemChange(index, "quantity", Number(e.target.value))
                        }
                        style={{ ...inputStyle, width: 90, textAlign: "center" }}
                      />
                    ) : (
                      qty
                    )}
                  </div>

                  <div className={styles.tdRight}>
                    {editMode ? (
                      <input
                        type="number"
                        value={it.unitPrice ?? it.rate ?? 0}
                        onChange={(e) =>
                          onItemChange(index, "unitPrice", Number(e.target.value))
                        }
                        style={{ ...inputStyle, width: 120, textAlign: "right" }}
                      />
                    ) : (
                      formatCurrency(unit)
                    )}
                  </div>

                  <div className={styles.tdRight}>
                    {editMode ? (
                      <input
                        type="number"
                        value={it.total ?? lineTotal}
                        onChange={(e) => onItemChange(index, "total", Number(e.target.value))}
                        style={{ ...inputStyle, width: 120, textAlign: "right" }}
                      />
                    ) : (
                      formatCurrency(lineTotal)
                    )}
                  </div>

                  <div
                    className={styles.tdCenter}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "center",
                    }}
                  >
                    {editMode ? (
                      <button
                        type="button"
                        className={styles.button}
                        onClick={() => onRemoveItem(index)}
                        style={{
                          background: "#fee2e2",
                          borderColor: "#fecaca",
                          color: "#991b1b",
                        }}
                      >
                        Quitar
                      </button>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {editMode ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className={styles.button} onClick={onAddItem}>
              + Agregar item
            </button>
          </div>
        ) : null}

        <div className={styles.totals}>
          <div className={styles.totalsBox}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Subtotal</span>
              <span className={styles.totalValue}>{formatCurrency(subtotal)}</span>
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>
                IVA {ivaPercent ? `(${ivaPercent}%)` : ""}
              </span>
              <span className={styles.totalValue}>{formatCurrency(iva)}</span>
            </div>
            <div className={styles.totalDivider} />
            <div className={styles.totalRowBig}>
              <span className={styles.totalLabelBig}>TOTAL</span>
              <span className={styles.totalValueBig}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerNote}>
            {facturaAnuladaInfo.isCancelled
              ? "Esta factura está anulada."
              : "Gracias por su compra. Este documento fue generado electrónicamente."}
          </div>
          <div className={styles.footerFine}>
            Estado: {facturaAnuladaInfo.label} · Nro Factura: {numeroFactura} · Nro
            Control: {numeroControl} · ID: {safeText(activeInvoice?.id)} · Fecha:{" "}
            {formatDate(activeInvoice?.date)} · Banco: {safeText(activeInvoice?.bank)}
          </div>
        </div>
      </div>
    </div>
  );
}