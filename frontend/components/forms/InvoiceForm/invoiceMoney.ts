import type { CurrencyCode } from "./hooks/useExchangeRate";

export function currencyLabel(currency: CurrencyCode) {
  return currency === "USD" ? "Dólares (USD)" : "Bolívares (VES)";
}

export function currencySymbol(currency: CurrencyCode) {
  return currency === "USD" ? "$" : "Bs.";
}

export function formatMoney(value: number, currency: CurrencyCode) {
  const safeValue = Number.isFinite(value) ? value : 0;

  try {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "VES",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${currencySymbol(currency)} ${safeValue.toFixed(2)}`;
  }
}