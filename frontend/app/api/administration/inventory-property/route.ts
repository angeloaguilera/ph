// api/administration/inventory-property/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const DATA_PATH = path.join(process.cwd(), "data", "inventory-properties.json");

async function readData(filePath: string) {
  try {
    const txt = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("[inventory-property] readData - returning empty due to error:", (e as any)?.message ?? e);
    return [];
  }
}

async function writeData(filePath: string, arr: any[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(arr, null, 2), "utf-8");
  console.log("[inventory-property] writeData - wrote", arr.length, "records to", filePath);
}

function genId() {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function normalizePropertyInput(it: any) {
  // Normaliza un objeto entrante hacia el shape esperado para almacenamiento
  const ownerId = it.ownerId ?? null;
  const price = Number(it.price ?? 0);
  const bedrooms = it.bedrooms != null ? Number(it.bedrooms) : null;
  const bathrooms = it.bathrooms != null ? Number(it.bathrooms) : null;
  const areaSqm = it.areaSqm != null ? Number(it.areaSqm) : null;
  const lotSize = it.lotSize != null ? Number(it.lotSize) : null;
  const yearBuilt = it.yearBuilt != null ? Number(it.yearBuilt) : null;
  const hoaFees = it.hoaFees != null ? Number(it.hoaFees) : null;
  const available = typeof it.available === "boolean" ? it.available : it.available == null ? true : Boolean(it.available);

  return {
    id: String(it.id ?? genId()),
    // <-- Aceptamos title o name como fallback
    title: it.title ?? it.name ?? "",
    sku: it.sku ?? null,
    price,
    address: it.address ?? null,
    ownerId,
    // companyId incluido aquí para que TypeScript lo vea en el tipo devuelto
    companyId: it.companyId ?? (ownerId ? String(ownerId) : ""),
    description: it.description ?? null,
    category: it.category ?? null,
    tags: Array.isArray(it.tags) ? it.tags : (typeof it.tags === "string" ? it.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []),
    bedrooms,
    bathrooms,
    areaSqm,
    lotSize,
    yearBuilt,
    parking: it.parking ?? null,
    hoaFees,
    energyRating: it.energyRating ?? null,
    available,
    meta: it.meta ?? {},
    photos: Array.isArray(it.photos) ? it.photos : [],
    documents: Array.isArray(it.documents) ? it.documents : [],
    createdAt: it.createdAt ?? new Date().toISOString(),
    updatedAt: it.updatedAt ?? new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerId = url.searchParams.get("ownerId");
    const companyId = url.searchParams.get("companyId"); // opcional por compatibilidad
    const category = url.searchParams.get("category");
    const title = url.searchParams.get("title");

    console.log("[inventory-property] GET received", {
      url: req.url,
      ownerId,
      companyId,
      category,
      title,
      timestamp: new Date().toISOString(),
    });

    let items = await readData(DATA_PATH);

    if (ownerId) {
      items = items.filter((i: any) => String(i.ownerId ?? "") === String(ownerId));
    }
    if (companyId) {
      items = items.filter((i: any) => String(i.companyId ?? "") === String(companyId));
    }
    if (category) {
      items = items.filter((i: any) => String(i.category ?? "").toLowerCase() === String(category).toLowerCase());
    }
    if (title) {
      const q = String(title).toLowerCase();
      items = items.filter((i: any) => String(i.title ?? "").toLowerCase().includes(q));
    }

    return NextResponse.json({ ok: true, properties: items, count: items.length });
  } catch (err: any) {
    console.error("[inventory-property] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[inventory-property] POST received", {
      url: req.url,
      body,
      timestamp: new Date().toISOString(),
    });

    const action = body?.action ?? "upsert";
    const data = await readData(DATA_PATH);

    if (action === "replace") {
      const arr = Array.isArray(body.items) ? body.items : data;
      const next = arr.map((it: any) => {
        const normalized = normalizePropertyInput(it);
        return normalized;
      });
      await writeData(DATA_PATH, next);
      console.log("[inventory-property] POST replace -> OK");
      return NextResponse.json({ ok: true, properties: next });
    }

    if (action === "delete") {
      const id = body?.id;
      if (!id) {
        console.warn("[inventory-property] POST delete missing id");
        return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
      }
      const next = (data as any[]).filter((i: any) => String(i.id) !== String(id));
      await writeData(DATA_PATH, next);
      console.log("[inventory-property] POST delete -> OK id=", id);
      return NextResponse.json({ ok: true, id, properties: next });
    }

    if (action === "upsert") {
      const item = body?.item;

      // <-- Aceptar title o name para evitar 400
      const incomingTitle = item?.title ?? item?.name ?? "";

      if (!item || !incomingTitle || String(incomingTitle).trim() === "") {
        console.warn("[inventory-property] POST upsert missing item.title or item.name");
        return NextResponse.json({ ok: false, error: "Missing item.title (or item.name)" }, { status: 400 });
      }

      // ahora normalizePropertyInput ya toma title desde name si hace falta
      const normalized = normalizePropertyInput(item);

      const idx = data.findIndex((d: any) => String(d.id) === String(normalized.id));
      let next;
      if (idx >= 0) {
        // preservar createdAt del registro existente
        next = [...data];
        const preservedCreatedAt = next[idx].createdAt ?? normalized.createdAt;
        next[idx] = { ...next[idx], ...normalized, createdAt: preservedCreatedAt };
      } else {
        next = [normalized, ...data];
      }

      await writeData(DATA_PATH, next);
      console.log("[inventory-property] POST upsert -> OK id=", normalized.id);
      return NextResponse.json({ ok: true, property: normalized, properties: next });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[inventory-property] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}