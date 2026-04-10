// app/api/administration/condominium-management/article/route.ts
import { NextResponse } from "next/server";
import { genId, readData, writeData, validateChecklist } from "../_lib";

export const runtime = "nodejs";

/**
 * Reglas específicas para artículos
 * - sku o name debe existir
 * - price debe ser número >= 0 (si viene)
 * - quantity debe ser número >= 0 (si viene)
 */
function validateArticle(payload: any) {
  if (!payload) {
    return { ok: false, error: "Payload vacío." };
  }

  const sku = payload?.sku ?? null;
  const name = String(payload?.name ?? "").trim();

  if (!sku && !name) {
    return { ok: false, error: "El artículo debe incluir sku o name." };
  }

  if (typeof payload?.price !== "undefined") {
    const p = Number(payload.price);
    if (Number.isNaN(p) || p < 0) {
      return { ok: false, error: "price inválido para artículo." };
    }
  }

  if (typeof payload?.quantity !== "undefined") {
    const q = Number(payload.quantity);
    if (Number.isNaN(q) || q < 0) {
      return { ok: false, error: "quantity inválido para artículo." };
    }
  }

  return { ok: true };
}

function normalizeArticle(payload: any, transaction: string, existing?: any) {
  const now = new Date().toISOString();
  const id = String(payload?.id ?? existing?.id ?? genId());

  return {
    id,
    type: "product",
    transaction,
    companyId: payload?.companyId ?? existing?.companyId ?? "",
    providerId: payload?.providerId ?? existing?.providerId ?? null,
    sku: payload?.sku ?? existing?.sku ?? null,
    name: payload?.name ?? existing?.name ?? "",
    price: Number(
      typeof payload?.price !== "undefined"
        ? payload.price
        : typeof existing?.price !== "undefined"
          ? existing.price
          : 0
    ),
    quantity: Number(
      typeof payload?.quantity !== "undefined"
        ? payload.quantity
        : typeof existing?.quantity !== "undefined"
          ? existing.quantity
          : 0
    ),
    category: payload?.category ?? existing?.category ?? null,
    specs: payload?.specs ?? existing?.specs ?? {},
    photos: payload?.photos ?? existing?.photos ?? [],
    meta: payload?.meta ?? existing?.meta ?? {},
    checklist: payload?.checklist ?? existing?.checklist ?? null,
    createdAt: existing?.createdAt ?? payload?.createdAt ?? now,
    updatedAt: now,
  };
}

function sanitizeArticle(item: any) {
  const copy = { ...item };

  if ("masterId" in copy) delete copy.masterId;
  if ("master" in copy) delete copy.master;

  return copy;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const transaction = url.searchParams.get("transaction");
    const companyId = url.searchParams.get("companyId");
    const id = url.searchParams.get("id");
    const providerId = url.searchParams.get("providerId");
    const sku = url.searchParams.get("sku");

    let items = await readData("article");

    if (transaction) {
      items = items.filter(
        (i: any) => String(i.transaction ?? "") === String(transaction)
      );
    }

    if (companyId) {
      items = items.filter(
        (i: any) => String(i.companyId ?? "") === String(companyId)
      );
    }

    if (providerId) {
      items = items.filter(
        (i: any) => String(i.providerId ?? "") === String(providerId)
      );
    }

    if (sku) {
      items = items.filter((i: any) => String(i.sku ?? "") === String(sku));
    }

    if (id) {
      items = items.filter((i: any) => String(i.id ?? "") === String(id));
    }

    items = Array.isArray(items) ? items.map(sanitizeArticle) : [];

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action ?? "upsert";
    const transaction = body?.transaction;
    const payload = body?.data ?? body?.item ?? null;

    let data = await readData("article");

    if (action === "replace") {
      const arr = Array.isArray(body?.items)
        ? body.items
        : Array.isArray(body?.data)
          ? body.data
          : [];

      if (!arr.length) {
        return NextResponse.json(
          { ok: false, error: "Missing items para replace." },
          { status: 400 }
        );
      }

      const next = arr.map((it: any) => {
        const itemTransaction = it?.transaction ?? transaction;

        if (!itemTransaction) {
          throw new Error("Cada artículo debe incluir transaction.");
        }

        const checklistValidation = validateChecklist(it);
        if (!checklistValidation.ok) {
          throw new Error(checklistValidation.error);
        }

        const articleValidation = validateArticle(it);
        if (!articleValidation.ok) {
          throw new Error(articleValidation.error);
        }

        return normalizeArticle(it, itemTransaction);
      });

      const cleaned = next.map(sanitizeArticle);

      await writeData("article", cleaned);

      return NextResponse.json({
        ok: true,
        items: cleaned,
        count: cleaned.length,
      });
    }

    if (action === "delete") {
      const id = body?.id;
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Missing id" },
          { status: 400 }
        );
      }

      const next = data.filter((i: any) => String(i.id) !== String(id));
      const cleaned = next.map(sanitizeArticle);

      await writeData("article", cleaned);

      return NextResponse.json({
        ok: true,
        id,
        items: cleaned,
        count: cleaned.length,
      });
    }

    if (action === "upsert") {
      if (!transaction || !payload) {
        return NextResponse.json(
          { ok: false, error: "Faltan transaction o data en el body." },
          { status: 400 }
        );
      }

      const checklistValidation = validateChecklist(payload);
      if (!checklistValidation.ok) {
        return NextResponse.json(
          { ok: false, error: checklistValidation.error },
          { status: 400 }
        );
      }

      const articleValidation = validateArticle(payload);
      if (!articleValidation.ok) {
        return NextResponse.json(
          { ok: false, error: articleValidation.error },
          { status: 400 }
        );
      }

      const id = String(payload.id ?? genId());
      const idx = data.findIndex((i: any) => String(i.id) === id);

      const normalized = normalizeArticle(
        { ...payload, id },
        transaction,
        idx >= 0 ? data[idx] : undefined
      );

      let next: any[];

      if (idx >= 0) {
        const preservedCreatedAt = data[idx].createdAt ?? normalized.createdAt;
        next = [...data];
        next[idx] = {
          ...next[idx],
          ...normalized,
          createdAt: preservedCreatedAt,
          updatedAt: new Date().toISOString(),
        };
      } else {
        next = [normalized, ...data];
      }

      const cleaned = next.map(sanitizeArticle);

      await writeData("article", cleaned);

      const savedItem = cleaned.find((i: any) => String(i.id) === id) ?? normalized;

      return NextResponse.json({
        ok: true,
        item: savedItem,
        items: cleaned,
        count: cleaned.length,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}