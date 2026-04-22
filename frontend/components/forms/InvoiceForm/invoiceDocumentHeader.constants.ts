export const FOOTER_NOISE_RE =
  /(fecha de impresi[oó]n|imprenta|providencia|sin derecho a cr[eé]dito fiscal|factura del no|desde el no|hasta el no|del no|c[oó]pia - sin derecho|sin derecho|procesado)/i;

export const MONTH_MAP: Record<string, number> = {
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

export const SUPPORTED_IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"];
export const SUPPORTED_EXCEL_EXTS = ["xls", "xlsx"];