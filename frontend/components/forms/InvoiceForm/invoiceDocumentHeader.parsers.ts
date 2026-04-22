import { FOOTER_NOISE_RE, MONTH_MAP } from "./invoiceDocumentHeader.constants";

export function normalizeText(text: string) {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[‐-‒–—]/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanField(value: string) {
  return value
    .replace(/[“”"']/g, "")
    .replace(/[,:;|]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function zeroPad(n: number) {
  return String(n).padStart(2, "0");
}

export function getLines(text: string) {
  return normalizeText(text)
    .split(/\r?\n/)
    .map((line) => cleanField(line.trim()))
    .filter(Boolean);
}

export function isNoiseLine(line: string) {
  return FOOTER_NOISE_RE.test(line);
}

export function hasLetters(value: string) {
  return /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value);
}

export function isMeaningfulBaseName(value: string) {
  const v = cleanField(value);
  if (!v) return false;
  if (/^\d+$/.test(v)) return false;
  return hasLetters(v);
}

export function formatDocumentNumber(raw: string) {
  const v = cleanField(raw).replace(/\s+/g, "");
  if (!v) return "";

  if (/^\d{2}-\d{6}$/.test(v)) return v;

  const digits = v.replace(/\D/g, "");
  if (digits.length === 6) return `00-${digits}`;
  if (digits.length === 8 && digits.startsWith("00")) return `00-${digits.slice(2)}`;

  return v;
}

export function parseDateTimeLocalFromText(text: string): string | null {
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

  m = t.match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i,
  );
  if (m) {
    const day = Number(m[1]);
    const month = MONTH_MAP[m[2].toLowerCase()];
    const year = Number(m[3]);
    const hh = zeroPad(Number(m[4] || 0));
    const mm = zeroPad(Number(m[5] || 0));
    const ss = zeroPad(Number(m[6] || 0));
    return `${year}-${zeroPad(month)}-${zeroPad(day)}T${hh}:${mm}:${ss}`;
  }

  return null;
}

export function findFirstMatch(text: string, regexes: RegExp[]) {
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match?.[1]) return cleanField(match[1]);
  }
  return "";
}

export function extractValueAfterKeyword(text: string, keywords: RegExp[]) {
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

export function detectDocKind(text: string) {
  if (/\bn[oó]mina\b/i.test(text) || /\bnomina\b/i.test(text)) return "NOMINA";
  if (/\brecibo\b/i.test(text)) return "RECIBO";
  if (/\bfactura\b/i.test(text) || /\binvoice\b/i.test(text)) return "FACTURA";
  return "";
}

export function detectInvoiceType(text: string) {
  if (/\bcompra\b/i.test(text)) return "COMPRA";
  if (/\bventa\b/i.test(text)) return "VENTA";
  return "";
}

export function detectDestination(text: string) {
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

export function detectPaymentType(text: string) {
  if (/\btarjeta de d[eé]bito\b/i.test(text) || /\bd[eé]bito\b/i.test(text)) return "DEBITO";
  if (/\btransferencia\b/i.test(text)) return "TRANSFERENCIA";
  if (/\btarjeta de cr[eé]dito\b/i.test(text) || /\bcr[eé]dito\b/i.test(text)) return "CREDITO";
  if (/\bpago m[oó]vil\b/i.test(text) || /\bpago movil\b/i.test(text)) return "PAGOMOVIL";
  return "";
}

export function extractUsefulTextFromLines(text: string) {
  return normalizeText(
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n"),
  );
}

export function getHeaderLines(text: string) {
  return getLines(text).filter((line) => !isNoiseLine(line));
}

export function detectDocumentDate(text: string) {
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
      return `${m[3]}-${zeroPad(MONTH_MAP[m[2].toLowerCase()])}-${zeroPad(Number(m[1]))}T00:00:00`;
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

export function detectHeaderNumbers(text: string) {
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
    const allNums = Array.from(new Set(lines.flatMap((line) => docNumsFromLine(line))));

    if (!control && allNums[0]) control = allNums[0];
    if (!invoice && allNums[1]) invoice = allNums[1];
  }

  return { control, invoice };
}

export function detectInvoiceNumber(text: string) {
  return detectHeaderNumbers(text).invoice;
}

export function detectControlNumber(text: string) {
  return detectHeaderNumbers(text).control;
}

export function detectReceiptNumber(text: string) {
  const patterns = [
    /(?:n[úu]mero\s*de\s*recibo|n[úu]mero\s*recibo|recibo\s*n[úu]mero|nro\.?\s*recibo|no\.?\s*recibo)[\s:#\-]*([A-Z0-9\-\/._]+)/i,
    /\brecibo\b[\s:#\-]*([A-Z0-9\-\/._]{3,})/i,
  ];
  return findFirstMatch(text, patterns);
}

export function detectReferenceNumber(text: string) {
  const patterns = [/(?:n[úu]mero\s*de\s*referencia|referencia|ref\.?)[\s:#\-]*([A-Z0-9\-\/._]+)/i];
  return findFirstMatch(text, patterns);
}