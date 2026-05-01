"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InvoiceForm from "@/components/forms/InvoiceForm";
import type { Invoice } from "@/types/invoice";
import styles from "./page.module.css";

const STORAGE_KEY = "invoices";

type SortKey = "date" | "invoiceName" | "total" | "bank" | "type";
type FeedbackType = "success" | "error" | "info";
type ContextAction = "view" | "edit" | "clone" | "debit" | "credit" | "download" | "delete";

const genId = () =>
  typeof globalThis !== "undefined" &&
  (globalThis as any).crypto &&
  "randomUUID" in (globalThis as any).crypto
    ? (globalThis as any).crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function ensureInvoiceId(inv: Partial<Invoice> | any): Invoice {
  if (inv?.id) return inv as Invoice;
  return { ...(inv as Invoice), id: genId() } as Invoice;
}

function normalizeApiResponseToInvoices(data: any): Invoice[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((x: Partial<Invoice>) => ensureInvoiceId(x));
  }

  if (Array.isArray(data?.invoices)) {
    return data.invoices.map((x: Partial<Invoice>) => ensureInvoiceId(x));
  }

  if (data?.invoice && typeof data.invoice === "object") {
    return [ensureInvoiceId(data.invoice)];
  }

  if (typeof data === "object" && !Array.isArray(data)) {
    const looksLikeInvoice =
      "invoiceName" in data ||
      "total" in data ||
      "date" in data ||
      "numeroFactura" in data ||
      "customer" in data;

    if (looksLikeInvoice) {
      return [ensureInvoiceId(data)];
    }
  }

  return [];
}

function readFromLocalStorage(): Invoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ensureInvoiceId(p));
  } catch {
    return [];
  }
}

function writeToLocalStorage(invoices: Invoice[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error("Error guardando en localStorage:", e);
  }
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
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message: string } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    invoice: Invoice;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadInvoices = async () => {
      setLoading(true);

      try {
        const res = await fetch("/api/invoices", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const rawText = await res.text();

        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = rawText ? { message: rawText } : null;
        }

        if (!res.ok) {
          console.error("API /api/invoices falló:", {
            status: res.status,
            statusText: res.statusText,
            rawText,
            parsedBody: data,
          });
          throw new Error(
            `Error HTTP ${res.status}: ${
              data?.message || rawText || res.statusText || "Error desconocido"
            }`
          );
        }

        const normalized = normalizeApiResponseToInvoices(data);

        if (normalized.length > 0) {
          if (!cancelled) setInvoices(normalized);
          writeToLocalStorage(normalized);
          return;
        }

        const local = readFromLocalStorage();
        if (!cancelled) {
          if (local.length > 0) {
            setInvoices(local);
            setFeedback({
              type: "info",
              message: "La API no devolvió facturas; se cargó la copia local.",
            });
          } else {
            setInvoices([]);
            setFeedback({
              type: "info",
              message: "La API respondió bien, pero no hay facturas guardadas.",
            });
          }
        }
      } catch (err) {
        console.error("Error cargando invoices desde API:", err);

        const local = readFromLocalStorage();
        if (!cancelled) {
          if (local.length > 0) {
            setInvoices(local);
            setFeedback({
              type: "info",
              message: "No se pudo conectar con la API; se cargó la copia local.",
            });
          } else {
            setInvoices([]);
            setFeedback({
              type: "error",
              message: "No se pudieron cargar los registros.",
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadInvoices();

    return () => {
      cancelled = true;
    };
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
        setEditingInvoice(null);
        setContextMenu(null);
      }
    };

    const closeMenu = () => setContextMenu(null);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    document.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      document.removeEventListener("click", closeMenu);
    };
  }, []);

  const persist = (next: Invoice[]) => {
    setInvoices(next);
    writeToLocalStorage(next);
  };

  const handleSave = (invoiceOrWrapper: any) => {
    try {
      const invoice = invoiceOrWrapper?.invoice ?? invoiceOrWrapper;
      if (!invoice) throw new Error("Invoice vacío en handleSave");

      const invoiceWithId = ensureInvoiceId(invoice);

      setInvoices((prev) => {
        const next = [invoiceWithId, ...prev.filter((x) => x.id !== invoiceWithId.id)];
        writeToLocalStorage(next);
        return next;
      });

      setSelected(invoiceWithId);
      setEditingInvoice(null);
      setShowNewModal(false);
      setFeedback({ type: "success", message: "Registro guardado correctamente." });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Error al guardar la factura." });
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("¿Eliminar esta nota?")) return;
    const next = invoices.filter((i) => i.id !== id);
    persist(next);
    if (selected?.id === id) setSelected(null);
    if (editingInvoice?.id === id) {
      setEditingInvoice(null);
      setShowNewModal(false);
    }
    setFeedback({ type: "info", message: "Registro eliminado." });
  };

  const handleClearAll = () => {
    if (!window.confirm("¿Eliminar todos los registros? Esta acción no se puede deshacer.")) return;
    persist([]);
    setSelected(null);
    setEditingInvoice(null);
    setShowNewModal(false);
    setFeedback({ type: "info", message: "Todos los registros fueron eliminados." });
  };

  const openNewModal = () => {
    setEditingInvoice(null);
    setShowNewModal(true);
    setSelected(null);
    setContextMenu(null);
  };

  const handleEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setShowNewModal(true);
    setSelected(null);
    setContextMenu(null);
  };

  const createDerivedInvoice = (base: Invoice, kind: "clone" | "debit" | "credit"): Invoice => {
    const typeByKind: Record<typeof kind, string> = {
      clone: base.type ?? "Clon",
      debit: "Nota débito",
      credit: "Nota crédito",
    };

    const suffixByKind: Record<typeof kind, string> = {
      clone: " (copia)",
      debit: " (nota débito)",
      credit: " (nota crédito)",
    };

    return ensureInvoiceId({
      ...base,
      id: genId(),
      type: typeByKind[kind],
      invoiceName: `${base.invoiceName ?? "Sin nombre"}${suffixByKind[kind]}`,
    });
  };

  const handleClone = (inv: Invoice) => {
    setEditingInvoice(createDerivedInvoice(inv, "clone"));
    setShowNewModal(true);
    setSelected(null);
    setContextMenu(null);
    setFeedback({ type: "info", message: "Se creó una copia lista para editar." });
  };

  const handleDebitNote = (inv: Invoice) => {
    setEditingInvoice(createDerivedInvoice(inv, "debit"));
    setShowNewModal(true);
    setSelected(null);
    setContextMenu(null);
    setFeedback({ type: "info", message: "Se creó una nota débito lista para editar." });
  };

  const handleCreditNote = (inv: Invoice) => {
    setEditingInvoice(createDerivedInvoice(inv, "credit"));
    setShowNewModal(true);
    setSelected(null);
    setContextMenu(null);
    setFeedback({ type: "info", message: "Se creó una nota crédito lista para editar." });
  };

  const closeNewModal = () => {
    setShowNewModal(false);
    setEditingInvoice(null);
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
      if (sortBy === "total") return (Number(a.total ?? 0) - Number(b.total ?? 0)) * dir;
      if (sortBy === "invoiceName") return String(a.invoiceName ?? "").localeCompare(String(b.invoiceName ?? "")) * dir;
      if (sortBy === "bank") return String(a.bank ?? "").localeCompare(String(b.bank ?? "")) * dir;
      if (sortBy === "type") return String(a.type ?? "").localeCompare(String(b.type ?? "")) * dir;
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

  const totalSum = useMemo(() => invoices.reduce((s, i) => s + Number(i.total ?? 0), 0), [invoices]);
  const filteredSum = useMemo(() => filtered.reduce((s, i) => s + Number(i.total ?? 0), 0), [filtered]);
  const uniqueBanks = useMemo(
    () => new Set(invoices.map((i) => i.bank?.trim()).filter(Boolean)).size,
    [invoices]
  );

  const totalCount = invoices.length;
  const filteredCount = filtered.length;

  const sortLabel = { date: "Fecha", invoiceName: "Nombre", total: "Total", bank: "Banco", type: "Tipo" }[sortBy];
  const sortArrow = sortDir === "asc" ? "↑" : "↓";

  const goToView = (id: string) => router.push(`/sales/voucher/view/${id}`);

  const openContextMenu = (e: React.MouseEvent, inv: Invoice) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 230;
    const menuHeight = 290;

    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);

    setContextMenu({ x: Math.max(8, x), y: Math.max(8, y), invoice: inv });
  };

  const runContextAction = (action: ContextAction, inv: Invoice) => {
    setContextMenu(null);

    switch (action) {
      case "view":
        goToView(inv.id);
        return;
      case "edit":
        handleEdit(inv);
        return;
      case "clone":
        handleClone(inv);
        return;
      case "debit":
        handleDebitNote(inv);
        return;
      case "credit":
        handleCreditNote(inv);
        return;
      case "download":
        downloadInvoice(inv);
        return;
      case "delete":
        handleDelete(inv.id);
        return;
    }
  };

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
                onClick={openNewModal}
                className={styles.plusButton}
                aria-label="Nuevo registro"
                title="Nuevo registro"
              >
                +
              </button>
              <button type="button" onClick={() => downloadCSV(filtered)} disabled={filteredCount === 0} className={styles.actionButton}>
                Exportar CSV
              </button>
              <button type="button" onClick={() => copyCSVToClipboard(filtered)} disabled={filteredCount === 0} className={styles.actionButton}>
                Copiar CSV
              </button>
              <button type="button" onClick={downloadAll} disabled={totalCount === 0} className={styles.actionButton}>
                Descargar JSON
              </button>
              <button type="button" onClick={handleClearAll} disabled={totalCount === 0} className={styles.dangerButton}>
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
                  {loading ? "Cargando..." : `${filteredCount} resultado(s) · ordenado por ${sortLabel} ${sortArrow}`}
                </p>
              </div>

              <div className={styles.sortChips}>
                {(["date", "invoiceName", "total", "bank", "type"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSort(key)}
                    className={[styles.chip, sortBy === key ? styles.chipActive : ""].join(" ")}
                  >
                    {{ date: "Fecha", invoiceName: "Nombre", total: "Total", bank: "Banco", type: "Tipo" }[key]}
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
                  <button type="button" onClick={() => setFilter("")} className={styles.clearSearchButton}>
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
                    </tr>
                  </thead>

                  <tbody className={styles.tbody}>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.emptyCell}>
                          <div className={styles.emptyBox}>
                            <div className={styles.emptyTitle}>No hay coincidencias</div>
                            <div className={styles.emptyText}>Ajusta el filtro o agrega un nuevo registro.</div>
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
                  <div className={styles.kickerDark}>{editingInvoice ? "EDITAR REGISTRO" : "NUEVO REGISTRO"}</div>
                  <h3 className={styles.modalTitle}>{editingInvoice ? "Editar comprobante" : "Crear comprobante"}</h3>
                  <div className={styles.modalSubtext}>
                    {editingInvoice ? "Modifica los datos y guarda los cambios." : "Completa los datos y guarda el registro."}
                  </div>
                </div>
                <button type="button" onClick={closeNewModal} className={styles.actionButton}>Cerrar</button>
              </div>
              <div className={styles.modalBodyScroll}>
                <div className={styles.formFrame}>
                  <InvoiceForm onSave={handleSave} initialData={editingInvoice ?? undefined} />
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
                  <button type="button" onClick={() => goToView(selected.id)} className={styles.actionButton}>Ver</button>
                  <button type="button" onClick={() => handleEdit(selected)} className={styles.actionButton}>Editar</button>
                  <button type="button" onClick={() => handleClone(selected)} className={styles.actionButton}>Clonar</button>
                  <button type="button" onClick={() => handleDebitNote(selected)} className={styles.actionButton}>Nota débito</button>
                  <button type="button" onClick={() => handleCreditNote(selected)} className={styles.actionButton}>Nota crédito</button>
                  <button type="button" onClick={() => downloadInvoice(selected)} className={styles.actionButton}>Descargar</button>
                  <button type="button" onClick={() => handleDelete(selected.id)} className={styles.dangerButton}>Eliminar</button>
                  <button type="button" onClick={() => setSelected(null)} className={styles.actionButton}>Cerrar</button>
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

        {contextMenu && (
          <div
            style={{
              position: "fixed",
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 9999,
              width: 230,
              background: "#111827",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              padding: 8,
              backdropFilter: "blur(12px)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                padding: "8px 10px 10px",
                opacity: 0.75,
              }}
            >
              Acciones
            </div>

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
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: item.danger ? "rgba(239,68,68,0.15)" : "transparent",
                  color: item.danger ? "#fecaca" : "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}