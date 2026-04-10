"use client";

import { useEffect, useMemo, useState } from "react";

export type CurrencyCode = "USD" | "VES";

type Args = {
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  enabled?: boolean;
  refreshMs?: number;
};

type State = {
  rate: number;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
};

export default function useExchangeRate({
  sourceCurrency,
  targetCurrency,
  enabled = true,
  refreshMs = 15 * 60 * 1000,
}: Args): State {
  const [rate, setRate] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("base", sourceCurrency);
    params.set("target", targetCurrency);
    return params.toString();
  }, [sourceCurrency, targetCurrency]);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/exchange-rate?${query}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? `HTTP ${res.status}`);
        }

        if (!alive) return;

        setRate(Number(json.rate) || 1);
        setLastUpdatedAt(json.lastUpdateUtc ?? new Date().toISOString());
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "No se pudo obtener la tasa");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();
    const id = window.setInterval(load, refreshMs);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [enabled, query, refreshMs]);

  return { rate, loading, error, lastUpdatedAt };
}