// app/api/administration/auxiliary/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// file shared for both clients and suppliers
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

/**
 * Normaliza/garantiza un registro auxiliar.
 * - role: "PROVEEDOR" | "CLIENTE" | otros (por default "PROVEEDOR" para compatibilidad)
 * - companyId: si no existe se copia el id (así siempre hay companyId)
 */
function normalizeAux(item: any) {
  const now = new Date().toISOString();
  const id = String(item.id ?? genId());
  const role = (item.role ?? "PROVEEDOR").toString().toUpperCase();
  const companyId = item.companyId ?? id;

  return {
    ...item,
    id,
    companyId: String(companyId),
    role,
    name: (item.name ?? "").toString(),
    rif: item.rif ?? item.nit ?? null,
    nit: item.nit ?? null,
    phone: item.phone ?? null,
    email: item.email ?? null,
    address: item.address ?? null,
    city: item.city ?? null,
    country: item.country ?? null,
    meta: item.meta ?? {},
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

    if (role) {
      items = items.filter((it: any) => String((it.role ?? "").toString()).toUpperCase() === String(role).toUpperCase());
    }
    if (companyId) {
      items = items.filter((it: any) => String(it.companyId ?? "") === String(companyId));
    }
    if (id) {
      items = items.filter((it: any) => String(it.id ?? "") === String(id) || String(it.companyId ?? "") === String(id));
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
      const arr = Array.isArray(body.items) ? body.items : Array.isArray(body.auxiliaries) ? body.auxiliaries : data;
      const next = arr.map((it: any) => normalizeAux(it));
      await writeData(next);
      return NextResponse.json({ ok: true, items: next });
    }

    // delete by id
    if (action === "delete") {
      const id = body?.id;
      if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
      const next = data.filter((i: any) => String(i.id) !== String(id) && String(i.companyId ?? "") !== String(id));
      await writeData(next);
      return NextResponse.json({ ok: true, id, items: next });
    }

    // upsert single auxiliary record
    if (action === "upsert") {
      const item = body?.item ?? body?.auxiliary;
      if (!item || !item.name) return NextResponse.json({ ok: false, error: "Missing item.name" }, { status: 400 });

      // preserve provided role if any, otherwise default to PROVEEDOR for backward compat
      const providedRole = item.role ? String(item.role).toUpperCase() : "PROVEEDOR";

      // create normalized object (this will set id/companyId/createdAt/updatedAt)
      const normalized = normalizeAux({ ...item, role: providedRole });

      // find existing by id or by companyId
      const idx = data.findIndex((d: any) => String(d.id) === String(normalized.id) || String(d.companyId ?? "") === String(normalized.companyId));
      let next;
      if (idx >= 0) {
        next = [...data];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...data];
      }

      await writeData(next);
      return NextResponse.json({ ok: true, item: normalized, items: next });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("auxiliary POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
