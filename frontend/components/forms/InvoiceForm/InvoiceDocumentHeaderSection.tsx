"use client";

import React, { useEffect, useState } from "react";
import "./InvoiceDocumentHeaderSection.css";

import { FilePreview, Field, inputClass, selectClass } from "./invoiceDocumentHeader.components";
import {
  detectControlNumber,
  detectDestination,
  detectDocKind,
  detectDocumentDate,
  detectInvoiceNumber,
  detectInvoiceType,
  detectPaymentType,
  detectReceiptNumber,
  detectReferenceNumber,
  extractUsefulTextFromLines,
  extractValueAfterKeyword,
  isMeaningfulBaseName,
} from "./invoiceDocumentHeader.parsers";
import {
  readExcelFile,
  readImageWithOcr,
  readPdfFile,
} from "./invoiceDocumentHeader.readers";
import {
  InvoiceDocumentHeaderSectionProps,
  PreviewKind,
} from "./invoiceDocumentHeader.types";
import {
  SUPPORTED_EXCEL_EXTS,
  SUPPORTED_IMAGE_EXTS,
} from "./invoiceDocumentHeader.constants";

type DocKind = InvoiceDocumentHeaderSectionProps["docKind"];
type InvoiceType = InvoiceDocumentHeaderSectionProps["invoiceType"];
type Destination = InvoiceDocumentHeaderSectionProps["destination"];
type PaymentType = InvoiceDocumentHeaderSectionProps["paymentType"];

export default function InvoiceDocumentHeaderSection({
  docKind,
  setDocKind,
  invoiceType,
  onInvoiceTypeChange,
  invoiceName,
  setInvoiceName,
  documentDateTime,
  setDocumentDateTime,
  numeroRecibo,
  setNumeroRecibo,
  numeroFactura,
  setNumeroFactura,
  numeroControl,
  setNumeroControl,
  destination,
  setDestination,
  bank,
  setBank,
  caja,
  setCaja,
  paymentType,
  setPaymentType,
  referenceNumber,
  setReferenceNumber,
  voucherUrl,
  setVoucherUrl,
}: InvoiceDocumentHeaderSectionProps) {
  const [isReading, setIsReading] = useState(false);
  const [isUploadingVoucher, setIsUploadingVoucher] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewKind, setPreviewKind] = useState<PreviewKind>("none");
  const [fileName, setFileName] = useState<string>("");
  const [excelRows, setExcelRows] = useState<string[][]>([]);
  const [localVoucherUrl, setLocalVoucherUrl] = useState<string>("");
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);

  const effectiveVoucherUrl = voucherUrl ?? localVoucherUrl;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setVoucherPath = (url: string) => {
    setLocalVoucherUrl(url);
    setVoucherUrl?.(url);
  };

  const handleDateChange = (value: string) => {
    setHasUserSelectedDate(true);
    setDocumentDateTime(value);
  };

  const uploadVoucher = async (file: File) => {
    setIsUploadingVoucher(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vouchers", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo guardar el comprobante");
      }

      const data = await res.json();
      const url = String(data?.url || "");
      if (url) setVoucherPath(url);

      return url;
    } finally {
      setIsUploadingVoucher(false);
    }
  };

  const applyDetectedValues = (rawText: string, sourceFileName?: string) => {
    const text = extractUsefulTextFromLines(rawText);

    const detectedDocKind = detectDocKind(text);
    if (detectedDocKind) setDocKind(detectedDocKind as DocKind);

    const detectedInvoiceType = detectInvoiceType(text);
    if (detectedInvoiceType) onInvoiceTypeChange(detectedInvoiceType as InvoiceType);

    const detectedDestination = detectDestination(text);
    if (detectedDestination) setDestination(detectedDestination as Destination);

    const detectedPaymentType = detectPaymentType(text);
    if (detectedPaymentType) setPaymentType(detectedPaymentType as PaymentType);

    const detectedDateTime = detectDocumentDate(text);
    if (detectedDateTime && !hasUserSelectedDate && !documentDateTime) {
      setDocumentDateTime(detectedDateTime);
    }

    const detectedNumeroFactura = detectInvoiceNumber(text);
    if (detectedNumeroFactura) setNumeroFactura(detectedNumeroFactura);

    const detectedNumeroControl = detectControlNumber(text);
    if (detectedNumeroControl) setNumeroControl(detectedNumeroControl);

    const detectedNumeroRecibo = detectReceiptNumber(text);
    if (detectedNumeroRecibo) setNumeroRecibo(detectedNumeroRecibo);

    const detectedReference = detectReferenceNumber(text);
    if (detectedReference) setReferenceNumber(detectedReference);

    const detectedBank =
      extractValueAfterKeyword(text, [
        /\bbanco\b/i,
        /\bbanco de\b/i,
        /\bentidad bancaria\b/i,
        /\bentidad\b/i,
        /\bcuenta\b/i,
      ]) ||
      text.match(/(?:banco|entidad bancaria|entidad|cuenta)\s*[:\-]\s*([^\n\r]+)/i)?.[1] ||
      "";

    if (detectedBank) setBank(detectedBank);

    const detectedCaja =
      extractValueAfterKeyword(text, [/\bcaja\b/i]) ||
      text.match(/(?:caja)\s*[:\-]\s*([^\n\r]+)/i)?.[1] ||
      "";

    if (detectedCaja) setCaja(detectedCaja);

    if (!invoiceName?.trim()) {
      const fileBase = sourceFileName?.replace(/\.[^.]+$/, "")?.trim() || "";
      const base =
        isMeaningfulBaseName(fileBase) ? fileBase : detectedDocKind || docKind || "FACTURA";

      const dt = detectedDateTime || documentDateTime;
      const datePart = dt ? dt.split("T")[0].split("-").reverse().join("-") : "";

      const docNum = detectedNumeroFactura ? ` ${detectedNumeroFactura}` : "";
      setInvoiceName(datePart ? `${base}${docNum} ${datePart}`.trim() : `${base}${docNum}`.trim());
    }
  };

  const handleFile = async (file: File) => {
    setIsReading(true);
    setProgress(0);
    setExcelRows([]);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let text = "";

      if (file.type.startsWith("image/") || SUPPORTED_IMAGE_EXTS.includes(ext)) {
        text = await readImageWithOcr(file);
      } else if (file.type === "application/pdf" || ext === "pdf") {
        text = await readPdfFile(file, setProgress);
      } else if (
        file.type.includes("sheet") ||
        file.type.includes("excel") ||
        SUPPORTED_EXCEL_EXTS.includes(ext)
      ) {
        const excel = await readExcelFile(file);
        text = excel.text;
        setExcelRows(excel.rows);
      } else {
        alert("Formato no soportado. Usa imagen, PDF o Excel.");
        return;
      }

      applyDetectedValues(text, file.name);
    } catch (error) {
      console.error(error);
      alert("No se pudo leer el archivo. Prueba con una imagen más nítida o un PDF con mejor calidad.");
    } finally {
      setIsReading(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border bg-white p-4">
      <div className="space-y-4">
        <div className="section-card">
          <h3 className="section-title">Cargar comprobante</h3>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cargar comprobante, imagen, PDF o Excel
              </label>

              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,.pdf,.xls,.xlsx"
                multiple={false}
                className="block w-full max-w-full rounded-md border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (previewUrl) URL.revokeObjectURL(previewUrl);

                  const url = URL.createObjectURL(file);
                  setPreviewUrl(url);
                  setFileName(file.name);

                  const ext = file.name.split(".").pop()?.toLowerCase() || "";
                  if (file.type.startsWith("image/") || SUPPORTED_IMAGE_EXTS.includes(ext)) {
                    setPreviewKind("image");
                  } else if (file.type === "application/pdf" || ext === "pdf") {
                    setPreviewKind("pdf");
                  } else if (
                    file.type.includes("sheet") ||
                    file.type.includes("excel") ||
                    SUPPORTED_EXCEL_EXTS.includes(ext)
                  ) {
                    setPreviewKind("excel");
                  } else {
                    setPreviewKind("none");
                  }

                  try {
                    await uploadVoucher(file);
                    await handleFile(file);
                  } catch (error) {
                    console.error(error);
                    alert("No se pudo guardar el comprobante en /public/vouchers.");
                  } finally {
                    e.target.value = "";
                  }
                }}
              />

              {fileName && (
                <div className="mt-2 break-words text-sm text-gray-600">Archivo: {fileName}</div>
              )}

              {effectiveVoucherUrl && (
                <div className="mt-1 break-words text-xs text-green-700">
                  Comprobante guardado: {effectiveVoucherUrl}
                </div>
              )}

              <input type="hidden" name="voucherUrl" value={effectiveVoucherUrl} />
            </div>

            <div className="xl:col-span-2">
              <FilePreview kind={previewKind} url={previewUrl} excelRows={excelRows} />
            </div>

            {(isReading || isUploadingVoucher) && (
              <div className="xl:col-span-2 text-sm text-gray-600">
                {isUploadingVoucher ? "Guardando comprobante..." : `Leyendo archivo... ${progress}%`}
              </div>
            )}
          </div>
        </div>

        <div className="section-card">
          <h3 className="section-title">Datos principales</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Comprobante">
              <select
                value={docKind}
                onChange={(e) => setDocKind(e.target.value as DocKind)}
                className={selectClass(false)}
              >
                <option value="FACTURA">Factura</option>
                <option value="RECIBO">Recibo</option>
                <option value="NOMINA">Nómina</option>
              </select>
            </Field>

            {docKind !== "NOMINA" && (
              <Field label="Tipo">
                <select
                  value={invoiceType}
                  onChange={(e) => onInvoiceTypeChange(e.target.value as InvoiceType)}
                  className={selectClass(false)}
                >
                  <option value="VENTA">Venta</option>
                  <option value="COMPRA">Compra</option>
                </select>
              </Field>
            )}

            <Field
              label={
                docKind === "FACTURA"
                  ? "Nombre de la factura"
                  : docKind === "NOMINA"
                    ? "Nombre del recibo nómina"
                    : "Nombre del recibo"
              }
              className="md:col-span-2 xl:col-span-3"
            >
              <input
                className={inputClass(false)}
                value={invoiceName}
                onChange={(e) => setInvoiceName(e.target.value)}
                placeholder={docKind === "FACTURA" ? "Ej. Factura 26-12-2025" : "Ej. Recibo 26-12-2025"}
              />
            </Field>

            <Field label="Fecha y hora (con segundos)">
              <input
                type="datetime-local"
                step={1}
                className={inputClass(false)}
                value={documentDateTime}
                onChange={(e) => handleDateChange(e.target.value)}
                name="documentDateTime"
              />
            </Field>
          </div>

          <input type="hidden" name="documentDateTime" value={documentDateTime} />
        </div>

        {docKind === "RECIBO" && (
          <div className="section-card">
            <h3 className="section-title">Datos del recibo</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Número de recibo" className="md:col-span-2">
                <input
                  className={inputClass(false)}
                  value={numeroRecibo}
                  onChange={(e) => setNumeroRecibo(e.target.value)}
                  placeholder="Ej. R-00001234"
                />
              </Field>
            </div>
          </div>
        )}

        {docKind === "FACTURA" && (
          <div className="section-card">
            <h3 className="section-title">Datos de la factura</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Número de la factura">
                <input
                  className={inputClass(false)}
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="Ej. 00-006400"
                />
              </Field>

              <Field label="Número de control">
                <input
                  className={inputClass(false)}
                  value={numeroControl}
                  onChange={(e) => setNumeroControl(e.target.value)}
                  placeholder="Ej. 00-006300"
                />
              </Field>
            </div>
          </div>
        )}

        {docKind !== "NOMINA" && (
          <div className="section-card">
            <h3 className="section-title">Destino y forma de pago</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Destino">
                <select
                  className={selectClass(false)}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value as Destination)}
                >
                  <option value="BANCO">Banco</option>
                  <option value="CAJA">Caja</option>
                </select>
              </Field>

              {destination === "BANCO" && (
                <>
                  <Field label="Banco">
                    <input
                      className={inputClass(false)}
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                    />
                  </Field>

                  <Field label="Tipo de pago">
                    <select
                      className={selectClass(false)}
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    >
                      <option value="">-- Selecciona --</option>
                      <option value="DEBITO">Débito</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="CREDITO">Crédito</option>
                      <option value="PAGOMOVIL">Pago móvil</option>
                    </select>
                  </Field>

                  <Field label="Número de referencia" className="md:col-span-2 xl:col-span-3">
                    <input
                      className={inputClass(false)}
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Ej. 1234567890"
                    />
                  </Field>
                </>
              )}

              {destination === "CAJA" && (
                <Field label="Caja" className="md:col-span-2 xl:col-span-2">
                  <input
                    className={inputClass(false)}
                    value={caja}
                    onChange={(e) => setCaja(e.target.value)}
                  />
                </Field>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}