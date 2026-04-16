// app/api/administration/auxiliary/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_PATH = path.join(process.cwd(), "data", "auxiliaries.json");

async function readData() {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function writeData(arr: any[]) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8");
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function genChecklistId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normaliza una lista de items de checklist.
 * Acepta array de strings o array de objetos.
 * Resultado: array de objetos { id, label, done, meta, createdAt, updatedAt }.
 */
function normalizeChecklist(items: any): any[] {
  const now = new Date().toISOString();
  if (!Array.isArray(items)) return [];

  const mapped = items
    .filter((x) => x !== undefined && x !== null)
    .map((it: any) => {
      if (typeof it === "string" || typeof it === "number") {
        const s = String(it).trim();
        return {
          id: genChecklistId(),
          label: s,
          done: false,
          meta: {},
          createdAt: now,
          updatedAt: now,
        };
      }

      const id = it?.id ? String(it.id) : genChecklistId();
      const label = (it?.label ?? it?.name ?? "").toString();
      const done = !!it?.done;
      const createdAt = it?.createdAt ?? now;
      const updatedAt = now;
      const meta = it?.meta ?? {};
      return { id, label, done, meta, createdAt, updatedAt };
    })
    .filter((x) => (typeof x.label === "string" ? x.label.trim().length > 0 : true));

  // dedupe por label (case-insensitive) + done + JSON(meta)
  const map = new Map<string, any>();
  for (const m of mapped) {
    const key = `${String(m.label).toLowerCase()}|${m.done ? "1" : "0"}|${JSON.stringify(m.meta || {})}`;
    if (!map.has(key)) map.set(key, m);
  }
  return Array.from(map.values());
}

/**
 * Normaliza/garantiza un registro auxiliar.
 * - role: "PROVEEDOR" | "CLIENTE" | otros (por default "PROVEEDOR")
 * - companyId: si no existe se copia el id (así siempre hay companyId)
 * - checklist: array normalizado (ver normalizeChecklist)
 * - actividadEconomica: campo nuevo
 * - condicionRetencion: campo nuevo
 *
 * ADICIONAL: si el objeto trae flags como isCopropietario / isProveedorContratista
 * los convertimos en items de checklist (con meta.defaultTargets).
 */
function normalizeAux(item: any) {
  const now = new Date().toISOString();
  const id = String(item.id ?? genId());
  const role = (item.role ?? "PROVEEDOR").toString().toUpperCase();
  const companyId = item.companyId ?? id;

  // base checklist normalizada (si viene como lista)
  let checklist = normalizeChecklist(item.checklist ?? []);

  // Si vienen flags específicos desde el formulario, los añadimos como items
  if (item?.isCopropietario) {
    checklist.push({
      id: genChecklistId(),
      label: "copropietario",
      done: true,
      meta: { defaultTargets: ["SERVICIOS", "PRODUCTOS", "INMUEBLES"] },
      createdAt: now,
      updatedAt: now,
    });
  }

  if (item?.isProveedorContratista) {
    checklist.push({
      id: genChecklistId(),
      label: "contratista",
      done: true,
      meta: { defaultTargets: ["SERVICIOS", "PRODUCTOS", "INMUEBLES"] },
      createdAt: now,
      updatedAt: now,
    });
  }

  // dedupe final por label (case-insensitive) manteniendo el primero
  const finalMap = new Map<string, any>();
  for (const c of checklist) {
    const key = String(c.label ?? "").toLowerCase();
    if (!finalMap.has(key)) finalMap.set(key, c);
    else {
      const existing = finalMap.get(key);
      existing.done = existing.done || c.done;
      existing.meta = { ...(existing.meta || {}), ...(c.meta || {}) };
      existing.updatedAt = now;
      finalMap.set(key, existing);
    }
  }
  checklist = Array.from(finalMap.values());

  return {
    ...item,
    id,
    companyId: String(companyId),
    role,
    partyType: item.partyType ?? null,
    name: (item.name ?? "").toString(),
    rif: item.rif ?? item.nit ?? null,
    nit: item.nit ?? null,
    phone: item.phone ?? null,
    email: item.email ?? null,
    address: item.address ?? null,
    city: item.city ?? null,
    country: item.country ?? null,

    actividadEconomica:
      item.actividadEconomica ??
      item.activityEconomica ??
      item.actividad_economica ??
      null,

    condicionRetencion:
      item.condicionRetencion ??
      item.retentionCondition ??
      item.condicion_retencion ??
      null,

    meta: item.meta ?? {},
    checklist,
    createdAt: item.createdAt ?? now,
    updatedAt: now,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role"); // filter by role
    const companyId = url.searchParams.get("companyId");
    const id = url.searchParams.get("id");
    const q = url.searchParams.get("q"); // simple text search in name

    let items = await readData();

    // devolver items normalizados sin mutar el archivo en disco
    items = items.map((it: any) => normalizeAux(it));

    if (role) {
      items = items.filter(
        (it: any) => String((it.role ?? "").toString()).toUpperCase() === String(role).toUpperCase()
      );
    }
    if (companyId) {
      items = items.filter((it: any) => String(it.companyId ?? "") === String(companyId));
    }
    if (id) {
      items = items.filter(
        (it: any) =>
          String(it.id ?? "") === String(id) || String(it.companyId ?? "") === String(id)
      );
    }
    if (q) {
      const qLower = q.toString().toLowerCase();
      items = items.filter((it: any) => (it.name ?? "").toString().toLowerCase().includes(qLower));
    }

    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (err: any) {
    console.error("auxiliary GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = (body?.action ?? "upsert").toString();
    const data = await readData();

    // replace full dataset
    if (action === "replace") {
      const arr = Array.isArray(body.items)
        ? body.items
        : Array.isArray(body.auxiliaries)
          ? body.auxiliaries
          : data;

      const next = arr.map((it: any) => normalizeAux(it));
      await writeData(next);
      return NextResponse.json({ ok: true, items: next });
    }

    // delete by id
    if (action === "delete") {
      const id = body?.id;
      if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

      const next = data.filter(
        (i: any) => String(i.id) !== String(id) && String(i.companyId ?? "") !== String(id)
      );
      await writeData(next);
      return NextResponse.json({ ok: true, id, items: next });
    }

    // upsert_checklist: actualizar solo la checklist de un party
    if (action === "upsert_checklist") {
      const partyId = body?.partyId ?? body?.id;
      const checklistRaw = body?.checklist ?? body?.items ?? [];
      if (!partyId) {
        return NextResponse.json({ ok: false, error: "Missing partyId" }, { status: 400 });
      }

      const normalizedChecklist = normalizeChecklist(checklistRaw);

      // buscar por id o companyId
      const idx = data.findIndex(
        (d: any) => String(d.id) === String(partyId) || String(d.companyId ?? "") === String(partyId)
      );

      let updatedItem;
      if (idx >= 0) {
        const existing = data[idx];
        updatedItem = {
          ...existing,
          checklist: normalizedChecklist,
          updatedAt: new Date().toISOString(),
        };
        data[idx] = updatedItem;
      } else {
        const now = new Date().toISOString();
        updatedItem = normalizeAux({
          id: String(partyId),
          companyId: String(partyId),
          name: "Sin nombre",
          checklist: normalizedChecklist,
          createdAt: now,
        });
        data.unshift(updatedItem);
      }

      await writeData(data);
      return NextResponse.json({
        ok: true,
        item: normalizeAux(updatedItem),
        items: data.map((d: any) => normalizeAux(d)),
      });
    }

    // upsert single auxiliary record (posible item.checklist incluido)
    if (action === "upsert") {
      const item = body?.item ?? body?.auxiliary;
      if (!item || (!item.name && !(item.firstName || item.lastName || item.companyName))) {
        // allow when name is constructed client-side, so error only when nothing at all
        return NextResponse.json({ ok: false, error: "Missing item.name" }, { status: 400 });
      }

      const providedRole = item.role ? String(item.role).toUpperCase() : "PROVEEDOR";

      const normalizedId = String(item.id ?? "");
      const normalizedCompanyId = String(item.companyId ?? "");
      const idx = data.findIndex(
        (d: any) =>
          (normalizedId && String(d.id) === normalizedId) ||
          (normalizedCompanyId && String(d.companyId ?? "") === normalizedCompanyId)
      );

      // keep track if caller explicitly provided checklist OR provided flags that imply checklist changes
      const callerProvidedChecklist =
        Object.prototype.hasOwnProperty.call(item, "checklist") ||
        Object.prototype.hasOwnProperty.call(item, "isCopropietario") ||
        Object.prototype.hasOwnProperty.call(item, "isProveedorContratista");

      // build normalized object
      const normalized = normalizeAux({ ...item, role: providedRole });

      // If the caller DID NOT provide a checklist (nor flags) but the record exists, preserve existing checklist
      if (!callerProvidedChecklist && idx >= 0) {
        const existingChecklist = Array.isArray(data[idx].checklist) ? data[idx].checklist : [];
        normalized.checklist = normalizeChecklist(existingChecklist);
        normalized.createdAt = data[idx].createdAt ?? normalized.createdAt;
      }

      let next;
      if (idx >= 0) {
        next = [...data];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...data];
      }

      await writeData(next);
      return NextResponse.json({ ok: true, item: normalized, items: next.map((d: any) => normalizeAux(d)) });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("auxiliary POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}