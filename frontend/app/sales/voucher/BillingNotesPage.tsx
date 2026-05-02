"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/types/invoice";
import styles from "./page.module.css";
import BillingTopActions from "./components/BillingTopActions";
import BillingSelectionBar from "./components/BillingSelectionBar";
import BillingInvoicesTable from "./components/BillingInvoicesTable";
import BillingDialogs from "./components/BillingDialogs";
import BillingContextMenu from "./components/BillingContextMenu";
import { ExportInvoice, formatMoney } from "./lib/billingExports";
import {
  ContextAction,
  ContextMenuState,
  FeedbackState,
  SortKey,
  filterInvoices,
  normalizeApiResponseToInvoices,
  readFromLocalStorage,
  sortInvoices,
  writeToLocalStorage,
} from "./lib/billing-notes";
import {
  createDerivedInvoice,
  ensureInvoiceIdLocal,
  normalizeInvoicesWithUniqueIds,
} from "./lib/invoiceIds";

const SORT_KEYS = ["date", "invoiceName", "total", "bank", "type"] as const;

export default function Page() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState<number | null>(
    null
  );

  const [showCloneConfirm, setShowCloneConfirm] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<Invoice | null>(null);

  const [modalMode, setModalMode] = useState<
    "new" | "edit" | "clone" | "debit" | "credit"
  >("new");

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

        const normalized = normalizeInvoicesWithUniqueIds(
          normalizeApiResponseToInvoices(data)
        );

        if (normalized.length > 0) {
          if (!cancelled) setInvoices(normalized);
          writeToLocalStorage(normalized);
          return;
        }

        const local = normalizeInvoicesWithUniqueIds(readFromLocalStorage());

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

        const local = normalizeInvoicesWithUniqueIds(readFromLocalStorage());
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
        setShowCloneConfirm(false);
        setCloneTarget(null);
        setModalMode("new");
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

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionAnchorIndex(null);
    setSelected(null);
  };

  const handleSave = (invoiceOrWrapper: any) => {
    try {
      const invoice = invoiceOrWrapper?.invoice ?? invoiceOrWrapper;
      if (!invoice) throw new Error("Invoice vacío en handleSave");

      const invoiceWithId = ensureInvoiceIdLocal(invoice);

      setInvoices((prev) => {
        const next = [
          invoiceWithId,
          ...prev.filter((x) => x.id !== invoiceWithId.id),
        ];
        writeToLocalStorage(next);
        return next;
      });

      setSelected(invoiceWithId);
      setSelectedIds([invoiceWithId.id]);
      setSelectionAnchorIndex(null);

      setEditingInvoice(null);
      setShowNewModal(false);
      setModalMode("new");
      setFeedback({
        type: "success",
        message: "Registro guardado correctamente.",
      });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Error al guardar la factura." });
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("¿Eliminar esta nota?")) return;

    const next = invoices.filter((i) => i.id !== id);
    persist(next);

    setSelectedIds((prev) => prev.filter((x) => x !== id));
    if (selected?.id === id) setSelected(null);

    if (editingInvoice?.id === id) {
      setEditingInvoice(null);
      setShowNewModal(false);
      setModalMode("new");
    }

    setFeedback({ type: "info", message: "Registro eliminado." });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;

    if (
      !window.confirm(
        `¿Eliminar ${count} registro(s) seleccionados? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    const next = invoices.filter((i) => !selectedIds.includes(i.id));
    persist(next);
    clearSelection();

    setFeedback({
      type: "info",
      message: `${count} registro(s) eliminado(s).`,
    });
  };

  const handleClearAll = () => {
    if (
      !window.confirm(
        "¿Eliminar todos los registros? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    persist([]);
    clearSelection();
    setEditingInvoice(null);
    setShowNewModal(false);
    setModalMode("new");
    setFeedback({
      type: "info",
      message: "Todos los registros fueron eliminados.",
    });
  };

  const openNewModal = () => {
    setEditingInvoice(null);
    setShowNewModal(true);
    setModalMode("new");
    setSelected(null);
    setContextMenu(null);
  };

  const handleEdit = (inv: Invoice) => {
    setEditingInvoice({ ...inv });
    setShowNewModal(true);
    setModalMode("edit");
    setSelected(null);
    setContextMenu(null);
  };

  const requestClone = (inv: Invoice) => {
    setCloneTarget(inv);
    setShowCloneConfirm(true);
    setSelected(null);
    setContextMenu(null);
  };

  const cancelClone = () => {
    setShowCloneConfirm(false);
    setCloneTarget(null);
  };

  const confirmClone = () => {
    if (!cloneTarget) return;

    setEditingInvoice(createDerivedInvoice(cloneTarget, "clone"));
    setModalMode("clone");
    setShowNewModal(true);
    setShowCloneConfirm(false);
    setCloneTarget(null);
    setSelected(null);
    setContextMenu(null);
    setFeedback({
      type: "info",
      message: "Se creó una copia lista para editar.",
    });
  };

  const handleDebitNote = (inv: Invoice) => {
    setEditingInvoice(createDerivedInvoice(inv, "debit"));
    setShowNewModal(true);
    setModalMode("debit");
    setSelected(null);
    setContextMenu(null);
    setFeedback({
      type: "info",
      message: "Se creó una nota débito lista para editar.",
    });
  };

  const handleCreditNote = (inv: Invoice) => {
    setEditingInvoice(createDerivedInvoice(inv, "credit"));
    setShowNewModal(true);
    setModalMode("credit");
    setSelected(null);
    setContextMenu(null);
    setFeedback({
      type: "info",
      message: "Se creó una nota crédito lista para editar.",
    });
  };

  const closeNewModal = () => {
    setShowNewModal(false);
    setEditingInvoice(null);
    setModalMode("new");
  };

  const downloadInvoice = (inv: Invoice) => {
    const blob = new Blob([JSON.stringify(inv, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: "success", message: "JSON descargado." });
  };

  const filtered = useMemo(
    () => sortInvoices(filterInvoices(invoices, filter), sortBy, sortDir),
    [invoices, filter, sortBy, sortDir]
  );

  const totalSum = useMemo(
    () => invoices.reduce((s, i) => s + Number(i.total ?? 0), 0),
    [invoices]
  );

  const filteredSum = useMemo(
    () => filtered.reduce((s, i) => s + Number(i.total ?? 0), 0),
    [filtered]
  );

  const uniqueBanks = useMemo(
    () => new Set(invoices.map((i) => i.bank?.trim()).filter(Boolean)).size,
    [invoices]
  );

  const totalCount = invoices.length;
  const filteredCount = filtered.length;
  const selectedCount = selectedIds.length;

  const sortLabel = {
    date: "Fecha",
    invoiceName: "Nombre",
    total: "Total",
    bank: "Banco",
    type: "Tipo",
  }[sortBy];

  const sortArrow = sortDir === "asc" ? "↑" : "↓";

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((s) => (s === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const goToView = (id: string) => router.push(`/sales/voucher/view/${id}`);

  const openContextMenu = (e: ReactMouseEvent, inv: Invoice) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 230;
    const menuHeight = 290;

    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);

    setContextMenu({ x: Math.max(8, x), y: Math.max(8, y), invoice: inv });
  };

  const toggleInvoiceId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectRange = (startIndex: number, endIndex: number) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const rangeIds = filtered.slice(start, end + 1).map((inv) => inv.id);
    setSelectedIds(rangeIds);
  };

  const handleRowClick = (
    inv: Invoice,
    index: number,
    e: ReactMouseEvent<HTMLTableRowElement>
  ) => {
    setContextMenu(null);

    if (e.shiftKey && selectionAnchorIndex !== null) {
      selectRange(selectionAnchorIndex, index);
      setSelected(null);
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      toggleInvoiceId(inv.id);
      setSelectionAnchorIndex(index);
      setSelected(null);
      return;
    }

    setSelectedIds([inv.id]);
    setSelectionAnchorIndex(index);
    setSelected(inv);
  };

  const handleRowCheckboxClick = (
    inv: Invoice,
    index: number,
    e: ReactMouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    setContextMenu(null);

    if (e.shiftKey && selectionAnchorIndex !== null) {
      selectRange(selectionAnchorIndex, index);
      setSelected(null);
      return;
    }

    toggleInvoiceId(inv.id);
    setSelectionAnchorIndex(index);
    setSelected(null);
  };

  const handleBulkClone = () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;

    if (!window.confirm(`¿Clonar ${count} comprobante(s) seleccionados?`)) {
      return;
    }

    const sources = invoices.filter((inv) => selectedIds.includes(inv.id));
    const clones = sources.map((inv) => createDerivedInvoice(inv, "clone"));

    const next = [...clones, ...invoices];
    persist(normalizeInvoicesWithUniqueIds(next));
    clearSelection();

    setFeedback({
      type: "success",
      message: `${count} comprobante(s) clonado(s).`,
    });
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
        requestClone(inv);
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

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const modalCopy =
    modalMode === "edit"
      ? {
          kicker: "EDITAR REGISTRO",
          title: "Editar comprobante",
          subtitle: "Modifica los datos y guarda los cambios.",
        }
      : modalMode === "clone"
      ? {
          kicker: "CLONAR REGISTRO",
          title: "Clonar comprobante",
          subtitle: "Revisa la copia y guarda el nuevo registro.",
        }
      : modalMode === "debit"
      ? {
          kicker: "NOTA DÉBITO",
          title: "Crear nota débito",
          subtitle: "Ajusta los datos y guarda el nuevo documento.",
        }
      : modalMode === "credit"
      ? {
          kicker: "NOTA CRÉDITO",
          title: "Crear nota crédito",
          subtitle: "Ajusta los datos y guarda el nuevo documento.",
        }
      : {
          kicker: "NUEVO REGISTRO",
          title: "Crear comprobante",
          subtitle: "Completa los datos y guarda el registro.",
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
                Busca, ordena, exporta y revisa tus comprobantes desde una vista
                más limpia.
              </p>
            </div>

            <BillingTopActions
              allInvoices={invoices as ExportInvoice[]}
              openNewModal={openNewModal}
              handleClearAll={handleClearAll}
              onOpenManyVoucher={() => {}}
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

          <BillingSelectionBar
            selectedCount={selectedCount}
            onBulkClone={handleBulkClone}
            onBulkDelete={handleBulkDelete}
            onClearSelection={clearSelection}
          />

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
                {invoices.length ? formatMoney(totalSum) : "0.00"}
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
          <BillingInvoicesTable
            filtered={filtered}
            selectedSet={selectedSet}
            selectedIds={selectedIds}
            totalCount={totalCount}
            filteredCount={filteredCount}
            filteredSum={filteredSum}
            totalSum={totalSum}
            loading={loading}
            sortLabel={sortLabel}
            sortArrow={sortArrow}
            sortBy={sortBy}
            sortKeys={SORT_KEYS}
            toggleSort={toggleSort}
            onRowClick={handleRowClick}
            onRowCheckboxClick={handleRowCheckboxClick}
            onOpenContextMenu={openContextMenu}
          />
        </main>

        <BillingDialogs
          showNewModal={showNewModal}
          closeNewModal={closeNewModal}
          modalCopy={modalCopy}
          modalMode={modalMode}
          editingInvoice={editingInvoice}
          handleSave={handleSave}
          showCloneConfirm={showCloneConfirm}
          cancelClone={cancelClone}
          confirmClone={confirmClone}
          cloneTarget={cloneTarget}
          selected={selected}
          goToView={goToView}
          handleEdit={handleEdit}
          requestClone={requestClone}
          handleDebitNote={handleDebitNote}
          handleCreditNote={handleCreditNote}
          downloadInvoice={downloadInvoice}
          handleDelete={handleDelete}
          closeSelected={() => setSelected(null)}
        />

        <BillingContextMenu
          contextMenu={contextMenu}
          onRunContextAction={runContextAction}
        />
      </div>
    </div>
  );
}