// app/api/administration/condominium-management/property/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_PATH = path.join(process.cwd(), "data", "condo_properties.json");

async function readData() {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
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
 * Validación base del checklist.
 * - Si no existe checklist, no falla.
 * - Si existe, debe ser array.
 * - Si el array existe pero no deja ningún label válido, falla.
 */
function validateChecklist(item: any) {
  if (item?.checklist == null) return { ok: true };

  if (!Array.isArray(item.checklist)) {
    return { ok: false, error: "checklist debe ser un array." };
  }

  const normalized = normalizeChecklist(item.checklist);
  if (item.checklist.length > 0 && normalized.length === 0) {
    return { ok: false, error: "checklist no puede quedar vacío." };
  }

  return { ok: true };
}

/**
 * Regla adicional: para venta de inmueble se requiere propietario o contratista
 */
function validatePropertySaleChecklist(item: any) {
  const meta = item?.meta ?? {};
  const checklist = normalizeChecklist(item?.checklist ?? []);

  const hasPropietarioMeta = !!meta?.hasPropietario;
  const contractorId = meta?.contractorId ?? meta?.contractorName ?? null;

  const hasPropietarioChecklist = checklist.some((c) =>
    ["propietario", "owner", "propietaria"].includes(String(c.label ?? "").trim().toLowerCase())
  );

  const hasContratistaChecklist = checklist.some((c) =>
    ["contratista", "contractor"].includes(String(c.label ?? "").trim().toLowerCase())
  );

  if (hasPropietarioMeta || hasPropietarioChecklist) return { ok: true };
  if (contractorId && String(contractorId).trim() !== "") return { ok: true };
  if (hasContratistaChecklist) return { ok: true };

  return {
    ok: false,
    error:
      "Venta de inmueble requiere propietario (meta.hasPropietario === true o checklist con 'propietario') o contratista (meta.contractorId / meta.contractorName o checklist con 'contratista').",
  };
}

/**
 * Normaliza/garantiza un registro property.
 * - companyId: si no existe se copia del ownerId o del id
 * - checklist: array normalizado
 */
function normalizePropertyInput(item: any) {
  const now = new Date().toISOString();
  const id = String(item?.id ?? genId());
  const ownerId = item?.ownerId ?? null;
  const companyId = item?.companyId ?? (ownerId ? String(ownerId) : id);

  const checklist = normalizeChecklist(item?.checklist ?? []);

  const price = item?.price != null ? Number(item.price) : 0;
  const bedrooms = item?.bedrooms != null ? Number(item.bedrooms) : null;
  const bathrooms = item?.bathrooms != null ? Number(item.bathrooms) : null;
  const areaSqm = item?.areaSqm != null ? Number(item.areaSqm) : null;
  const lotSize = item?.lotSize != null ? Number(item.lotSize) : null;
  const yearBuilt = item?.yearBuilt != null ? Number(item.yearBuilt) : null;
  const hoaFees = item?.hoaFees != null ? Number(item.hoaFees) : null;

  const available =
    typeof item?.available === "boolean" ? item.available : item?.available == null ? true : Boolean(item.available);

  return {
    ...item,
    id,
    type: "property",
    transaction: item?.transaction ?? null,
    companyId: String(companyId),
    ownerId,
    title: (item?.title ?? item?.name ?? "").toString(),
    name: (item?.name ?? item?.title ?? "").toString(),
    sku: item?.sku ?? null,
    price,
    address: item?.address ?? null,
    description: item?.description ?? null,
    category: item?.category ?? null,
    tags: Array.isArray(item?.tags)
      ? item.tags
      : typeof item?.tags === "string"
        ? item.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
    bedrooms,
    bathrooms,
    areaSqm,
    lotSize,
    yearBuilt,
    parking: item?.parking ?? null,
    hoaFees,
    energyRating: item?.energyRating ?? null,
    available,
    meta: item?.meta ?? {},
    checklist,
    photos: Array.isArray(item?.photos) ? item.photos : [],
    documents: Array.isArray(item?.documents) ? item.documents : [],
    createdAt: item?.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Helper para evaluar queries simples que vienen en POST { action: "find", query: {...} }
 */
function matchQuery(item: any, query: any): boolean {
  if (!query || typeof query !== "object") return true;

  if (Array.isArray(query.$or)) {
    let any = false;
    for (const q of query.$or) {
      if (!q || typeof q !== "object") continue;
      const keys = Object.keys(q);
      let ok = true;
      for (const k of keys) {
        const v = q[k];
        if (k === "id" || k === "companyId") {
          if (String(item.id) === String(v) || String(item.companyId ?? "") === String(v)) {
            ok = ok && true;
          } else {
            ok = false;
          }
        } else {
          if (String(item[k] ?? "").toLowerCase() === String(v ?? "").toLowerCase()) {
            ok = ok && true;
          } else {
            ok = false;
          }
        }
      }
      if (ok) {
        any = true;
        break;
      }
    }
    if (!any) return false;
  }

  for (const key of ["id", "companyId", "title", "name", "category", "transaction"]) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const qv = query[key];
      if (qv == null) continue;
      if (String(item[key] ?? "").toLowerCase() !== String(qv).toLowerCase()) return false;
    }
  }

  if (Object.prototype.hasOwnProperty.call(query, "done")) {
    const want = !!query.done;
    const checklist = Array.isArray(item.checklist) ? item.checklist : [];
    const found = checklist.some((c: any) => !!c?.done === want);
    if (!found) return false;
  }

  if (Object.prototype.hasOwnProperty.call(query, "q")) {
    const qLower = String(query.q ?? "").toLowerCase();
    if (qLower) {
      const hay =
        `${item.title ?? ""} ${item.name ?? ""} ${item.address ?? ""} ${item.category ?? ""}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
  }

  return true;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const transaction = url.searchParams.get("transaction");
    const companyId = url.searchParams.get("companyId");
    const id = url.searchParams.get("id");
    const q = url.searchParams.get("q");
    const checklistDone = url.searchParams.get("checklistDone");

    let items = await readData();

    // normaliza sin mutar el archivo en disco
    items = items.map((it: any) => normalizePropertyInput(it));

    if (transaction) {
      items = items.filter((i: any) => String(i.transaction ?? "") === String(transaction));
    }
    if (companyId) {
      items = items.filter((i: any) => String(i.companyId ?? "") === String(companyId));
    }
    if (id) {
      items = items.filter((i: any) => String(i.id ?? "") === String(id) || String(i.companyId ?? "") === String(id));
    }
    if (q) {
      const qLower = q.toString().toLowerCase();
      items = items.filter((it: any) =>
        `${it.title ?? ""} ${it.name ?? ""} ${it.address ?? ""} ${it.category ?? ""}`
          .toLowerCase()
          .includes(qLower)
      );
    }
    if (checklistDone === "true" || checklistDone === "false") {
      const want = checklistDone === "true";
      items = items.filter((it: any) => {
        const checklist = Array.isArray(it.checklist) ? it.checklist : [];
        return checklist.some((c: any) => !!c?.done === want);
      });
    }

    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (err: any) {
    console.error("condo property GET error:", err);
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
      const arr = Array.isArray(body.items) ? body.items : Array.isArray(body.properties) ? body.properties : data;
      const next = arr.map((it: any) => normalizePropertyInput(it));
      await writeData(next);
      return NextResponse.json({ ok: true, items: next });
    }

    // delete by id
    if (action === "delete") {
      const id = body?.id;
      if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
      const next = data.filter((i: any) => String(i.id) !== String(id) && String(i.companyId ?? "") !== String(id));
      await writeData(next);
      return NextResponse.json({ ok: true, id, items: next.map((d: any) => normalizePropertyInput(d)) });
    }

    // find action
    if (action === "find") {
      const query = body?.query ?? {};
      const normalized = data.map((d: any) => normalizePropertyInput(d));
      const items = normalized.filter((it: any) => matchQuery(it, query));
      return NextResponse.json({ ok: true, count: items.length, items });
    }

    // delete_done_false action
    // Elimina registros que coinciden por id/companyId (o query) y además tienen algún checklist item con done === false
    if (action === "delete_done_false") {
      const identifier = body?.id ?? body?.companyId ?? null;
      const query = body?.query ?? {};

      let effectiveQuery: any = {};
      if (identifier) {
        effectiveQuery.$or = [{ id: identifier }, { companyId: identifier }];
      } else if (body?.query) {
        effectiveQuery = body.query;
      } else {
        effectiveQuery = query;
      }

      effectiveQuery.done = false;

      const normalized = data.map((d: any) => normalizePropertyInput(d));
      const toRemove = normalized.filter((it: any) => matchQuery(it, effectiveQuery)).map((it: any) => String(it.id));

      if (toRemove.length === 0) {
        return NextResponse.json({ ok: true, removed: 0, ids: [], items: normalized });
      }

      const next = data.filter((d: any) => !toRemove.includes(String(d.id)));
      await writeData(next);
      return NextResponse.json({
        ok: true,
        removed: toRemove.length,
        ids: toRemove,
        items: next.map((d: any) => normalizePropertyInput(d)),
      });
    }

    // upsert_checklist: actualizar solo la checklist del inmueble
    if (action === "upsert_checklist") {
      const propertyId = body?.propertyId ?? body?.id;
      const checklistRaw = body?.checklist ?? body?.items ?? [];
      if (!propertyId) return NextResponse.json({ ok: false, error: "Missing propertyId" }, { status: 400 });

      const normalizedChecklist = normalizeChecklist(checklistRaw);

      // Si el checklist contiene algún item con done === false,
      // eliminamos cualquier registro existente que coincida por id o companyId.
      const hasDoneFalse = normalizedChecklist.some((c) => c && c.done === false);
      if (hasDoneFalse) {
        const toRemoveIds = data
          .map((d: any) => normalizePropertyInput(d))
          .filter(
            (it: any) =>
              (String(it.id) === String(propertyId) || String(it.companyId ?? "") === String(propertyId)) &&
              Array.isArray(it.checklist) &&
              it.checklist.some((c: any) => c.done === false)
          )
          .map((it: any) => String(it.id));

        const nextAfterRemove = data.filter((d: any) => !toRemoveIds.includes(String(d.id)));
        await writeData(nextAfterRemove);
        return NextResponse.json({
          ok: true,
          removed: toRemoveIds.length,
          ids: toRemoveIds,
          items: nextAfterRemove.map((d: any) => normalizePropertyInput(d)),
        });
      }

      const idx = data.findIndex(
        (d: any) => String(d.id) === String(propertyId) || String(d.companyId ?? "") === String(propertyId)
      );

      let updatedItem;
      if (idx >= 0) {
        const existing = normalizePropertyInput(data[idx]);
        updatedItem = {
          ...existing,
          checklist: normalizedChecklist,
          updatedAt: new Date().toISOString(),
        };
        data[idx] = updatedItem;
      } else {
        const now = new Date().toISOString();
        updatedItem = normalizePropertyInput({
          id: String(propertyId),
          companyId: String(propertyId),
          title: "Sin nombre",
          name: "Sin nombre",
          checklist: normalizedChecklist,
          createdAt: now,
        });
        data.unshift(updatedItem);
      }

      await writeData(data);
      return NextResponse.json({
        ok: true,
        item: normalizePropertyInput(updatedItem),
        items: data.map((d: any) => normalizePropertyInput(d)),
      });
    }

    // upsert single property record
    if (action === "upsert") {
      const item = body?.item ?? body?.property;
      if (!item || (!item.title && !item.name)) {
        return NextResponse.json({ ok: false, error: "Missing item.title (or item.name)" }, { status: 400 });
      }

      const transaction = item?.transaction ?? body?.transaction;
      if (!transaction) {
        return NextResponse.json({ ok: false, error: "Falta transaction en el body o en el item." }, { status: 400 });
      }

      // CHECKLIST OBLIGATORIO / VALIDACIÓN BASE
      const checklistValidation = validateChecklist(item);
      if (!checklistValidation.ok) {
        return NextResponse.json({ ok: false, error: checklistValidation.error }, { status: 400 });
      }

      // regla adicional para venta de property
      if (transaction === "sale") {
        const propertyChecklist = validatePropertySaleChecklist(item);
        if (!propertyChecklist.ok) {
          return NextResponse.json({ ok: false, error: propertyChecklist.error }, { status: 400 });
        }
      }

      const normalizedId = String(item.id ?? "");
      const normalizedCompanyId = String(item.companyId ?? "");
      const idx = data.findIndex(
        (d: any) =>
          (normalizedId && String(d.id) === normalizedId) ||
          (normalizedCompanyId && String(d.companyId ?? "") === normalizedCompanyId)
      );

      const callerProvidedChecklist =
        Object.prototype.hasOwnProperty.call(item, "checklist") ||
        Object.prototype.hasOwnProperty.call(item, "meta");

      const normalized = normalizePropertyInput({ ...item, transaction });

      // Si no mandan checklist pero el registro existe, preservamos la checklist anterior
      if (!callerProvidedChecklist && idx >= 0) {
        const existingChecklist = Array.isArray(data[idx].checklist) ? data[idx].checklist : [];
        normalized.checklist = normalizeChecklist(existingChecklist);
        normalized.createdAt = data[idx].createdAt ?? normalized.createdAt;
      }

      // Si el registro normalizado contiene algún checklist item con done === false,
      // eliminamos cualquier registro existente que coincida por id o companyId en vez de upsertarlo.
      const hasDoneFalseInNormalized =
        Array.isArray(normalized.checklist) && normalized.checklist.some((c: any) => c.done === false);

      if (hasDoneFalseInNormalized) {
        const toRemove = data
          .map((d: any) => normalizePropertyInput(d))
          .filter(
            (it: any) =>
              String(it.id) === String(normalized.id) || String(it.companyId ?? "") === String(normalized.companyId)
          )
          .map((it: any) => String(it.id));

        const next = data.filter((d: any) => !toRemove.includes(String(d.id)));
        await writeData(next);
        return NextResponse.json({
          ok: true,
          removed: toRemove.length,
          ids: toRemove,
          items: next.map((d: any) => normalizePropertyInput(d)),
        });
      }

      let next;
      if (idx >= 0) {
        next = [...data];
        const preservedCreatedAt = next[idx].createdAt ?? normalized.createdAt;
        next[idx] = { ...next[idx], ...normalized, createdAt: preservedCreatedAt };
      } else {
        next = [normalized, ...data];
      }

      await writeData(next);
      return NextResponse.json({
        ok: true,
        item: normalized,
        items: next.map((d: any) => normalizePropertyInput(d)),
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("condo property POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}