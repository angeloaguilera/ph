"use client";

export type ExportInvoice = {
  id: string | number;
  type?: string | null;
  invoiceName?: string | null;
  description?: string | null;
  date?: string | null;
  bank?: string | null;
  total?: number | string | null;
  amount?: number | string | null;
  iva?: number | string | null;
};

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function formatMoney(value: unknown) {
  return moneyFormatter.format(Number(value ?? 0));
}

export function formatDate(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildExcelHtml(invoices: ExportInvoice[]) {
  const rows = invoices
    .map(
      (inv) => `
      <tr>
        <td>${escapeHtml(inv.type ?? "—")}</td>
        <td>${escapeHtml(inv.invoiceName || "Sin nombre")}</td>
        <td>${escapeHtml(formatDate(inv.date))}</td>
        <td>${escapeHtml(inv.bank || "—")}</td>
        <td style="text-align:right;">${escapeHtml(formatMoney(inv.total ?? 0))}</td>
        <td style="text-align:right;">${escapeHtml(formatMoney(inv.amount ?? 0))}</td>
        <td style="text-align:right;">${escapeHtml(formatMoney(inv.iva ?? 0))}</td>
        <td>${escapeHtml(inv.description || "—")}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    p { margin: 0 0 18px; color: #4b5563; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
  </style>
</head>
<body>
  <h1>Exportación de comprobantes</h1>
  <p>Total de registros: ${invoices.length}</p>
  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Nombre</th>
        <th>Fecha</th>
        <th>Banco</th>
        <th>Total</th>
        <th>Monto</th>
        <th>IVA</th>
        <th>Descripción</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

export function exportAllToExcel(invoices: ExportInvoice[]) {
  const html = buildExcelHtml(invoices);
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  downloadBlob(`comprobantes_${Date.now()}.xls`, blob);
}

export function exportAllToPdf(invoices: ExportInvoice[]) {
  const win = window.open("", "_blank", "width=1200,height=800");
  if (!win) {
    alert("Activa las ventanas emergentes para exportar a PDF.");
    return;
  }

  const rows = invoices
    .map(
      (inv) => `
      <tr>
        <td>${escapeHtml(inv.type ?? "—")}</td>
        <td>${escapeHtml(inv.invoiceName || "Sin nombre")}</td>
        <td>${escapeHtml(formatDate(inv.date))}</td>
        <td>${escapeHtml(inv.bank || "—")}</td>
        <td>${escapeHtml(formatMoney(inv.total ?? 0))}</td>
        <td>${escapeHtml(formatMoney(inv.amount ?? 0))}</td>
        <td>${escapeHtml(formatMoney(inv.iva ?? 0))}</td>
      </tr>`
    )
    .join("");

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Comprobantes</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    p { margin: 0 0 18px; color: #4b5563; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 11px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
  </style>
</head>
<body>
  <h1>Exportación de comprobantes</h1>
  <p>Total de registros: ${invoices.length}</p>
  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Nombre</th>
        <th>Fecha</th>
        <th>Banco</th>
        <th>Total</th>
        <th>Monto</th>
        <th>IVA</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`);
  win.document.close();
  win.focus();

  setTimeout(() => {
    win.print();
  }, 500);
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let result = text;
  while (result.length > 0 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export async function exportAllToImage(invoices: ExportInvoice[]) {
  const rowHeight = 42;
  const headerHeight = 150;
  const padding = 28;
  const width = 1800;
  const height = headerHeight + (invoices.length + 1) * rowHeight + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 28px Arial";
  ctx.fillText("Exportación de comprobantes", padding, 48);

  ctx.fillStyle = "#4b5563";
  ctx.font = "16px Arial";
  ctx.fillText(`Total de registros: ${invoices.length}`, padding, 78);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 14px Arial";

  const columns = [
    { label: "Tipo", x: padding, w: 120 },
    { label: "Nombre", x: 150, w: 300 },
    { label: "Fecha", x: 470, w: 150 },
    { label: "Banco", x: 640, w: 220 },
    { label: "Total", x: 880, w: 150 },
    { label: "Monto", x: 1050, w: 150 },
    { label: "IVA", x: 1220, w: 150 },
    { label: "Descripción", x: 1390, w: 380 },
  ];

  const tableTop = 110;
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(padding, tableTop, width - padding * 2, rowHeight);

  ctx.fillStyle = "#111827";
  columns.forEach((col) => {
    ctx.fillText(col.label, col.x + 8, tableTop + 26);
  });

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;

  let y = tableTop + rowHeight;

  invoices.forEach((inv, index) => {
    const isAlt = index % 2 === 1;
    ctx.fillStyle = isAlt ? "#fafafa" : "#ffffff";
    ctx.fillRect(padding, y, width - padding * 2, rowHeight);

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = "13px Arial";

    const values = [
      { text: String(inv.type ?? "—"), x: columns[0].x + 8, w: columns[0].w },
      { text: String(inv.invoiceName || "Sin nombre"), x: columns[1].x + 8, w: columns[1].w },
      { text: formatDate(inv.date), x: columns[2].x + 8, w: columns[2].w },
      { text: String(inv.bank || "—"), x: columns[3].x + 8, w: columns[3].w },
      { text: formatMoney(inv.total ?? 0), x: columns[4].x + 8, w: columns[4].w },
      { text: formatMoney(inv.amount ?? 0), x: columns[5].x + 8, w: columns[5].w },
      { text: formatMoney(inv.iva ?? 0), x: columns[6].x + 8, w: columns[6].w },
      { text: String(inv.description || "—"), x: columns[7].x + 8, w: columns[7].w },
    ];

    values.forEach((col) => {
      const txt = truncateText(ctx, col.text, col.w - 16);
      ctx.fillText(txt, col.x, y + 26);
    });

    y += rowHeight;
  });

  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  if (blob) {
    downloadBlob(`comprobantes_${Date.now()}.png`, blob);
  }
}