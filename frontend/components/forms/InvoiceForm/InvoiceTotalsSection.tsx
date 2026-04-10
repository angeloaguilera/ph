import React from "react";
import type { CurrencyCode } from "./hooks/useExchangeRate";
import { formatMoney } from "./invoiceMoney";

type ConversionInfo = {
  rate: number;
  effectiveRate: number;
  transformedAmount: number;
  transformedTotal: number;
  conversionType: string;
};

type Props = {
  docKind: string;
  itemsSubtotal: number;
  ivaPercent: number;
  setIvaPercent: (v: number) => void;
  ivaRetenidoPercent: number;
  setIvaRetenidoPercent: (v: number) => void;
  islrPercent: number;
  setIslrPercent: (v: number) => void;
  facturaIvaAmount: number;
  ivaRetenidoAmount: number;
  islrAmount: number;
  facturaTotalFinal: number;

  documentCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  conversionInfo: ConversionInfo;
};

export default function InvoiceTotalsSection({
  docKind,
  itemsSubtotal,
  ivaPercent,
  setIvaPercent,
  ivaRetenidoPercent,
  setIvaRetenidoPercent,
  islrPercent,
  setIslrPercent,
  facturaIvaAmount,
  ivaRetenidoAmount,
  islrAmount,
  facturaTotalFinal,
  documentCurrency,
  targetCurrency,
  conversionInfo,
}: Props) {
  const sameCurrency = documentCurrency === targetCurrency;
  const hasConversion =
    !sameCurrency && Number(conversionInfo.effectiveRate) > 0;

  const reflectedSubtotal = hasConversion
    ? conversionInfo.transformedAmount
    : 0;

  const reflectedTotal = hasConversion ? conversionInfo.transformedTotal : 0;

  if (docKind === "FACTURA") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Monto</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={formatMoney(itemsSubtotal, documentCurrency)}
            readOnly
          />
          <div className="mt-2 text-xs text-gray-500">
            {hasConversion ? (
              <>
                Monto reflejado: {formatMoney(reflectedSubtotal, targetCurrency)}
              </>
            ) : (
              "No se refleja porque la moneda origen y destino son iguales."
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">IVA (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="w-full border rounded px-3 py-2"
            value={ivaPercent === 0 ? "" : ivaPercent}
            onChange={(e) =>
              setIvaPercent(
                e.target.value === "" ? 0 : parseFloat(e.target.value)
              )
            }
          />
          <div className="mt-2 text-sm text-gray-600">
            <div>IVA (monto)</div>
            <div className="font-medium">
              {formatMoney(facturaIvaAmount, documentCurrency)}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              IVA retenido (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="w-full border rounded px-3 py-2"
              value={ivaRetenidoPercent === 0 ? "" : ivaRetenidoPercent}
              onChange={(e) =>
                setIvaRetenidoPercent(
                  e.target.value === "" ? 0 : parseFloat(e.target.value)
                )
              }
            />
            <div className="mt-2 text-sm text-gray-600">
              <div>IVA retenido (monto)</div>
              <div className="font-medium">
                {formatMoney(ivaRetenidoAmount, documentCurrency)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">ISLR (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="w-full border rounded px-3 py-2"
              value={islrPercent === 0 ? "" : islrPercent}
              onChange={(e) =>
                setIslrPercent(
                  e.target.value === "" ? 0 : parseFloat(e.target.value)
                )
              }
            />
            <div className="mt-2 text-sm text-gray-600">
              <div>ISLR (monto)</div>
              <div className="font-medium">
                {formatMoney(islrAmount, documentCurrency)}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Total</label>
          <input
            readOnly
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={formatMoney(facturaTotalFinal, documentCurrency)}
          />
          <div className="mt-2 text-xs text-gray-500">
            {hasConversion ? (
              <>
                Total reflejado: {formatMoney(reflectedTotal, targetCurrency)}
              </>
            ) : (
              "No se refleja porque la moneda origen y destino son iguales."
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tasa aplicada</label>
          <input
            readOnly
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={hasConversion ? String(conversionInfo.effectiveRate) : "0"}
          />
          <div className="mt-2 text-xs text-gray-500">
            {hasConversion ? conversionInfo.conversionType : "Sin conversión"}
          </div>
        </div>
      </div>
    );
  }

  if (docKind === "RECIBO") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Monto</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={formatMoney(itemsSubtotal, documentCurrency)}
            readOnly
          />
          <div className="mt-2 text-xs text-gray-500">
            {hasConversion ? (
              <>
                Monto reflejado: {formatMoney(reflectedSubtotal, targetCurrency)}
              </>
            ) : (
              "No se refleja porque la moneda origen y destino son iguales."
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Total</label>
          <input
            readOnly
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={formatMoney(itemsSubtotal, documentCurrency)}
          />
          <div className="mt-2 text-xs text-gray-500">
            {hasConversion ? (
              <>
                Total reflejado: {formatMoney(reflectedTotal, targetCurrency)}
              </>
            ) : (
              "No se refleja porque la moneda origen y destino son iguales."
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 text-right">
      <div className="text-sm">Total</div>
      <div className="font-medium">
        {formatMoney(facturaTotalFinal, documentCurrency)}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {hasConversion ? (
          <>
            Total reflejado: {formatMoney(reflectedTotal, targetCurrency)}
          </>
        ) : (
          "No se refleja porque la moneda origen y destino son iguales."
        )}
      </div>
    </div>
  );
}