import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_PATH = path.join(process.cwd(), "data", "services.json");

async function readData(filePath: string) {
  try {
    const txt = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeData(filePath: string, arr: any[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(arr, null, 2), "utf-8");
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStr(v: any) {
  return v === null || v === undefined ? "" : String(v).trim().toLowerCase();
}

function normalizeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isTrueFlag(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function getPayload(body: any) {
  return body?.data ?? body?.service ?? body?.item ?? null;
}

function getTransaction(body: any, payload: any) {
  return String(
    body?.transaction ??
      payload?.transaction ??
      payload?.meta?.transactionType ??
      payload?.meta?.transaction ??
      ""
  ).trim();
}

/**
 * Detecta si el registro debe ir al flujo condo.
 * Solo usa señales explícitas en true.
 * Si isPropietario / isProveedorContratista vienen en false, no manda a condo.
 */
function isCondoService(record: any): boolean {
  if (!record) return false;

  const directTrueFlags = [
    record?.isPropietario,
    record?.isProveedorContratista,
    record?.propietario,
    record?.contratista,
    record?.esPropietario,
    record?.esContratista,
    record?.hasPropietario,
    record?.hasContratista,
    record?.meta?.isPropietario,
    record?.meta?.isProveedorContratista,
    record?.meta?.propietario,
    record?.meta?.contratista,
    record?.meta?.esPropietario,
    record?.meta?.esContratista,
    record?.meta?.hasPropietario,
    record?.meta?.hasContratista,
  ];

  if (directTrueFlags.some(isTrueFlag)) return true;

  const explicitFlags = [
    record?.domain,
    record?.type,
    record?.role,
    record?.ownerType,
    record?.partyType,
    record?.category,
    record?.meta?.domain,
    record?.meta?.type,
    record?.meta?.role,
    record?.meta?.ownerType,
    record?.meta?.partyType,
    record?.meta?.category,
  ]
    .map(normalizeStr)
    .filter(Boolean);

  const explicitHit = explicitFlags.some((v) => {
    return (
      v.includes("condo") ||
      v.includes("propiet") ||
      v.includes("contrat") ||
      v.includes("owner") ||
      v.includes("contractor")
    );
  });

  if (explicitHit) return true;

  const textParts = [
    record?.name,
    record?.description,
    record?.title,
    record?.text,
    record?.label,
    record?.companyRole,
    record?.meta?.name,
    record?.meta?.description,
    record?.meta?.title,
    record?.meta?.text,
    record?.meta?.label,
    record?.meta?.companyRole,
  ]
    .map(normalizeStr)
    .filter(Boolean)
    .join(" | ");

  return (
    textParts.includes("propiet") ||
    textParts.includes("contrat") ||
    textParts.includes("owner") ||
    textParts.includes("contractor")
  );
}

/**
 * Enviar a condo si el payload pertenece al dominio condo.
 */
async function forwardToCondo(req: Request, body: any) {
  const url = new URL(req.url);
  const condoUrl = `${url.origin}/api/administration/condominium-management/service`;

  const res = await fetch(condoUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/**
 * Enviar GET a condo si se pide explícitamente domain=condo.
 */
async function forwardGetToCondo(req: Request) {
  const url = new URL(req.url);
  const condoUrl = `${url.origin}/api/administration/condominium-management/service${url.search}`;

  const res = await fetch(condoUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/**
 * Normaliza el item general.
 */
async function enrichWithProvider(items: any[]) {
  return items.map((it) => {
    const copy = { ...it };
    copy.provider = null;
    if ("masterId" in copy) delete copy.masterId;
    return copy;
  });
}

function sanitizeItem(it: any) {
  const now = new Date().toISOString();
  const rate = normalizeNumber(it.rate ?? it.defaultRate ?? 0, 0);

  return {
    id: String(it.id ?? genId()),
    name: it.name ?? "",
    description: it.description ?? "",
    providerId: it.providerId ?? it.sourceId ?? null,
    companyId: it.companyId ?? "",
    category: it.category ?? null,
    income: typeof it.income === "boolean" ? it.income : true,

    // rate principal
    rate,

    // compatibilidad con lo anterior
    defaultRate: normalizeNumber(it.defaultRate ?? it.rate ?? rate ?? 0, 0),

    accountId: it.accountId ?? null,
    createdAt: it.createdAt ?? now,
    updatedAt: now,
    meta: it.meta ?? {},
    domain: it.domain ?? it.meta?.domain ?? "general",
  };
}

function splitByDomain(arr: any[]) {
  const condoItems: any[] = [];
  const generalItems: any[] = [];

  for (const raw of arr || []) {
    if (isCondoService(raw)) condoItems.push(raw);
    else generalItems.push(raw);
  }

  return { condoItems, generalItems };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    if (String(url.searchParams.get("domain") ?? "").toLowerCase() === "condo") {
      const condoResult = await forwardGetToCondo(req);
      return NextResponse.json(condoResult.json, {
        status: condoResult.status,
      });
    }

    const providerId = url.searchParams.get("providerId");
    const companyId = url.searchParams.get("companyId");
    const id = url.searchParams.get("id");

    let items = await readData(DATA_PATH);

    if (providerId) {
      items = items.filter(
        (s: any) => String(s.providerId ?? "") === String(providerId)
      );
    }

    if (companyId) {
      items = items.filter(
        (s: any) => String(s.companyId ?? "") === String(companyId)
      );
    }

    if (id) {
      items = items.filter((s: any) => String(s.id) === String(id));
    }

    const enriched = await enrichWithProvider(items);

    return NextResponse.json({ ok: true, services: enriched });
  } catch (err: any) {
    console.error("services GET error:", err);
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
    const data = await readData(DATA_PATH);

    if (
      action === "delete-orphans" ||
      action === "prune-orphans" ||
      action === "auto-prune"
    ) {
      const originalCount = Array.isArray(data) ? data.length : 0;

      try {
        const backupPath = DATA_PATH + `.bak.${Date.now()}`;
        await writeData(backupPath, data);
      } catch (e) {
        console.warn("Could not write backup for services.json", e);
      }

      const companies = (data || []).filter((it: any) => {
        const companyIdVal = it.companyId ?? "";
        return companyIdVal && String(companyIdVal).trim() !== "";
      });

      await writeData(DATA_PATH, companies);

      const enriched = await enrichWithProvider(companies);
      const removedCount = originalCount - companies.length;

      return NextResponse.json({
        ok: true,
        action: "delete-orphans",
        removed: removedCount,
        kept: companies.length,
        services: enriched,
      });
    }

    if (action === "replace") {
      const arr = Array.isArray(body.services)
        ? body.services
        : Array.isArray(body.data)
          ? body.data
          : Array.isArray(body.items)
            ? body.items
            : [];

      if (!arr.length) {
        return NextResponse.json(
          { ok: false, error: "Missing services/data/items para replace." },
          { status: 400 }
        );
      }

      const { condoItems, generalItems } = splitByDomain(arr);

      if (condoItems.length > 0) {
        await forwardToCondo(req, {
          action: "replace",
          items: condoItems,
        });
      }

      const sanitized = generalItems.map((it: any) => sanitizeItem(it));
      await writeData(DATA_PATH, sanitized);

      const enriched = await enrichWithProvider(sanitized);

      return NextResponse.json({
        ok: true,
        services: enriched,
        condoMoved: condoItems.length,
        generalSaved: sanitized.length,
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

      const domain = normalizeStr(
        body?.domain ?? body?.service?.domain ?? body?.data?.domain
      );
      const shouldForwardToCondo = domain === "condo";

      if (shouldForwardToCondo) {
        const condoRes = await forwardToCondo(req, body);
        return NextResponse.json(condoRes.json, { status: condoRes.status });
      }

      const next = data.filter((i: any) => String(i.id) !== String(id));
      await writeData(DATA_PATH, next);

      const enriched = await enrichWithProvider(next);
      return NextResponse.json({ ok: true, id, services: enriched });
    }

    if (action === "upsert") {
      const payload = getPayload(body);

      if (!payload) {
        return NextResponse.json(
          { ok: false, error: "Missing data/service/item" },
          { status: 400 }
        );
      }

      const transaction = getTransaction(body, payload);

      if (!payload.name) {
        return NextResponse.json(
          { ok: false, error: "Missing name" },
          { status: 400 }
        );
      }

      if (isCondoService(payload)) {
        const condoBody = {
          ...body,
          transaction,
          data: {
            ...payload,
            transaction,
            meta: {
              ...(payload.meta ?? {}),
              transactionType: transaction || payload?.meta?.transactionType,
            },
          },
        };

        const condoRes = await forwardToCondo(req, condoBody);
        return NextResponse.json(condoRes.json, { status: condoRes.status });
      }

      const incoming = sanitizeItem({
        ...payload,
        transaction,
      });

      let next = [...data];

      const idxById = next.findIndex(
        (d: any) => String(d.id) === String(incoming.id)
      );

      if (idxById >= 0) {
        const existing = { ...next[idxById] };

        for (const k of Object.keys(incoming)) {
          if (
            incoming[k] !== undefined &&
            incoming[k] !== null &&
            incoming[k] !== ""
          ) {
            (existing as any)[k] = (incoming as any)[k];
          }
        }

        existing.updatedAt = new Date().toISOString();

        // asegura que rate exista aunque el registro viejo no lo tuviera
        if (existing.rate === undefined || existing.rate === null) {
          (existing as any).rate = normalizeNumber(
            (existing as any).defaultRate ?? 0,
            0
          );
        }

        if (existing.defaultRate === undefined || existing.defaultRate === null) {
          (existing as any).defaultRate = normalizeNumber(
            (existing as any).rate ?? 0,
            0
          );
        }

        next[idxById] = existing;
      } else {
        next = [incoming, ...next];
      }

      const sanitizedForSave = next.map((it) => {
        const copy = { ...it };

        if ("masterId" in copy) delete copy.masterId;

        // garantía extra: si existe uno de los dos, rellenar el otro
        if (copy.rate === undefined || copy.rate === null) {
          copy.rate = normalizeNumber(copy.defaultRate ?? 0, 0);
        }
        if (copy.defaultRate === undefined || copy.defaultRate === null) {
          copy.defaultRate = normalizeNumber(copy.rate ?? 0, 0);
        }

        return copy;
      });

      await writeData(DATA_PATH, sanitizedForSave);

      const enriched = (await enrichWithProvider([incoming]))[0];
      const allEnriched = await enrichWithProvider(sanitizedForSave);

      return NextResponse.json({
        ok: true,
        service: enriched,
        services: allEnriched,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("services POST error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}