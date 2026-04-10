import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CurrencyCode = "USD" | "VES";

const ALLOWED = new Set<CurrencyCode>(["USD", "VES"]);

export async function GET(req: Request) {
  const url = new URL(req.url);

  const base = (url.searchParams.get("base") ?? "USD").toUpperCase() as CurrencyCode;
  const target = (url.searchParams.get("target") ?? "VES").toUpperCase() as CurrencyCode;

  if (!ALLOWED.has(base) || !ALLOWED.has(target)) {
    return NextResponse.json(
      { ok: false, error: "Moneda no soportada" },
      { status: 400 }
    );
  }

  if (base === target) {
    return NextResponse.json({
      ok: true,
      base,
      target,
      rate: 1,
      provider: "same-currency",
      lastUpdateUtc: null,
    });
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Error consultando proveedor externo: HTTP ${res.status}`);
    }

    const data = await res.json();
    const rate = Number(data?.rates?.[target]);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`No se encontró tasa para ${base} → ${target}`);
    }

    return NextResponse.json(
      {
        ok: true,
        base,
        target,
        rate,
        provider: "open.er-api.com",
        lastUpdateUtc: data?.time_last_update_utc ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Error obteniendo tasa de cambio",
      },
      { status: 502 }
    );
  }
}