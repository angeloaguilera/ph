import { normalizeText } from "./invoiceDocumentHeader.parsers";

export async function readImageWithOcr(file: File) {
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
}

export async function readExcelFile(file: File) {
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

  const normalizedRows = rows.map((row) => row.map((cell) => String(cell ?? "").trim()));

  const text = normalizeText(normalizedRows.map((row) => row.filter(Boolean).join(" ")).join("\n"));

  return { text, rows: normalizedRows };
}

export async function readPdfFile(file: File, onProgress?: (value: number) => void) {
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
      onProgress?.(Math.round((pageNumber / maxPages) * 100));

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
}