import { NextResponse } from "next/server";
import {
  genId,
  readData,
  writeData,
} from "../_lib";

export const runtime = "nodejs";

/* -------------------- Helpers -------------------- */
function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function toLowerText(value: unknown): string {
  return toText(value).toLowerCase();
}

function hasOwnerOrContractorMarker(source: any): boolean {
  if (!source) return false;

  const directFlags = [
    source?.isPropietario,
    source?.isProveedorContratista,
    source?.propietario,
    source?.contratista,
    source?.esPropietario,
    source?.esContratista,
    source?.propietarios,
    source?.contratistas,
    source?.hasPropietario,
    source?.hasContratista,
  ];

  if (directFlags.some(Boolean)) return true;

  const candidateLists: any[] = [
    source?.checklist,
    source?.meta?.checklist,
    source?.meta?.items,
    source?.items,
    source?.tags,
  ];

  for (const list of candidateLists) {
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    for (const item of arr) {
      const text =
        typeof item === "string"
          ? toLowerText(item)
          : toLowerText(
              item?.label ??
                item?.name ??
                item?.title ??
                item?.value ??
                item?.text ??
                JSON.stringify(item)
            );

      if (
        text.includes("propiet") ||
        text.includes("contrat") ||
        text.includes("dueñ") ||
        text.includes("dueño")
      ) {
        return true;
      }

      if (
        item?.done === true &&
        (text.includes("propiet") || text.includes("contrat"))
      ) {
        return true;
      }
    }
  }

  const metaText = toLowerText(source?.meta ? JSON.stringify(source.meta) : "");
  if (
    metaText.includes("propiet") ||
    metaText.includes("contrat") ||
    metaText.includes("dueñ") ||
    metaText.includes("dueño")
  ) {
    return true;
  }

  return false;
}

function getTransactionFromBody(body: any, payload: any) {
  return (
    body?.transaction ??
    payload?.transaction ??
    payload?.meta?.transactionType ??
    payload?.meta?.transaction ??
    ""
  );
}

function getPayloadFromBody(body: any) {
  return body?.data ?? body?.item ?? body?.service ?? null;
}

function isValidNumberValue(value: any) {
  if (typeof value === "undefined" || value === null || value === "") return true;
  const n = Number(value);
  return !Number.isNaN(n) && Number.isFinite(n);
}

/**
 * Validación pensada para el formulario ServiceRow + catálogo.
 * No obliga checklist aquí, porque el UI de servicios normalmente no lo envía.
 */
function validateService(payload: any) {
  if (!payload) {
    return { ok: false, error: "Payload vacío." };
  }

  const name = String(payload?.name ?? "").trim();
  const description = String(payload?.serviceDescription ?? payload?.description ?? "").trim();

  if (!name && !description) {
    return { ok: false, error: "El servicio debe incluir name o serviceDescription." };
  }

  if (!isValidNumberValue(payload?.hours)) {
    return { ok: false, error: "hours inválido para servicio." };
  }

  if (!isValidNumberValue(payload?.rate)) {
    return { ok: false, error: "rate inválido para servicio." };
  }

  if (!isValidNumberValue(payload?.quantity)) {
    return { ok: false, error: "quantity inválido para servicio." };
  }

  if (!isValidNumberValue(payload?.price)) {
    return { ok: false, error: "price inválido para servicio." };
  }

  return { ok: true };
}

function normalizeService(payload: any, transaction: string, existing?: any) {
  const now = new Date().toISOString();
  const id = String(payload?.id ?? existing?.id ?? genId());

  const explicitDomain = String(
    payload?.domain ??
      payload?.meta?.domain ??
      existing?.domain ??
      existing?.meta?.domain ??
      ""
  ).toLowerCase();

  const detectedCondo = hasOwnerOrContractorMarker(payload) || hasOwnerOrContractorMarker(existing);
  const domain = explicitDomain === "condo" || detectedCondo ? "condo" : "general";

  const hoursRaw =
    typeof payload?.hours !== "undefined"
      ? payload.hours
      : typeof existing?.hours !== "undefined"
      ? existing.hours
      : 0;

  const rateRaw =
    typeof payload?.rate !== "undefined"
      ? payload.rate
      : typeof existing?.rate !== "undefined"
      ? existing.rate
      : 0;

  const quantityRaw =
    typeof payload?.quantity !== "undefined"
      ? payload.quantity
      : typeof existing?.quantity !== "undefined"
      ? existing.quantity
      : 1;

  const hours = Number(hoursRaw ?? 0);
  const rate = Number(rateRaw ?? 0);
  const quantity = Number(quantityRaw ?? 1);

  const computedTotal =
    typeof payload?.total !== "undefined"
      ? Number(payload.total)
      : typeof existing?.total !== "undefined"
      ? Number(existing.total)
      : Number.isFinite(hours) && Number.isFinite(rate)
      ? hours * rate
      : 0;

  const photos = Array.isArray(payload?.photos)
    ? payload.photos
    : Array.isArray(existing?.photos)
    ? existing.photos
    : [];

  const checklist = Array.isArray(payload?.checklist)
    ? payload.checklist
    : Array.isArray(existing?.checklist)
    ? existing.checklist
    : [];

  const meta = {
    ...(existing?.meta || {}),
    ...(payload?.meta || {}),
    transactionType: payload?.meta?.transactionType ?? transaction ?? existing?.meta?.transactionType ?? "",
    transaction: payload?.meta?.transaction ?? transaction ?? existing?.meta?.transaction ?? "",
    companyId: payload?.companyId ?? existing?.companyId ?? payload?.meta?.companyId ?? existing?.meta?.companyId ?? "",
    domain,
    isPropietario: Boolean(
      payload?.isPropietario ??
        existing?.isPropietario ??
        payload?.meta?.isPropietario ??
        existing?.meta?.isPropietario ??
        detectedCondo
    ),
    isProveedorContratista: Boolean(
      payload?.isProveedorContratista ??
        existing?.isProveedorContratista ??
        payload?.meta?.isProveedorContratista ??
        existing?.meta?.isProveedorContratista ??
        detectedCondo
    ),
    propietario: Boolean(
      payload?.propietario ??
        existing?.propietario ??
        payload?.meta?.propietario ??
        existing?.meta?.propietario ??
        detectedCondo
    ),
    contratista: Boolean(
      payload?.contratista ??
        existing?.contratista ??
        payload?.meta?.contratista ??
        existing?.meta?.contratista ??
        detectedCondo
    ),
  };

  return {
    id,
    masterId: payload?.masterId ?? existing?.masterId ?? undefined,
    companyId: String(
      payload?.companyId ??
        existing?.companyId ??
        payload?.meta?.companyId ??
        existing?.meta?.companyId ??
        ""
    ),
    transaction,
    kind: String(payload?.kind ?? existing?.kind ?? "SERVICE").toUpperCase(),
    domain,
    type: String(payload?.type ?? existing?.type ?? "service").toLowerCase(),
    sku: payload?.sku ?? existing?.sku ?? null,
    name: String(payload?.name ?? existing?.name ?? "").trim(),
    serviceDescription:
      payload?.serviceDescription ??
      payload?.description ??
      existing?.serviceDescription ??
      existing?.description ??
      "",
    description:
      payload?.description ??
      payload?.serviceDescription ??
      existing?.description ??
      existing?.serviceDescription ??
      "",
    hours,
    rate,
    quantity,
    total: Number.isFinite(computedTotal) ? computedTotal : 0,
    category: payload?.category ?? existing?.category ?? null,
    providerId: payload?.providerId ?? existing?.providerId ?? null,
    propertyId: payload?.propertyId ?? existing?.propertyId ?? null,
    ownerId: payload?.ownerId ?? existing?.ownerId ?? null,
    propertyOwnerId: payload?.propertyOwnerId ?? existing?.propertyOwnerId ?? null,
    photos,
    checklist,
    meta,
    createdAt: existing?.createdAt ?? payload?.createdAt ?? now,
    updatedAt: now,
  };
}

function sanitizeService(item: any) {
  // No borramos masterId porque el frontend lo usa para clonar/relacionar registros.
  const copy = { ...item };
  return copy;
}

function validateServiceWithChecklistAndMeta(item: any) {
  const serviceValidation = validateService(item);
  if (!serviceValidation.ok) return serviceValidation;

  return { ok: true };
}

/* -------------------- GET -------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const transaction = url.searchParams.get("transaction");
    const companyId = url.searchParams.get("companyId");
    const id = url.searchParams.get("id");
    const masterId = url.searchParams.get("masterId");
    const providerId = url.searchParams.get("providerId");
    const propertyId = url.searchParams.get("propertyId");
    const ownerId = url.searchParams.get("ownerId");
    const propertyOwnerId = url.searchParams.get("propertyOwnerId");
    const category = url.searchParams.get("category");
    const sku = url.searchParams.get("sku");
    const kind = url.searchParams.get("kind");
    const domain = url.searchParams.get("domain");
    const q = url.searchParams.get("q");

    let items = await readData("service");

    if (transaction) {
      items = items.filter(
        (i: any) =>
          String(i.transaction ?? i.meta?.transactionType ?? i.meta?.transaction ?? "") ===
          String(transaction)
      );
    }

    if (companyId) {
      items = items.filter((i: any) => String(i.companyId ?? "") === String(companyId));
    }

    if (providerId) {
      items = items.filter((i: any) => String(i.providerId ?? "") === String(providerId));
    }

    if (propertyId) {
      items = items.filter((i: any) => String(i.propertyId ?? "") === String(propertyId));
    }

    if (ownerId) {
      items = items.filter((i: any) => String(i.ownerId ?? "") === String(ownerId));
    }

    if (propertyOwnerId) {
      items = items.filter(
        (i: any) => String(i.propertyOwnerId ?? "") === String(propertyOwnerId)
      );
    }

    if (category) {
      items = items.filter((i: any) => String(i.category ?? "") === String(category));
    }

    if (sku) {
      items = items.filter((i: any) => String(i.sku ?? "") === String(sku));
    }

    if (kind) {
      items = items.filter(
        (i: any) => String(i.kind ?? "").toUpperCase() === String(kind).toUpperCase()
      );
    }

    if (domain) {
      items = items.filter(
        (i: any) =>
          String(i.domain ?? i.meta?.domain ?? "").toLowerCase() ===
          String(domain).toLowerCase()
      );
    }

    if (masterId) {
      items = items.filter(
        (i: any) => String(i.masterId ?? "") === String(masterId)
      );
    }

    if (id) {
      items = items.filter((i: any) => String(i.id ?? "") === String(id));
    }

    if (q) {
      const query = String(q).toLowerCase();
      items = items.filter((i: any) => {
        const hay = [
          i?.name,
          i?.serviceDescription,
          i?.description,
          i?.sku,
          i?.category,
          i?.companyId,
          i?.providerId,
        ]
          .map((x) => String(x ?? "").toLowerCase())
          .join(" ");
        return hay.includes(query);
      });
    }

    items = Array.isArray(items) ? items.map(sanitizeService) : [];

    return NextResponse.json({
      ok: true,
      items,
      services: items,
      count: items.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/* -------------------- POST -------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action ?? "upsert";
    const payload = getPayloadFromBody(body);

    let data = await readData("service");

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
        const itemTransaction = getTransactionFromBody(body, it);

        if (!itemTransaction) {
          throw new Error("Cada servicio debe incluir transaction.");
        }

        const validation = validateServiceWithChecklistAndMeta(it);
        if (!validation.ok) {
          throw new Error(validation.error);
        }

        return normalizeService(it, itemTransaction);
      });

      const cleaned = next.map(sanitizeService);

      await writeData("service", cleaned);

      return NextResponse.json({
        ok: true,
        items: cleaned,
        services: cleaned,
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

      const next = data.filter(
        (i: any) =>
          String(i.id) !== String(id) &&
          String(i.masterId ?? "") !== String(id)
      );
      const cleaned = next.map(sanitizeService);

      await writeData("service", cleaned);

      return NextResponse.json({
        ok: true,
        id,
        items: cleaned,
        services: cleaned,
        count: cleaned.length,
      });
    }

    if (action === "upsert") {
      if (!payload) {
        return NextResponse.json(
          { ok: false, error: "Faltan data/item/service en el body." },
          { status: 400 }
        );
      }

      const transaction = getTransactionFromBody(body, payload);
      if (!transaction) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Falta transaction. Envíala en body.transaction o dentro de data.meta.transactionType.",
          },
          { status: 400 }
        );
      }

      const validation = validateServiceWithChecklistAndMeta(payload);
      if (!validation.ok) {
        return NextResponse.json(
          { ok: false, error: validation.error },
          { status: 400 }
        );
      }

      const id = String(payload.id ?? genId());
      const idx = data.findIndex(
        (i: any) => String(i.id) === id || String(i.masterId ?? "") === id
      );

      const normalized = normalizeService(
        { ...payload, id },
        transaction,
        idx >= 0 ? data[idx] : undefined
      );

      let next: any[] = [];

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

      const cleaned = next.map(sanitizeService);

      await writeData("service", cleaned);

      const savedItem =
        cleaned.find(
          (i: any) => String(i.id) === String(id) || String(i.masterId ?? "") === String(id)
        ) ?? sanitizeService(normalized);

      return NextResponse.json({
        ok: true,
        item: savedItem,
        items: cleaned,
        services: cleaned,
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