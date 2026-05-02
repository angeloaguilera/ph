"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Invoice } from "@/types/invoice";
import styles from "./page.module.css";

import {
  API_BASE,
  STORAGE_KEY,
  createInputStyle,
  fromInputDate,
  getRealVoucherUrl,
  normalizeInvoiceForEdit,
  recalcInvoiceTotals,
  safeText,
} from "../../lib/voucher/voucher.utils";

import { useVoucherDownloads } from "../../hooks/useVoucherDownloads";
import { VoucherHeader } from "../../components/voucher/VoucherHeader";
import { VoucherPaper } from "../../components/voucher/VoucherPaper";

export default function VoucherViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadType, setDownloadType] = useState("");
  const [message, setMessage] = useState<string>("");

  const invoiceRef = useRef<HTMLDivElement | null>(null);

  const { downloadAsPNG, downloadAsPDF, downloadAsExcel } =
    useVoucherDownloads(invoiceRef);

  const id = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw || !id) {
        setInvoice(null);
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setInvoice(null);
        setLoading(false);
        return;
      }

      const found =
        parsed.find((x: Invoice) => String(x.id) === String(id)) ?? null;

      setInvoice(found);
      setEditInvoice(found ? normalizeInvoiceForEdit(found) : null);
    } catch (err) {
      console.error("Error cargando factura:", err);
      setInvoice(null);
      setEditInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (invoice && !editInvoice) {
      setEditInvoice(normalizeInvoiceForEdit(invoice));
    }
  }, [invoice, editInvoice]);

  const getActiveInvoice = () => {
    return editMode && editInvoice
      ? recalcInvoiceTotals(editInvoice)
      : invoice;
  };

  const getActiveVoucherUrl = () => {
    return getRealVoucherUrl(editMode && editInvoice ? editInvoice : invoice);
  };

  const viewRealInvoice = () => {
    const url = getActiveVoucherUrl();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const syncLocalStorage = (updatedInvoice: any) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const next = parsed.map((x: any) =>
        String(x.id) === String(updatedInvoice.id) ? updatedInvoice : x
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Error sincronizando localStorage:", err);
    }
  };

  const handleStartEdit = () => {
    if (!invoice) return;
    setEditInvoice(normalizeInvoiceForEdit(invoice));
    setEditMode(true);
    setMessage("");
  };

  const handleCancelEdit = () => {
    if (invoice) setEditInvoice(normalizeInvoiceForEdit(invoice));
    setEditMode(false);
    setMessage("Edición cancelada.");
  };

  const handleTopFieldChange = (field: string, value: any) => {
    setEditInvoice((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCustomerChange = (field: string, value: any) => {
    setEditInvoice((prev: any) => ({
      ...prev,
      customer: {
        ...(prev?.customer ?? {}),
        [field]: value,
      },
    }));
  };

  const handlePaymentChange = (field: string, value: any) => {
    setEditInvoice((prev: any) => ({
      ...prev,
      payment: {
        ...(prev?.payment ?? {}),
        [field]: value,
      },
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setEditInvoice((prev: any) => {
      const items = Array.isArray(prev?.items) ? [...prev.items] : [];
      const nextItem = {
        ...(items[index] ?? {
          id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: "",
          kind: "",
          serviceDescription: "",
          quantity: 1,
          unitPrice: 0,
          rate: 0,
          total: 0,
        }),
        [field]: value,
      };

      if (field === "quantity" || field === "unitPrice" || field === "rate") {
        const qty = Number(nextItem.quantity ?? 0);
        const unit = Number(nextItem.unitPrice ?? nextItem.rate ?? 0);
        nextItem.quantity = qty;
        nextItem.unitPrice = unit;
        nextItem.rate = unit;
        nextItem.total = Number((qty * unit).toFixed(2));
      }

      if (field === "total") {
        nextItem.total = Number(value);
      }

      items[index] = nextItem;
      return {
        ...prev,
        items,
      };
    });
  };

  const addItem = () => {
    setEditInvoice((prev: any) => ({
      ...prev,
      items: Array.isArray(prev?.items)
        ? [
            ...prev.items,
            {
              id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              name: "",
              kind: "",
              serviceDescription: "",
              quantity: 1,
              unitPrice: 0,
              rate: 0,
              total: 0,
            },
          ]
        : [
            {
              id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              name: "",
              kind: "",
              serviceDescription: "",
              quantity: 1,
              unitPrice: 0,
              rate: 0,
              total: 0,
            },
          ],
    }));
  };

  const removeItem = (index: number) => {
    setEditInvoice((prev: any) => ({
      ...prev,
      items: Array.isArray(prev?.items)
        ? prev.items.filter((_: any, i: number) => i !== index)
        : [],
    }));
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    const ok = window.confirm(
      "¿Seguro que quieres eliminar esta factura? Esta acción no se puede deshacer."
    );
    if (!ok) return;

    setDeleting(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/${invoice.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Error al eliminar: ${res.status}`);
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const next = parsed.filter(
              (x: any) => String(x.id) !== String(invoice.id)
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }
        }
      } catch (storageErr) {
        console.error("Error actualizando localStorage tras delete:", storageErr);
      }

      setMessage("Factura eliminada correctamente.");
      router.push("/sales/voucher");
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || "No se pudo eliminar la factura.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!editInvoice || !invoice) return;

    setSaving(true);
    setMessage("");

    try {
      const payload = recalcInvoiceTotals({
        ...editInvoice,
        date: editInvoice.date ? fromInputDate(editInvoice.date) : invoice.date,
      });

      const res = await fetch(`${API_BASE}/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Error al publicar: ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      const updatedInvoice = data?.invoice ?? data?.data ?? data ?? payload;

      setInvoice(updatedInvoice);
      setEditInvoice(normalizeInvoiceForEdit(updatedInvoice));
      syncLocalStorage(updatedInvoice);
      setEditMode(false);
      setMessage("Factura publicada correctamente.");
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || "No se pudo publicar la factura.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditOrPublish = async () => {
    if (editMode) {
      await handleSaveInvoice();
      return;
    }
    handleStartEdit();
  };

  const handleDownloadTypeChange = async (value: string) => {
    setDownloadType(value);

    try {
      const current = getActiveInvoice();

      if (value === "pdf" && current) {
        await downloadAsPDF(current.id);
      } else if (value === "excel" && current) {
        await downloadAsExcel(current);
      } else if (value === "image" && current) {
        await downloadAsPNG(current.id);
      }
    } catch (err) {
      console.error("Error al descargar:", err);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.shell}>
            <div className={styles.card}>Cargando...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.shell}>
            <div className={styles.card}>
              <h1 className={styles.title}>Factura no encontrada</h1>
              <p className={styles.text}>
                No existe un registro con ese ID en el almacenamiento local.
              </p>

              <div className={styles.actions}>
                <button
                  className={styles.button}
                  onClick={() => router.push("/sales/voucher")}
                >
                  Volver
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeInvoice: any = getActiveInvoice();
  const hasVoucher = Boolean(getActiveVoucherUrl());
  const inputStyle = createInputStyle();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.shell}>
          <VoucherHeader
            title="Vista de factura"
            subtitle={`${safeText(activeInvoice?.type)} · ${safeText(
              activeInvoice?.docKind
            )} · ${safeText(
              activeInvoice?.date ? new Date(activeInvoice.date).toISOString() : ""
            )}`}
            hasVoucher={hasVoucher}
            editMode={editMode}
            saving={saving}
            deleting={deleting}
            downloadType={downloadType}
            onBack={() => router.back()}
            onViewReal={viewRealInvoice}
            onDownloadTypeChange={handleDownloadTypeChange}
            onEditOrPublish={handleEditOrPublish}
            onCancelEdit={handleCancelEdit}
            onDeleteInvoice={handleDeleteInvoice}
          />

          {message ? (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#334155",
                fontSize: 14,
              }}
            >
              {message}
            </div>
          ) : null}

          <VoucherPaper
            invoiceRef={invoiceRef}
            activeInvoice={activeInvoice}
            editMode={editMode}
            editInvoice={editInvoice}
            inputStyle={inputStyle}
            onTopFieldChange={handleTopFieldChange}
            onCustomerChange={handleCustomerChange}
            onPaymentChange={handlePaymentChange}
            onItemChange={handleItemChange}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />

          <div className={styles.hint}>
            Tip: lo que se exporta a PDF/imagen es el bloque blanco (“paper”).
          </div>
        </div>
      </div>
    </div>
  );
}