"use client";

import { useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  formatCurrency,
  formatDate,
  getFacturaAnuladaInfo,
  safeText,
} from "../lib/voucher/voucher.utils";

export function useVoucherDownloads(
  invoiceRef: React.RefObject<HTMLDivElement | null>
) {
  const downloadAsPNG = useCallback(
    async (invoiceId: string | number) => {
      if (!invoiceRef.current) return;

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `factura-${invoiceId}.png`;
      a.click();
    },
    [invoiceRef]
  );

  const downloadAsPDF = useCallback(
    async (invoiceId: string | number) => {
      if (!invoiceRef.current) return;

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

      pdf.save(`factura-${invoiceId}.pdf`);
    },
    [invoiceRef]
  );

  const downloadAsExcel = useCallback(async (currentInvoice: any) => {
    if (!currentInvoice) return;

    const XLSX = await import("xlsx");

    const inv: any = currentInvoice;
    const items: any[] = Array.isArray(inv.items) ? inv.items : [];
    const customer = inv.customer ?? {};
    const payment = inv.payment ?? {};

    const subtotal = Number(inv.amount ?? 0);
    const iva = Number(inv.iva ?? 0);
    const total = Number(inv.total ?? subtotal + iva);
    const ivaPercent = Number(inv.ivaPercent ?? 0);
    const facturaAnuladaInfo = getFacturaAnuladaInfo(inv.facturaAnulada);

    const summaryRows = [
      { Campo: "ID", Valor: safeText(inv.id) },
      { Campo: "Tipo", Valor: safeText(inv.type) },
      { Campo: "Documento", Valor: safeText(inv.docKind) },
      { Campo: "Estado factura", Valor: facturaAnuladaInfo.label },
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
      {
        Campo: `IVA ${ivaPercent ? `(${ivaPercent}%)` : ""}`.trim(),
        Valor: formatCurrency(iva),
      },
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

    XLSX.writeFile(wb, `factura-${inv.id}.xlsx`);
  }, []);

  return {
    downloadAsPNG,
    downloadAsPDF,
    downloadAsExcel,
  };
}