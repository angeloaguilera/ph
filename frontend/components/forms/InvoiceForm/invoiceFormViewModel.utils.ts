import type { CurrencyCode } from "./hooks/useExchangeRate";
import { getLineTotalValue, toDateTimeLocalValue, toNumber } from "./invoiceHelpers";

export function getInitialVoucherAddress(initialValues: any): string {
  return String(
    initialValues?.voucherAddress ??
      initialValues?.voucherUrl ??
      initialValues?.voucherURL ??
      initialValues?.voucherDireccion ??
      initialValues?.storage?.fileUrl ??
      initialValues?.storage?.publicUrl ??
      initialValues?.storage?.url ??
      initialValues?.comprobanteUrl ??
      initialValues?.comprobanteURL ??
      ""
  ).trim();
}

export function getInitialDocumentDateTime(initialValues: any): string {
  return toDateTimeLocalValue(
    initialValues?.documentDateTime ??
      initialValues?.fechaHora ??
      initialValues?.dateTime ??
      initialValues?.createdAt ??
      new Date()
  );
}

export function getPartyDisplayName(record: unknown): string {
  const r = record as {
    name?: unknown;
    businessName?: unknown;
    fullName?: unknown;
    displayName?: unknown;
    razonSocial?: unknown;
    companyName?: unknown;
  };

  return String(
    r?.name ??
      r?.businessName ??
      r?.fullName ??
      r?.displayName ??
      r?.razonSocial ??
      r?.companyName ??
      ""
  );
}

export function buildCustomerRecord(
  selectedPartyRecord: any,
  partyInfo: any,
  partyKey: string
) {
  return {
    ...(selectedPartyRecord ?? {}),
    ...(partyInfo ?? {}),
    companyId:
      partyKey ||
      selectedPartyRecord?.companyId ||
      partyInfo?.companyId ||
      "",
    name:
      getPartyDisplayName(selectedPartyRecord) ||
      getPartyDisplayName(partyInfo) ||
      "",
  };
}

export function buildItemsSubtotal(items: any[]): number {
  return items.reduce((sum: number, it: any) => {
    const n = getLineTotalValue(it);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function buildInvoiceTotals(args: {
  baseAmount: number;
  ivaPercent: number;
  ivaRetenidoPercent: number;
  islrPercent: number;
}) {
  const { baseAmount, ivaPercent, ivaRetenidoPercent, islrPercent } = args;

  const facturaIvaAmount = baseAmount * (Number(ivaPercent || 0) / 100);
  const ivaRetenidoAmount = baseAmount * (Number(ivaRetenidoPercent || 0) / 100);
  const islrAmount = baseAmount * (Number(islrPercent || 0) / 100);

  const facturaTotalFinal = Math.max(
    0,
    baseAmount + facturaIvaAmount - ivaRetenidoAmount - islrAmount
  );

  return {
    facturaIvaAmount,
    ivaRetenidoAmount,
    islrAmount,
    facturaTotalFinal,
  };
}

export function buildConversionInfo(args: {
  documentCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  exchangeRate: number;
  conversionEnabled: boolean;
  baseAmount: number;
  facturaTotalFinal: number;
}) {
  const {
    documentCurrency,
    targetCurrency,
    exchangeRate,
    conversionEnabled,
    baseAmount,
    facturaTotalFinal,
  } = args;

  const sameCurrency = documentCurrency === targetCurrency;
  const rate = Number(exchangeRate || 0);

  const effectiveRate =
    conversionEnabled && !sameCurrency ? (rate > 0 ? rate : 0) : 0;

  const transformedAmount =
    conversionEnabled && !sameCurrency && effectiveRate > 0
      ? baseAmount * effectiveRate
      : 0;

  const transformedTotal =
    conversionEnabled && !sameCurrency && effectiveRate > 0
      ? facturaTotalFinal * effectiveRate
      : 0;

  const conversionType =
    !conversionEnabled || sameCurrency
      ? "Sin conversión"
      : `${documentCurrency === "USD" ? "Dólares (USD)" : "Bolívares (VES)"} → ${
          targetCurrency === "USD" ? "Dólares (USD)" : "Bolívares (VES)"
        }`;

  return {
    rate,
    effectiveRate,
    transformedAmount,
    transformedTotal,
    conversionType,
  };
}

export function buildCatalogFallbackItem(args: {
  catalogId: string;
  prod?: any;
  kind?: "PRODUCTO" | "PROPERTY";
  partyKey?: string;
  propertyId?: string;
}) {
  const { catalogId, prod, kind, partyKey, propertyId } = args;

  const price = toNumber(
    prod?.price ?? prod?.unitPrice ?? prod?.rate ?? prod?.tarifa ?? 0
  );

  const finalKind =
    kind ??
    (String((prod?.kind ?? "")).toUpperCase() === "PROPERTY"
      ? "PROPERTY"
      : "PRODUCTO");

  return {
    id: `prop-${Date.now()}`,
    kind: finalKind,
    name: prod?.name ?? `Producto ${catalogId}`,
    quantity: 1,
    unitPrice: price,
    price,
    rate: price,
    tarifa: price,
    total: price,
    meta: {
      propertyId: propertyId ?? String(catalogId),
      companyId: partyKey ?? "",
      domain: "condo",
    },
  };
}