import React from "react";
import { PreviewKind } from "./invoiceDocumentHeader.types";

export function ExcelPreviewTable({ rows }: { rows: string[][] }) {
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

export function FilePreview({
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
    <div className="preview-wrapper">
      <div className="preview-title">Vista previa</div>

      {kind === "image" && (
        <div className="preview-image-box">
          <img src={url} alt="Vista previa" className="preview-image" />
        </div>
      )}

      {kind === "pdf" && (
        <div className="preview-pdf-box">
          <iframe src={url} title="Vista previa PDF" className="preview-pdf" />
        </div>
      )}

      {kind === "excel" && <ExcelPreviewTable rows={excelRows} />}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

export function selectClass(disabled: boolean) {
  return `w-full rounded-md border px-3 py-2 outline-none transition ${
    disabled ? "cursor-not-allowed bg-gray-100 opacity-70" : "bg-white"
  }`;
}

export function inputClass(disabled: boolean) {
  return `w-full rounded-md border px-3 py-2 outline-none transition ${
    disabled ? "cursor-not-allowed bg-gray-100 opacity-70" : "bg-white"
  }`;
}