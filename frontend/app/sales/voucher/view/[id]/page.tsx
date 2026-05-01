"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Invoice } from "@/types/invoice";
import styles from "./page.module.css";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const STORAGE_KEY = "invoices";

const formatCurrency = (n?: number | string) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-ES", {
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
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const safeText = (v?: string | null) => (v && v.trim().length ? v : "—");

export default function VoucherViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadType, setDownloadType] = useState("");

  const invoiceRef = useRef<HTMLDivElement | null>(null);

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
    } catch (err) {
      console.error("Error cargando factura:", err);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const downloadAsPNG = async () => {
    if (!invoiceRef.current || !invoice) return;

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `factura-${invoice.id}.png`;
    a.click();
  };

  const downloadAsPDF = async () => {
    if (!invoiceRef.current || !invoice) return;

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = -((imgHeight - heightLeft) as number);
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`factura-${invoice.id}.pdf`);
  };

  const downloadAsExcel = async () => {
    if (!invoice) return;

    const XLSX = await import("xlsx");

    const inv: any = invoice;
    const items: any[] = Array.isArray(inv.items) ? inv.items : [];
    const customer = inv.customer ?? {};
    const payment = inv.payment ?? {};

    const subtotal = Number(inv.amount ?? 0);
    const iva = Number(inv.iva ?? 0);
    const total = Number(inv.total ?? subtotal + iva);
    const ivaPercent = Number(inv.ivaPercent ?? 0);

    const summaryRows = [
      { Campo: "ID", Valor: safeText(inv.id) },
      { Campo: "Tipo", Valor: safeText(inv.type) },
      { Campo: "Documento", Valor: safeText(inv.docKind) },
      { Campo: "Número de factura", Valor: safeText(inv.numeroFactura) },
      { Campo: "Número de control", Valor: safeText(inv.numeroControl) },
      { Campo: "Fecha", Valor: formatDate(inv.date) },
      { Campo: "Banco", Valor: safeText(inv.bank) },
      { Campo: "Nombre factura", Valor: safeText(inv.invoiceName) },
      { Campo: "Cliente", Valor: safeText(customer.name) },
      { Campo: "RIF", Valor: safeText(customer.rif) },
      { Campo: "Teléfono", Valor: safeText(customer.phone) },
      { Campo: "Email", Valor: safeText(customer.email) },
      { Campo: "Dirección", Valor: safeText(customer.address) },
      { Campo: "Método de pago", Valor: safeText(payment.method) },
      { Campo: "Referencia", Valor: safeText(payment.reference) },
      { Campo: "Subtotal", Valor: formatCurrency(subtotal) },
      { Campo: `IVA ${ivaPercent ? `(${ivaPercent}%)` : ""}`.trim(), Valor: formatCurrency(iva) },
      { Campo: "Total", Valor: formatCurrency(total) },
    ];

    const itemsRows =
      items.length > 0
        ? items.map((it) => {
            const qty = Number(it.quantity ?? 1);
            const unit = Number(it.unitPrice ?? it.rate ?? 0);
            const lineTotal = Number(it.total ?? qty * unit);

            return {
              Descripción: safeText(it.name),
              Cantidad: qty,
              "Precio unitario": unit,
              Total: lineTotal,
              Tipo: safeText(it.kind),
              "Descripción servicio": safeText(it.serviceDescription),
            };
          })
        : [{ Descripción: "No hay items registrados." }];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    const wsItems = XLSX.utils.json_to_sheet(itemsRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsItems, "Items");

    XLSX.writeFile(wb, `factura-${invoice.id}.xlsx`);
  };

  const handleDownloadChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setDownloadType("");

    try {
      if (value === "pdf") {
        await downloadAsPDF();
      } else if (value === "excel") {
        await downloadAsExcel();
      } else if (value === "image") {
        await downloadAsPNG();
      }
    } finally {
      e.target.value = "";
    }
  };

  const getRealVoucherUrl = () => {
    if (!invoice) return "";

    const raw =
      (invoice as any)?.effectiveVoucherUrl ||
      (invoice as any)?.voucherUrl ||
      (invoice as any)?.voucherAddress ||
      "";

    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw;
    }

    return raw.startsWith("/") ? raw : `/${raw}`;
  };

  const viewRealInvoice = () => {
    const url = getRealVoucherUrl();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
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

  const inv: any = invoice;
  const items: any[] = Array.isArray(inv.items) ? inv.items : [];
  const customer = inv.customer ?? {};
  const payment = inv.payment ?? {};

  const subtotal = Number(inv.amount ?? 0);
  const iva = Number(inv.iva ?? 0);
  const total = Number(inv.total ?? subtotal + iva);
  const ivaPercent = Number(inv.ivaPercent ?? 0);

  const numeroFactura = safeText(inv.numeroFactura);
  const numeroControl = safeText(inv.numeroControl);

  const hasVoucher = Boolean(getRealVoucherUrl());

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.shell}>
          <div className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <h1 className={styles.topTitle}>Vista de factura</h1>
              <p className={styles.topSubtitle}>
                {safeText(inv.type)} · {safeText(inv.docKind)} ·{" "}
                {formatDate(inv.date)}
              </p>
            </div>

            <div className={styles.actions}>
              <button className={styles.button} onClick={() => router.back()}>
                Volver
              </button>

              <button
                className={styles.primary}
                onClick={viewRealInvoice}
                disabled={!hasVoucher}
                title={
                  hasVoucher
                    ? "Abrir la factura real"
                    : "No hay imagen de factura disponible"
                }
              >
                Ver factura real
              </button>

              <select
                className={styles.button}
                value={downloadType}
                onChange={handleDownloadChange}
                aria-label="Descargar"
                title="Descargar"
              >
                <option value="">Descargar</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="image">Imagen</option>
              </select>

              <button
                className={styles.button}
                onClick={() => router.push(`/sales/voucher/edit/${inv.id}`)}
              >
                Editar
              </button>
            </div>
          </div>

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
                  <div className={styles.docTitle}>
                    {safeText(inv.docKind ?? "FACTURA")}
                  </div>
                  <div className={styles.docRow}>
                    <span className={styles.docLabel}>Nro / ID:</span>
                    <span className={styles.docValue}>{safeText(inv.id)}</span>
                  </div>
                  <div className={styles.docRow}>
                    <span className={styles.docLabel}>Nro Factura:</span>
                    <span className={styles.docValue}>{numeroFactura}</span>
                  </div>
                  <div className={styles.docRow}>
                    <span className={styles.docLabel}>Nro Control:</span>
                    <span className={styles.docValue}>{numeroControl}</span>
                  </div>
                  <div className={styles.docRow}>
                    <span className={styles.docLabel}>Fecha:</span>
                    <span className={styles.docValue}>
                      {formatDate(inv.date)}
                    </span>
                  </div>
                  <div className={styles.docRow}>
                    <span className={styles.docLabel}>Banco:</span>
                    <span className={styles.docValue}>{safeText(inv.bank)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.invoiceName}>
                {safeText(inv.invoiceName)}
              </div>

              <div className={styles.blocks}>
                <div className={styles.block}>
                  <div className={styles.blockTitle}>Cliente</div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Nombre:</span>
                    <span className={styles.v}>{safeText(customer.name)}</span>
                  </div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>RIF:</span>
                    <span className={styles.v}>{safeText(customer.rif)}</span>
                  </div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Teléfono:</span>
                    <span className={styles.v}>{safeText(customer.phone)}</span>
                  </div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Email:</span>
                    <span className={styles.v}>{safeText(customer.email)}</span>
                  </div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Dirección:</span>
                    <span className={styles.v}>{safeText(customer.address)}</span>
                  </div>
                </div>

                <div className={styles.block}>
                  <div className={styles.blockTitle}>Pago</div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Método:</span>
                    <span className={styles.v}>{safeText(payment.method)}</span>
                  </div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Referencia:</span>
                    <span className={styles.v}>
                      {safeText(payment.reference)}
                    </span>
                  </div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Tipo:</span>
                    <span className={styles.v}>{safeText(inv.type)}</span>
                  </div>
                  <div className={styles.blockLine}>
                    <span className={styles.k}>Documento:</span>
                    <span className={styles.v}>{safeText(inv.docKind)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.table}>
                <div className={styles.thead}>
                  <div className={styles.th}>Descripción</div>
                  <div className={styles.thCenter}>Cant.</div>
                  <div className={styles.thRight}>Precio Unit.</div>
                  <div className={styles.thRight}>Total</div>
                </div>

                {items.length === 0 ? (
                  <div className={styles.trow}>
                    <div className={styles.td} style={{ gridColumn: "1 / -1" }}>
                      No hay items registrados.
                    </div>
                  </div>
                ) : (
                  items.map((it) => {
                    const qty = Number(it.quantity ?? 1);
                    const unit = Number(it.unitPrice ?? it.rate ?? 0);
                    const lineTotal = Number(it.total ?? qty * unit);

                    return (
                      <div className={styles.trow} key={String(it.id ?? it.name)}>
                        <div className={styles.td}>
                          <div className={styles.itemName}>
                            {safeText(it.name)}
                          </div>
                          <div className={styles.itemMeta}>
                            {safeText(it.kind)}{" "}
                            {it.serviceDescription
                              ? `· ${it.serviceDescription}`
                              : ""}
                          </div>
                        </div>
                        <div className={styles.tdCenter}>{qty}</div>
                        <div className={styles.tdRight}>
                          {formatCurrency(unit)}
                        </div>
                        <div className={styles.tdRight}>
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className={styles.totals}>
                <div className={styles.totalsBox}>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Subtotal</span>
                    <span className={styles.totalValue}>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>
                      IVA {ivaPercent ? `(${ivaPercent}%)` : ""}
                    </span>
                    <span className={styles.totalValue}>
                      {formatCurrency(iva)}
                    </span>
                  </div>
                  <div className={styles.totalDivider} />
                  <div className={styles.totalRowBig}>
                    <span className={styles.totalLabelBig}>TOTAL</span>
                    <span className={styles.totalValueBig}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.footer}>
                <div className={styles.footerNote}>
                  Gracias por su compra. Este documento fue generado
                  electrónicamente.
                </div>
                <div className={styles.footerFine}>
                  Nro Factura: {numeroFactura} · Nro Control: {numeroControl} ·{" "}
                  ID: {safeText(inv.id)} · Fecha: {formatDate(inv.date)} · Banco:{" "}
                  {safeText(inv.bank)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.hint}>
            Tip: lo que se exporta a PDF/imagen es el bloque blanco (“paper”).
          </div>
        </div>
      </div>
    </div>
  );
}