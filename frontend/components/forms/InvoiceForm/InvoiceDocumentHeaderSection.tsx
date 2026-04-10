"use client";

import React, { useEffect, useState } from "react";

type Props = {
  docKind: string;
  setDocKind: (value: any) => void;

  invoiceType: string;
  onInvoiceTypeChange: (newType: any) => void;

  invoiceName: string;
  setInvoiceName: (value: string) => void;

  documentDateTime: string;
  setDocumentDateTime: (value: string) => void;

  numeroRecibo: string;
  setNumeroRecibo: (value: string) => void;

  numeroFactura: string;
  setNumeroFactura: (value: string) => void;

  numeroControl: string;
  setNumeroControl: (value: string) => void;

  destination: string;
  setDestination: (value: any) => void;

  bank: string;
  setBank: (value: string) => void;

  caja: string;
  setCaja: (value: string) => void;

  paymentType: string;
  setPaymentType: (value: any) => void;

  referenceNumber: string;
  setReferenceNumber: (value: string) => void;
};

type PreviewKind = "image" | "pdf" | "excel" | "none";

const FOOTER_NOISE_RE =
  /(fecha de impresi[oó]n|imprenta|providencia|sin derecho a cr[eé]dito fiscal|factura del no|desde el no|hasta el no|del no|c[oó]pia - sin derecho|sin derecho|procesado)/i;

function normalizeText(text: string) {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[‐-‒–—]/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanField(value: string) {
  return value
    .replace(/[“”"']/g, "")
    .replace(/[,:;|]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function zeroPad(n: number) {
  return String(n).padStart(2, "0");
}

function getLines(text: string) {
  return normalizeText(text)
    .split(/\r?\n/)
    .map((line) => cleanField(line.trim()))
    .filter(Boolean);
}

function isNoiseLine(line: string) {
  return FOOTER_NOISE_RE.test(line);
}

function extractNumericTokens(text: string) {
  return (text.match(/\d+(?:-\d+)?/g) || [])
    .map((x) => cleanField(x))
    .filter(Boolean);
}

function hasLetters(value: string) {
  return /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value);
}

function isMeaningfulBaseName(value: string) {
  const v = cleanField(value);
  if (!v) return false;
  if (/^\d+$/.test(v)) return false;
  return hasLetters(v);
}

function formatDocumentNumber(raw: string) {
  const v = cleanField(raw).replace(/\s+/g, "");
  if (!v) return "";

  if (/^\d{2}-\d{6}$/.test(v)) return v;

  const digits = v.replace(/\D/g, "");
  if (digits.length === 6) return `00-${digits}`;
  if (digits.length === 8 && digits.startsWith("00")) return `00-${digits.slice(2)}`;

  return v;
}

function parseDateTimeLocalFromText(text: string): string | null {
  const t = text.replace(/\s+/g, " ");

  let m = t.match(
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const hh = zeroPad(Number(m[4] || 0));
    const mm = zeroPad(Number(m[5] || 0));
    const ss = zeroPad(Number(m[6] || 0));
    return `${year}-${zeroPad(month)}-${zeroPad(day)}T${hh}:${mm}:${ss}`;
  }

  m = t.match(
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hh = zeroPad(Number(m[4] || 0));
    const mm = zeroPad(Number(m[5] || 0));
    const ss = zeroPad(Number(m[6] || 0));
    return `${year}-${zeroPad(month)}-${zeroPad(day)}T${hh}:${mm}:${ss}`;
  }

  m = t.match(
    /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const hh = zeroPad(Number(m[4] || 0));
    const mm = zeroPad(Number(m[5] || 0));
    const ss = zeroPad(Number(m[6] || 0));
    return `${year}-${zeroPad(month)}-${zeroPad(day)}T${hh}:${mm}:${ss}`;
  }

  const monthMap: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };

  m = t.match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i,
  );
  if (m) {
    const day = Number(m[1]);
    const month = monthMap[m[2].toLowerCase()];
    const year = Number(m[3]);
    const hh = zeroPad(Number(m[4] || 0));
    const mm = zeroPad(Number(m[5] || 0));
    const ss = zeroPad(Number(m[6] || 0));
    return `${year}-${zeroPad(month)}-${zeroPad(day)}T${hh}:${mm}:${ss}`;
  }

  return null;
}

function findFirstMatch(text: string, regexes: RegExp[]) {
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match?.[1]) return cleanField(match[1]);
  }
  return "";
}

function extractValueAfterKeyword(text: string, keywords: RegExp[]) {
  const lines = getLines(text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;

    if (keywords.some((k) => k.test(line))) {
      const cleaned = line
        .replace(/^(banco|entidad bancaria|entidad|destino|caja|cuenta)\s*[:\-]?\s*/i, "")
        .trim();

      if (cleaned && cleaned.length > 1) return cleanField(cleaned);

      if (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next && next.length > 1 && !isNoiseLine(next)) return cleanField(next);
      }
    }
  }

  return "";
}

function detectDocKind(text: string) {
  if (/\bn[oó]mina\b/i.test(text) || /\bnomina\b/i.test(text)) return "NOMINA";
  if (/\brecibo\b/i.test(text)) return "RECIBO";
  if (/\bfactura\b/i.test(text) || /\binvoice\b/i.test(text)) return "FACTURA";
  return "";
}

function detectInvoiceType(text: string) {
  if (/\bcompra\b/i.test(text)) return "COMPRA";
  if (/\bventa\b/i.test(text)) return "VENTA";
  return "";
}

function detectDestination(text: string) {
  if (
    /\bbanco\b/i.test(text) ||
    /\btransferencia\b/i.test(text) ||
    /\bdebit[oó]\b/i.test(text) ||
    /\bpago m[oó]vil\b/i.test(text) ||
    /\bpago movil\b/i.test(text)
  ) {
    return "BANCO";
  }

  if (/\bcaja\b/i.test(text) || /\befectivo\b/i.test(text)) return "CAJA";
  return "";
}

function detectPaymentType(text: string) {
  if (/\btarjeta de d[eé]bito\b/i.test(text) || /\bd[eé]bito\b/i.test(text))
    return "DEBITO";
  if (/\btransferencia\b/i.test(text)) return "TRANSFERENCIA";
  if (/\btarjeta de cr[eé]dito\b/i.test(text) || /\bcr[eé]dito\b/i.test(text))
    return "CREDITO";
  if (/\bpago m[oó]vil\b/i.test(text) || /\bpago movil\b/i.test(text))
    return "PAGOMOVIL";
  return "";
}

function extractUsefulTextFromLines(text: string) {
  return normalizeText(
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n"),
  );
}

function getHeaderLines(text: string) {
  return getLines(text).filter((line) => !isNoiseLine(line));
}

function detectDocumentDate(text: string) {
  const lines = getHeaderLines(text);

  const tryParse = (raw: string) => {
    const compact = normalizeText(raw).replace(/\n/g, " ");

    let m = compact.match(/\b(\d{2})[.\-/](\d{2})[.\-/](\d{4})\b/);
    if (m) {
      return `${m[3]}-${zeroPad(Number(m[2]))}-${zeroPad(Number(m[1]))}T00:00:00`;
    }

    m = compact.match(/\b(\d{4})[.\-/](\d{2})[.\-/](\d{2})\b/);
    if (m) {
      return `${m[1]}-${zeroPad(Number(m[2]))}-${zeroPad(Number(m[3]))}T00:00:00`;
    }

    m = compact.match(
      /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/i,
    );
    if (m) {
      const monthMap: Record<string, number> = {
        enero: 1,
        febrero: 2,
        marzo: 3,
        abril: 4,
        mayo: 5,
        junio: 6,
        julio: 7,
        agosto: 8,
        septiembre: 9,
        setiembre: 9,
        octubre: 10,
        noviembre: 11,
        diciembre: 12,
      };
      return `${m[3]}-${zeroPad(monthMap[m[2].toLowerCase()])}-${zeroPad(Number(m[1]))}T00:00:00`;
    }

    return null;
  };

  for (const line of lines) {
    if (/\bfecha\b/i.test(line) || /\bd[ií]a\b/i.test(line) || /\ba[ñn]o\b/i.test(line)) {
      const parsed = tryParse(line);
      if (parsed) return parsed;
    }
  }

  for (const line of lines) {
    const parsed = tryParse(line);
    if (parsed) return parsed;
  }

  const wholeText = lines.join(" ");
  const parsedWhole = tryParse(wholeText);
  if (parsedWhole) return parsedWhole;

  const direct = parseDateTimeLocalFromText(wholeText);
  if (direct) return direct;

  return null;
}

function detectHeaderNumbers(text: string) {
  const lines = getHeaderLines(text).slice(0, 20);

  let control = "";
  let invoice = "";

  const docNumsFromLine = (line: string) => {
    const nums = line.match(/\d[\d-]{3,}/g) || [];
    return nums.map((n) => formatDocumentNumber(n)).filter(Boolean);
  };

  const pairPatterns: RegExp[] = [
    /(?:factura|control)[^0-9]{0,20}([0-9][0-9\s-]{4,})\s+([0-9][0-9\s-]{4,})/i,
    /(?:n[°o]|no\.?|nro\.?)\s*de\s*control[^0-9]{0,20}([0-9][0-9\s-]{4,})\s+([0-9][0-9\s-]{4,})/i,
  ];

  for (const line of lines) {
    const compact = line.replace(/\s+/g, " ");

    for (const re of pairPatterns) {
      const m = compact.match(re);
      if (m) {
        if (!control) control = formatDocumentNumber(m[1]);
        if (!invoice) invoice = formatDocumentNumber(m[2]);
        break;
      }
    }

    if (control && invoice) break;
  }

  for (const line of lines) {
    const compact = line.replace(/\s+/g, " ");
    const nums = docNumsFromLine(compact);
    if (!nums.length) continue;

    if (/\bcontrol\b/i.test(compact)) {
      if (!control && nums[0]) control = nums[0];
      if (!invoice && nums[1]) invoice = nums[1];
      continue;
    }

    if (/\bfactura\b/i.test(compact)) {
      if (!invoice && nums[nums.length - 1]) invoice = nums[nums.length - 1];
      continue;
    }
  }

  if (!control || !invoice) {
    const allNums = Array.from(
      new Set(lines.flatMap((line) => docNumsFromLine(line))),
    );

    if (!control && allNums[0]) control = allNums[0];
    if (!invoice && allNums[1]) invoice = allNums[1];
  }

  return { control, invoice };
}

function detectInvoiceNumber(text: string) {
  return detectHeaderNumbers(text).invoice;
}

function detectControlNumber(text: string) {
  return detectHeaderNumbers(text).control;
}

function detectReceiptNumber(text: string) {
  const patterns = [
    /(?:n[úu]mero\s*de\s*recibo|n[úu]mero\s*recibo|recibo\s*n[úu]mero|nro\.?\s*recibo|no\.?\s*recibo)[\s:#\-]*([A-Z0-9\-\/._]+)/i,
    /\brecibo\b[\s:#\-]*([A-Z0-9\-\/._]{3,})/i,
  ];
  return findFirstMatch(text, patterns);
}

function detectReferenceNumber(text: string) {
  const patterns = [
    /(?:n[úu]mero\s*de\s*referencia|referencia|ref\.?)[\s:#\-]*([A-Z0-9\-\/._]+)/i,
  ];
  return findFirstMatch(text, patterns);
}

function ExcelPreviewTable({ rows }: { rows: string[][] }) {
  if (!rows.length) {
    return <div className="text-sm text-gray-500">No se pudo generar vista previa de Excel.</div>;
  }

  const headers = rows[0] || [];
  const body = rows.slice(1, 12);

  return (
    <div className="w-full max-w-full overflow-auto rounded-lg border bg-white">
      <table className="min-w-full border-collapse text-xs sm:text-sm">
        <thead className="sticky top-0 bg-gray-100">
          <tr>
            {headers.slice(0, 12).map((cell, idx) => (
              <th
                key={`h-${idx}`}
                className="whitespace-nowrap border-b border-r px-3 py-2 text-left font-semibold text-gray-700"
              >
                {cell || `Col ${idx + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rIdx) => (
            <tr key={`r-${rIdx}`} className="odd:bg-gray-50">
              {headers.slice(0, 12).map((_, cIdx) => (
                <td
                  key={`c-${rIdx}-${cIdx}`}
                  className="whitespace-nowrap border-b border-r px-3 py-2 text-gray-700"
                >
                  {row[cIdx] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilePreview({
  kind,
  url,
  excelRows,
}: {
  kind: PreviewKind;
  url: string;
  excelRows: string[][];
}) {
  if (!url || kind === "none") return null;

  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border bg-gray-50 p-3">
      <div className="mb-2 text-sm font-medium text-gray-700">Vista previa</div>

      {kind === "image" && (
        <div className="flex w-full justify-center overflow-hidden rounded-lg border bg-white">
          <img
            src={url}
            alt="Vista previa"
            className="block caja-primera h-auto w-[200px] max-h-[340px] object-contain"
          />
        </div>
      )}

      {kind === "pdf" && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <iframe
            src={url}
            title="Vista previa PDF"
            className="block h-[420px] w-full max-w-full"
          />
        </div>
      )}

      {kind === "excel" && <ExcelPreviewTable rows={excelRows} />}
    </div>
  );
}

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
}: Props) {
  const [isReading, setIsReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewKind, setPreviewKind] = useState<PreviewKind>("none");
  const [fileName, setFileName] = useState<string>("");
  const [excelRows, setExcelRows] = useState<string[][]>([]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applyDetectedValues = (rawText: string, sourceFileName?: string) => {
    const text = extractUsefulTextFromLines(rawText);

    const detectedDocKind = detectDocKind(text);
    if (detectedDocKind) setDocKind(detectedDocKind as any);

    const detectedInvoiceType = detectInvoiceType(text);
    if (detectedInvoiceType) onInvoiceTypeChange(detectedInvoiceType as any);

    const detectedDestination = detectDestination(text);
    if (detectedDestination) setDestination(detectedDestination as any);

    const detectedPaymentType = detectPaymentType(text);
    if (detectedPaymentType) setPaymentType(detectedPaymentType as any);

    const detectedDateTime = detectDocumentDate(text);
    if (detectedDateTime) setDocumentDateTime(detectedDateTime);

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
      findFirstMatch(text, [
        /(?:banco|entidad bancaria|entidad|cuenta)\s*[:\-]\s*([^\n\r]+)/i,
      ]);

    if (detectedBank) setBank(detectedBank);

    const detectedCaja =
      extractValueAfterKeyword(text, [/\bcaja\b/i]) ||
      findFirstMatch(text, [/(?:caja)\s*[:\-]\s*([^\n\r]+)/i]);

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

  const readImageWithOcr = async (file: File) => {
    const { createWorker } = await import("tesseract.js");
    let worker: any = null;

    try {
      worker = await createWorker("spa");
      const result = await worker.recognize(file);
      return result?.data?.text || "";
    } catch {
      try {
        if (worker) await worker.terminate();
      } catch {}
      worker = await createWorker("eng");
      const result = await worker.recognize(file);
      return result?.data?.text || "";
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {}
      }
    }
  };

  const readExcelFile = async (file: File) => {
    const xlsx = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "array", cellDates: true });

    const firstSheetName = workbook.SheetNames?.[0];
    if (!firstSheetName) return { text: "", rows: [] as string[][] };

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as any[][];

    const normalizedRows = rows.map((row) =>
      row.map((cell) => String(cell ?? "").trim()),
    );

    const text = normalizeText(
      normalizedRows
        .map((row) => row.filter(Boolean).join(" "))
        .join("\n"),
    );

    return { text, rows: normalizedRows };
  };

  const readPdfFile = async (file: File) => {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();
    }

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;

    let extractedText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = (content.items as any[])
        .map((item) => (typeof item?.str === "string" ? item.str : ""))
        .join(" ");

      extractedText += `\n${pageText}`;
    }

    extractedText = normalizeText(extractedText);

    if (extractedText.length > 40) return extractedText;

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("spa");

    try {
      let ocrText = "";
      const maxPages = Math.min(pdf.numPages, 5);

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
        setProgress(Math.round((pageNumber / maxPages) * 100));

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        await page
          .render({
            canvas: canvas as HTMLCanvasElement,
            canvasContext: context as any,
            viewport,
          } as any)
          .promise;

        const result = await worker.recognize(canvas);
        ocrText += `\n${result?.data?.text || ""}`;
      }

      return normalizeText(ocrText);
    } finally {
      await worker.terminate();
    }
  };

  const handleFile = async (file: File) => {
    setIsReading(true);
    setProgress(0);
    setExcelRows([]);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let text = "";

      if (
        file.type.startsWith("image/") ||
        ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"].includes(ext)
      ) {
        text = await readImageWithOcr(file);
      } else if (file.type === "application/pdf" || ext === "pdf") {
        text = await readPdfFile(file);
      } else if (
        file.type.includes("sheet") ||
        file.type.includes("excel") ||
        ["xls", "xlsx"].includes(ext)
      ) {
        const excel = await readExcelFile(file);
        text = excel.text;
        setExcelRows(excel.rows);
      } else {
        alert("Formato no soportado. Usa imagen, PDF, XLS o XLSX.");
        return;
      }

      applyDetectedValues(text, file.name);
    } catch (error) {
      console.error(error);
      alert(
        "No se pudo leer el archivo. Prueba con una imagen más nítida o un PDF con mejor calidad.",
      );
    } finally {
      setIsReading(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-full space-y-4 overflow-hidden rounded-xl border p-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Cargar imagen, PDF o Excel
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
            if (
              file.type.startsWith("image/") ||
              ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"].includes(ext)
            ) {
              setPreviewKind("image");
            } else if (file.type === "application/pdf" || ext === "pdf") {
              setPreviewKind("pdf");
            } else if (
              file.type.includes("sheet") ||
              file.type.includes("excel") ||
              ["xls", "xlsx"].includes(ext)
            ) {
              setPreviewKind("excel");
            } else {
              setPreviewKind("none");
            }

            await handleFile(file);
            e.target.value = "";
          }}
        />

        {fileName && (
          <div className="break-words text-sm text-gray-600">
            Archivo: {fileName}
          </div>
        )}

        <div className="w-full max-w-full overflow-hidden">
          <FilePreview kind={previewKind} url={previewUrl} excelRows={excelRows} />
        </div>

        {isReading && (
          <div className="text-sm text-gray-600">Leyendo archivo... {progress}%</div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Comprobante</label>
          <select
            value={docKind}
            onChange={(e) => setDocKind(e.target.value as any)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="FACTURA">Factura</option>
            <option value="RECIBO">Recibo</option>
            <option value="NOMINA">Nómina</option>
          </select>
        </div>

        {docKind !== "NOMINA" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo</label>
            <select
              value={invoiceType}
              onChange={(e) => onInvoiceTypeChange(e.target.value as any)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="VENTA">Venta</option>
              <option value="COMPRA">Compra</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {docKind === "FACTURA"
            ? "Nombre de la factura"
            : docKind === "NOMINA"
              ? "Nombre del recibo nómina"
              : "Nombre del recibo"}
        </label>
        <input
          className="w-full rounded-md border px-3 py-2"
          value={invoiceName}
          onChange={(e) => setInvoiceName(e.target.value)}
          placeholder={
            docKind === "FACTURA"
              ? "Ej. Factura 26-12-2025"
              : "Ej. Recibo 26-12-2025"
          }
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Fecha y hora (con segundos)
        </label>
        <input
          type="datetime-local"
          step={1}
          className="w-full rounded-md border px-3 py-2"
          value={documentDateTime}
          onChange={(e) => setDocumentDateTime(e.target.value)}
          name="documentDateTime"
        />
      </div>

      <input type="hidden" name="documentDateTime" value={documentDateTime} />

      {docKind === "RECIBO" && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Número de recibo
          </label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={numeroRecibo}
            onChange={(e) => setNumeroRecibo(e.target.value)}
            placeholder="Ej. R-00001234"
          />
        </div>
      )}

      {docKind === "FACTURA" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Número de la factura
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="Ej. 00-006400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Número de control
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={numeroControl}
              onChange={(e) => setNumeroControl(e.target.value)}
              placeholder="Ej. 00-006300"
            />
          </div>
        </div>
      )}

      {docKind !== "NOMINA" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Destino</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={destination}
            onChange={(e) => setDestination(e.target.value as any)}
          >
            <option value="BANCO">Banco</option>
            <option value="CAJA">Caja</option>
          </select>
        </div>
      )}

      {docKind !== "NOMINA" && destination === "BANCO" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">Banco</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Tipo de pago
            </label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as any)}
            >
              <option value="">-- Selecciona --</option>
              <option value="DEBITO">Débito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CREDITO">Crédito</option>
              <option value="PAGOMOVIL">Pago móvil</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Número de referencia
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Ej. 1234567890"
            />
          </div>
        </>
      )}

      {docKind !== "NOMINA" && destination === "CAJA" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Caja</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={caja}
            onChange={(e) => setCaja(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}