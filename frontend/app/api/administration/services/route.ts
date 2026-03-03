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
  } catch (e) {
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

/**
 * Como ya no manejamos 'masters', enriquecemos provider como null
 * (se deja para mantener la misma forma de salida que antes).
 */
async function enrichWithProvider(items: any[]) {
  return items.map((it) => {
    const copy = { ...it };
    copy.provider = null;
    // eliminar campos antiguos relacionados con master si existieran
    if ("masterId" in copy) delete copy.masterId;
    return copy;
  });
}

/**
 * Asegura forma/tipos del item y elimina cualquier campo 'masterId'
 */
function sanitizeItem(it: any) {
  return {
    id: String(it.id ?? genId()),
    name: it.name ?? "",
    description: it.description ?? "",
    providerId: it.providerId ?? it.sourceId ?? null,
    companyId: it.companyId ?? "",
    category: it.category ?? null,
    income: typeof it.income === "boolean" ? it.income : true,
    defaultRate: Number(it.defaultRate ?? 0),
    accountId: it.accountId ?? null,
    createdAt: it.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    meta: it.meta ?? {},
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const providerId = url.searchParams.get("providerId");
    const companyId = url.searchParams.get("companyId");
    const id = url.searchParams.get("id");

    let items = await readData(DATA_PATH);

    if (providerId) {
      items = items.filter((s: any) => String(s.providerId ?? "") === String(providerId));
    }

    if (companyId) {
      items = items.filter((s: any) => String(s.companyId ?? "") === String(companyId));
    }

    if (id) {
      items = items.filter((s: any) => String(s.id) === String(id));
    }

    // eliminar masterId si existiera y enriquecer provider
    const enriched = await enrichWithProvider(items);

    return NextResponse.json({ ok: true, services: enriched });
  } catch (err: any) {
    console.error("services GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action ?? "upsert";
    const data = await readData(DATA_PATH);

    // --- acción para eliminar orfanos: elimina items sin companyId ---
    if (action === "delete-orphans" || action === "prune-orphans" || action === "auto-prune") {
      const originalCount = Array.isArray(data) ? data.length : 0;

      // backup opcional
      try {
        const backupPath = DATA_PATH + `.bak.${Date.now()}`;
        await writeData(backupPath, data);
      } catch (e) {
        console.warn("Could not write backup for services.json", e);
      }

      // Mantener solo items con companyId no vacío
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

    // replace: reemplaza todo el archivo por body.services (sanitizado)
    if (action === "replace") {
      const arr = Array.isArray(body.services) ? body.services : data;
      const sanitized = (arr || []).map((it: any) => sanitizeItem(it));
      await writeData(DATA_PATH, sanitized);
      const enriched = await enrichWithProvider(sanitized);
      return NextResponse.json({ ok: true, services: enriched });
    }

    // delete por id
    if (action === "delete") {
      const id = body?.id;
      if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
      const next = data.filter((i: any) => String(i.id) !== String(id));
      await writeData(DATA_PATH, next);
      const enriched = await enrichWithProvider(next);
      return NextResponse.json({ ok: true, id, services: enriched });
    }

    // upsert: inserta o actualiza un service (sin lógica de masters)
    if (action === "upsert") {
      const svc = body?.service;
      if (!svc || !svc.name) return NextResponse.json({ ok: false, error: "Missing service.name" }, { status: 400 });

      const incoming = sanitizeItem(svc);

      let next = [...data];

      const idxById = next.findIndex((d: any) => String(d.id) === String(incoming.id));
      if (idxById >= 0) {
        // merge: solo reemplazamos campos no vacíos del incoming
        const existing = { ...next[idxById] };
        for (const k of Object.keys(incoming)) {
          if (incoming[k] !== undefined && incoming[k] !== null && incoming[k] !== "") {
            (existing as any)[k] = (incoming as any)[k];
          }
        }
        existing.updatedAt = new Date().toISOString();
        next[idxById] = existing;
      } else {
        // insertar al inicio
        next = [incoming, ...next];
      }

      // Antes de guardar, eliminar cualquier campo 'masterId' en los items (si existiera)
      const sanitizedForSave = next.map((it) => {
        const copy = { ...it };
        if ("masterId" in copy) delete copy.masterId;
        return copy;
      });

      await writeData(DATA_PATH, sanitizedForSave);

      const enriched = (await enrichWithProvider([incoming]))[0];
      const allEnriched = await enrichWithProvider(sanitizedForSave);
      return NextResponse.json({ ok: true, service: enriched, services: allEnriched });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("services POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
