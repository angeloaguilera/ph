"use client";

import React, { useEffect, useMemo, useState } from "react";
import InvoiceForm from "@/components/forms/InvoiceForm";
import type { Invoice } from "@/types/invoice";
import styles from "./page.module.css";

const STORAGE_KEY = "invoices";

type SortKey = "date" | "invoiceName" | "total" | "bank" | "type";
type FeedbackType = "success" | "error" | "info";

const genId = () =>
  typeof globalThis !== "undefined" &&
  (globalThis as any).crypto &&
  "randomUUID" in (globalThis as any).crypto
    ? (globalThis as any).crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function ensureInvoiceId(inv: Partial<Invoice>): Invoice {
  if ((inv as Invoice).id) return inv as Invoice;
  return { ...(inv as Invoice), id: genId() } as Invoice;
}

const formatCurrency = (n?: number | string) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
};

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export default function BillingNotesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message: string } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setInvoices([]);
        return;
      }

      const withIds = parsed.map((p) => ensureInvoiceId(p));
      const needsPersist = withIds.some((w, i) => !parsed[i]?.id || parsed[i].id !== w.id);

      setInvoices(withIds);

      if (needsPersist) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(withIds));
        } catch (e) {
          console.error("Error re-guardando invoices con ids:", e);
        }
      }
    } catch (err) {
      console.error("Error reading invoices from storage:", err);
      setInvoices([]);
    }
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setShowNewModal(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const persist = (next: Invoice[]) => {
    setInvoices(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Error saving invoices to storage:", err);
      setFeedback({ type: "error", message: "No se pudieron guardar los cambios." });
    }
  };

  const handleSave = (invoiceOrWrapper: any) => {
    setLoading(true);
    try {
      const invoice = invoiceOrWrapper?.invoice ?? invoiceOrWrapper;
      if (!invoice) throw new Error("Invoice vacío en handleSave");

      const invoiceWithId = ensureInvoiceId(invoice);

      setInvoices((prev) => {
        const next = [invoiceWithId, ...prev.filter((x) => x.id !== invoiceWithId.id)];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (err) {
          console.error("Error saving invoices to storage:", err);
        }
        return next;
      });

      setSelected(invoiceWithId);
      setShowNewModal(false);
      setFeedback({ type: "success", message: "Registro guardado correctamente." });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Error al guardar la factura." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("¿Eliminar esta nota?")) return;
    const next = invoices.filter((i) => i.id !== id);
    persist(next);
    if (selected?.id === id) setSelected(null);
    setFeedback({ type: "info", message: "Registro eliminado." });
  };

  const handleClearAll = () => {
    if (!window.confirm("¿Eliminar todos los registros? Esta acción no se puede deshacer.")) return;
    persist([]);
    setSelected(null);
    setFeedback({ type: "info", message: "Todos los registros fueron eliminados." });
  };

  const downloadInvoice = (inv: Invoice) => {
    const blob = new Blob([JSON.stringify(inv, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: "success", message: "JSON descargado." });
  };

  const downloadAll = () => {
    const blob = new Blob([JSON.stringify(invoices, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-all-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: "success", message: "Exportación JSON lista." });
  };

  const toCSV = (rows: Invoice[]) => {
    const headers = ["id", "type", "invoiceName", "date", "bank", "amount", "iva", "total", "description"];
    const lines = [headers.join(",")];

    for (const r of rows) {
      const vals = [
        escapeCsv(r.id ?? ""),
        escapeCsv(r.type ?? ""),
        escapeCsv(r.invoiceName ?? ""),
        escapeCsv(r.date ?? ""),
        escapeCsv(r.bank ?? ""),
        Number(r.amount ?? 0).toFixed(2),
        Number(r.iva ?? 0).toFixed(2),
        Number(r.total ?? 0).toFixed(2),
        escapeCsv(String(r.description ?? "")),
      ];
      lines.push(vals.join(","));
    }

    return lines.join("\n");
  };

  const downloadCSV = (rows: Invoice[]) => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: "success", message: "CSV descargado." });
  };

  const copyCSVToClipboard = async (rows: Invoice[]) => {
    const csv = toCSV(rows);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv);
      } else {
        const ta = document.createElement("textarea");
        ta.value = csv;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setFeedback({ type: "success", message: "CSV copiado al portapapeles." });
    } catch (err) {
      console.error("No se pudo copiar CSV:", err);
      setFeedback({ type: "error", message: "No se pudo copiar al portapapeles." });
    }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();

    const res = invoices.filter((inv) => {
      if (!q) return true;
      return (
        (inv.invoiceName ?? "").toLowerCase().includes(q) ||
        String(inv.description ?? "").toLowerCase().includes(q) ||
        (inv.bank ?? "").toLowerCase().includes(q) ||
        (inv.date ?? "").toLowerCase().includes(q) ||
        (inv.type ?? "").toLowerCase().includes(q)
      );
    });

    return res.slice().sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortBy === "date") {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return (da - db) * dir;
      }

      if (sortBy === "total") {
        return (Number(a.total ?? 0) - Number(b.total ?? 0)) * dir;
      }

      if (sortBy === "invoiceName") {
        return String(a.invoiceName ?? "").localeCompare(String(b.invoiceName ?? "")) * dir;
      }

      if (sortBy === "bank") {
        return String(a.bank ?? "").localeCompare(String(b.bank ?? "")) * dir;
      }

      if (sortBy === "type") {
        return String(a.type ?? "").localeCompare(String(b.type ?? "")) * dir;
      }

      return 0;
    });
  }, [invoices, filter, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((s) => (s === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const totalSum = useMemo(() => {
    return invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
  }, [invoices]);

  const filteredSum = useMemo(() => {
    return filtered.reduce((s, i) => s + Number(i.total ?? 0), 0);
  }, [filtered]);

  const uniqueBanks = useMemo(() => {
    return new Set(invoices.map((i) => i.bank?.trim()).filter(Boolean)).size;
  }, [invoices]);

  const totalCount = invoices.length;
  const filteredCount = filtered.length;

  const sortLabel = {
    date: "Fecha",
    invoiceName: "Nombre",
    total: "Total",
    bank: "Banco",
    type: "Tipo",
  }[sortBy];

  const sortArrow = sortDir === "asc" ? "↑" : "↓";

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

            <div className={styles.heroActions}>
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className={styles.plusButton}
                aria-label="Nuevo registro"
                title="Nuevo registro"
              >
                +
              </button>
              <button
                onClick={() => downloadCSV(filtered)}
                disabled={filteredCount === 0}
                className={styles.actionButton}
              >
                Exportar CSV
              </button>
              <button
                onClick={() => copyCSVToClipboard(filtered)}
                disabled={filteredCount === 0}
                className={styles.actionButton}
              >
                Copiar CSV
              </button>
              <button
                onClick={downloadAll}
                disabled={totalCount === 0}
                className={styles.actionButton}
              >
                Descargar JSON
              </button>
              <button
                onClick={handleClearAll}
                disabled={totalCount === 0}
                className={styles.dangerButton}
              >
                Borrar todo
              </button>
            </div>
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
              <div className={styles.statValue}>{formatCurrency(totalSum)}</div>
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
                  {filteredCount} resultado(s) · ordenado por {sortLabel} {sortArrow}
                </p>
              </div>

              <div className={styles.sortChips}>
                <button
                  onClick={() => toggleSort("date")}
                  className={[styles.chip, sortBy === "date" ? styles.chipActive : ""].join(" ")}
                >
                  Fecha {sortBy === "date" ? sortArrow : ""}
                </button>
                <button
                  onClick={() => toggleSort("invoiceName")}
                  className={[styles.chip, sortBy === "invoiceName" ? styles.chipActive : ""].join(" ")}
                >
                  Nombre {sortBy === "invoiceName" ? sortArrow : ""}
                </button>
                <button
                  onClick={() => toggleSort("total")}
                  className={[styles.chip, sortBy === "total" ? styles.chipActive : ""].join(" ")}
                >
                  Total {sortBy === "total" ? sortArrow : ""}
                </button>
                <button
                  onClick={() => toggleSort("bank")}
                  className={[styles.chip, sortBy === "bank" ? styles.chipActive : ""].join(" ")}
                >
                  Banco {sortBy === "bank" ? sortArrow : ""}
                </button>
                <button
                  onClick={() => toggleSort("type")}
                  className={[styles.chip, sortBy === "type" ? styles.chipActive : ""].join(" ")}
                >
                  Tipo {sortBy === "type" ? sortArrow : ""}
                </button>
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
                  <button onClick={() => setFilter("")} className={styles.clearSearchButton}>
                    Limpiar
                  </button>
                )}
              </div>

              <div className={styles.filteredTotal}>
                Total filtrado: <span>{formatCurrency(filteredSum)}</span>
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
                      <th className={styles.thCenter}>Acciones</th>
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
                      filtered.map((inv) => (
                        <tr
                          key={inv.id}
                          className={styles.tableRow}
                          onClick={() => setSelected(inv)}
                          title="Click para ver detalle"
                        >
                          <td className={styles.td}>
                            <span className={styles.typeTag}>{inv.type ?? "—"}</span>
                          </td>

                          <td className={styles.td}>
                            <div className={styles.cellTitle}>{inv.invoiceName || "Sin nombre"}</div>
                            {inv.description ? (
                              <div className={styles.cellDescription}>{inv.description}</div>
                            ) : (
                              <div className={styles.cellMuted}>Sin descripción</div>
                            )}
                          </td>

                          <td className={styles.tdMuted}>{formatDate(inv.date)}</td>

                          <td className={styles.tdMuted}>{inv.bank || "—"}</td>

                          <td className={styles.tdRightMono}>{formatCurrency(inv.total)}</td>

                          <td className={styles.td}>
                            <div className={styles.rowActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadInvoice(inv);
                                }}
                                className={styles.smallButton}
                              >
                                Descargar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(inv.id);
                                }}
                                className={styles.smallDangerButton}
                              >
                                Eliminar
                              </button>
                            </div>
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
                      <td className={styles.tfootValue}>{formatCurrency(totalSum)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className={styles.tip}>
              Tip: haz clic sobre una fila para abrir el detalle completo.
            </div>
          </section>
        </main>

        {showNewModal && (
          <div role="dialog" aria-modal="true" className={styles.modalOverlay}>
            <div className={styles.modalBackdrop} onClick={() => setShowNewModal(false)} />
            <div className={styles.modalCardLarge}>
              <div className={styles.modalHeader}>
                <div>
                  <div className={styles.kickerDark}>NUEVO REGISTRO</div>
                  <h3 className={styles.modalTitle}>Crear comprobante</h3>
                  <div className={styles.modalSubtext}>Completa los datos y guarda el registro.</div>
                </div>

                <button
                  onClick={() => setShowNewModal(false)}
                  className={styles.actionButton}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              <div className={styles.modalBodyScroll}>
                <div className={styles.formFrame}>
                  <InvoiceForm onSave={handleSave} />
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
                  <h3 className={styles.modalTitle}>{selected.invoiceName || "Sin nombre"}</h3>
                  <div className={styles.modalSubtext}>
                    {formatDate(selected.date)} · {selected.bank || "—"}
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <div className={styles.totalCard}>
                    <div className={styles.totalLabel}>Total</div>
                    <div className={styles.totalValue}>{formatCurrency(selected.total)}</div>
                  </div>

                  <button onClick={() => downloadInvoice(selected)} className={styles.actionButton}>
                    Descargar
                  </button>
                  <button onClick={() => handleDelete(selected.id)} className={styles.dangerButton}>
                    Eliminar
                  </button>
                  <button onClick={() => setSelected(null)} className={styles.actionButton}>
                    Cerrar
                  </button>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailCard}>
                    <div className={styles.detailLabel}>Monto</div>
                    <div className={styles.detailValue}>{formatCurrency(selected.amount)}</div>
                  </div>

                  <div className={styles.detailCard}>
                    <div className={styles.detailLabel}>IVA</div>
                    <div className={styles.detailValue}>{formatCurrency(selected.iva)}</div>
                  </div>

                  <div className={styles.detailWide}>
                    <div className={styles.detailLabel}>Descripción</div>
                    <div className={styles.detailText}>{selected.description || "—"}</div>
                  </div>

                  <div className={styles.detailGrid3}>
                    <div className={styles.detailCard}>
                      <div className={styles.detailLabel}>ID</div>
                      <div className={styles.detailMono}>{selected.id}</div>
                    </div>

                    <div className={styles.detailCard}>
                      <div className={styles.detailLabel}>Banco</div>
                      <div className={styles.detailValueSmall}>{selected.bank || "—"}</div>
                    </div>

                    <div className={styles.detailCard}>
                      <div className={styles.detailLabel}>Fecha</div>
                      <div className={styles.detailValueSmall}>{formatDate(selected.date)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}