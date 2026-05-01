"use client";

import React, { useEffect } from "react";
import type { CurrencyCode } from "./hooks/useExchangeRate";
import { formatMoney } from "./invoiceMoney";
import "./InvoiceCurrencySection.css";

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
    <div className="invoice-currency">
      <div className="invoice-currency__header">
        <div className="invoice-currency__status">
          Conversión de moneda:{" "}
          <span
            className={
              conversionEnabled
                ? "invoice-currency__status--on"
                : "invoice-currency__status--off"
            }
          >
            {conversionEnabled ? "Activa" : "Desactivada"}
          </span>
          {sameCurrency && conversionEnabled && (
            <span className="invoice-currency__hint-inline">
              (Moneda origen y destino iguales)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleConversion}
          className={`invoice-currency__toggle ${
            conversionEnabled
              ? "invoice-currency__toggle--off"
              : "invoice-currency__toggle--on"
          }`}
        >
          {conversionEnabled
            ? "Desactivar conversión"
            : "Activar conversión"}
        </button>
      </div>

      {conversionEnabled && (
        <>
          <div className="invoice-currency__fields">
            <div className="invoice-currency__field">
              <label className="invoice-currency__label">
                Moneda del monto
              </label>
              <select
                className="invoice-currency__select"
                value={documentCurrency}
                onChange={(e) => setDocumentCurrency(e.target.value as CurrencyCode)}
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            <div className="invoice-currency__field">
              <label className="invoice-currency__label">
                Moneda a convertir
              </label>
              <select
                className="invoice-currency__select"
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value as CurrencyCode)}
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            <div className="invoice-currency__field">
              <label className="invoice-currency__label">Tasa de cambio</label>
              <input
                type="number"
                min="0"
                step="any"
                className="invoice-currency__input"
                value={useAutoRate ? autoExchangeRate || "" : manualExchangeRate || ""}
                onChange={(e) => {
                  setUseAutoRate(false);
                  setManualExchangeRate(Number(e.target.value || 0));
                }}
                placeholder="Ej. 36.50"
                disabled={useAutoRate}
              />
            </div>

            <div className="invoice-currency__field invoice-currency__field--bottom">
              <label className="invoice-currency__check">
                <input
                  type="checkbox"
                  checked={useAutoRate}
                  onChange={(e) => setUseAutoRate(e.target.checked)}
                />
                <span>Tasa automática</span>
              </label>

              <div className="invoice-currency__meta">
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

          <div className="invoice-currency__cards">
            <div className="invoice-currency__card">
              <div className="invoice-currency__card-label">Tipo de conversión</div>
              <div className="invoice-currency__card-value">
                {hasConversion ? conversionInfo.conversionType : "Sin conversión"}
              </div>
            </div>

            <div className="invoice-currency__card">
              <div className="invoice-currency__card-label">Monto</div>
              <div className="invoice-currency__card-value">
                {formatMoney(baseAmount, documentCurrency)}
              </div>
              <div className="invoice-currency__card-note">
                {hasConversion ? (
                  <>Monto reflejado: {formatMoney(convertedAmount, targetCurrency)}</>
                ) : (
                  "No se refleja porque la conversión está desactivada o la moneda origen y destino son iguales."
                )}
              </div>
            </div>

            <div className="invoice-currency__card">
              <div className="invoice-currency__card-label">Total</div>
              <div className="invoice-currency__card-value">
                {formatMoney(facturaTotalFinal, documentCurrency)}
              </div>
              <div className="invoice-currency__card-note">
                {hasConversion ? (
                  <>Total reflejado: {formatMoney(convertedTotal, targetCurrency)}</>
                ) : (
                  "No se refleja porque la conversión está desactivada o la moneda origen y destino son iguales."
                )}
              </div>
            </div>

            <div className="invoice-currency__card">
              <div className="invoice-currency__card-label">Tasa aplicada</div>
              <div className="invoice-currency__card-value">
                {hasConversion ? effectiveRate : 0}
              </div>
            </div>
          </div>

          <div className="invoice-currency__help">
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