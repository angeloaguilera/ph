"use client";

import React, { useEffect } from "react";
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
  documentCurrency: CurrencyCode;
  setDocumentCurrency: (value: CurrencyCode) => void;

  targetCurrency: CurrencyCode;
  setTargetCurrency: (value: CurrencyCode) => void;

  conversionEnabled: boolean;
  setConversionEnabled: (value: boolean) => void;

  useAutoRate: boolean;
  setUseAutoRate: (value: boolean) => void;

  manualExchangeRate: number;
  setManualExchangeRate: (value: number) => void;

  autoExchangeRate: number;
  autoRateLoading: boolean;
  autoRateError: string | null | undefined;
  lastUpdatedAt: string | number | null | undefined;

  conversionInfo: ConversionInfo;
  baseAmount: number;
  facturaTotalFinal: number;
};

export default function InvoiceCurrencySection({
  documentCurrency,
  setDocumentCurrency,
  targetCurrency,
  setTargetCurrency,
  conversionEnabled,
  setConversionEnabled,
  useAutoRate,
  setUseAutoRate,
  manualExchangeRate,
  setManualExchangeRate,
  autoExchangeRate,
  autoRateLoading,
  autoRateError,
  lastUpdatedAt,
  conversionInfo,
  baseAmount,
  facturaTotalFinal,
}: Props) {
  // Se desactiva automáticamente al cargar el componente
  useEffect(() => {
    setConversionEnabled(false);
  }, [setConversionEnabled]);

  const sameCurrency = documentCurrency === targetCurrency;
  const hasConversion = conversionEnabled && !sameCurrency;

  const displayedRate = useAutoRate
    ? autoExchangeRate || 0
    : manualExchangeRate || 0;

  const effectiveRate = hasConversion
    ? Number(conversionInfo.effectiveRate || displayedRate || 0)
    : 0;

  const convertedAmount = hasConversion ? conversionInfo.transformedAmount : 0;
  const convertedTotal = hasConversion ? conversionInfo.transformedTotal : 0;

  const toggleConversion = () => {
    setConversionEnabled(!conversionEnabled);
  };

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">
          Conversión de moneda:{" "}
          <span className={conversionEnabled ? "text-green-600" : "text-red-600"}>
            {conversionEnabled ? "Activa" : "Desactivada"}
          </span>
          {sameCurrency && conversionEnabled && (
            <span className="ml-2 text-xs text-gray-500">
              (Moneda origen y destino iguales)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleConversion}
          className={`px-4 py-2 rounded text-sm font-medium border transition ${
            conversionEnabled
              ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
              : "bg-green-600 text-white border-green-600 hover:bg-green-700"
          }`}
        >
          {conversionEnabled
            ? "Desactivar conversión de moneda"
            : "Activar conversión de moneda"}
        </button>
      </div>

      {conversionEnabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Moneda del monto
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={documentCurrency}
                onChange={(e) => setDocumentCurrency(e.target.value as CurrencyCode)}
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Moneda a convertir
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value as CurrencyCode)}
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tasa de cambio
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="w-full border rounded px-3 py-2"
                value={useAutoRate ? autoExchangeRate || "" : manualExchangeRate || ""}
                onChange={(e) => {
                  setUseAutoRate(false);
                  setManualExchangeRate(Number(e.target.value || 0));
                }}
                placeholder="Ej. 36.50"
                disabled={useAutoRate}
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useAutoRate}
                  onChange={(e) => setUseAutoRate(e.target.checked)}
                />
                Tasa automática
              </label>
              <div className="text-xs text-gray-500">
                {autoRateLoading
                  ? "Actualizando tasa..."
                  : autoRateError
                  ? `Error: ${autoRateError}`
                  : lastUpdatedAt
                  ? `Actualizada: ${new Date(lastUpdatedAt).toLocaleString()}`
                  : "Sin actualización aún"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="border rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Tipo de conversión</div>
              <div className="font-medium">
                {hasConversion ? conversionInfo.conversionType : "Sin conversión"}
              </div>
            </div>

            <div className="border rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Monto</div>
              <div className="font-medium">
                {formatMoney(baseAmount, documentCurrency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {hasConversion ? (
                  <>Monto reflejado: {formatMoney(convertedAmount, targetCurrency)}</>
                ) : (
                  "No se refleja porque la conversión está desactivada o la moneda origen y destino son iguales."
                )}
              </div>
            </div>

            <div className="border rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Total</div>
              <div className="font-medium">
                {formatMoney(facturaTotalFinal, documentCurrency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {hasConversion ? (
                  <>Total reflejado: {formatMoney(convertedTotal, targetCurrency)}</>
                ) : (
                  "No se refleja porque la conversión está desactivada o la moneda origen y destino son iguales."
                )}
              </div>
            </div>

            <div className="border rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Tasa aplicada</div>
              <div className="font-medium">{hasConversion ? effectiveRate : 0}</div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Si activas la tasa automática, se actualiza sola. Si la apagas, puedes
            colocar la tasa manualmente.
          </div>

          <input type="hidden" name="documentCurrency" value={documentCurrency} />
          <input type="hidden" name="targetCurrency" value={targetCurrency} />
          <input
            type="hidden"
            name="exchangeRate"
            value={String(hasConversion ? effectiveRate || 0 : 0)}
          />
          <input type="hidden" name="useAutoRate" value={String(useAutoRate)} />
          <input
            type="hidden"
            name="conversionEnabled"
            value={String(conversionEnabled)}
          />
          <input
            type="hidden"
            name="conversionType"
            value={hasConversion ? conversionInfo.conversionType : "SIN_CONVERSION"}
          />
          <input
            type="hidden"
            name="convertedAmount"
            value={String(hasConversion ? convertedAmount : "")}
          />
          <input
            type="hidden"
            name="convertedTotal"
            value={String(hasConversion ? convertedTotal : "")}
          />
        </>
      )}
    </div>
  );
}