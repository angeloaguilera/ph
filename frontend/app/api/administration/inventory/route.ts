// app/api/administration/inventory/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const DATA_PATH = path.join(process.cwd(), "data", "inventory.json");

async function readData(filePath: string) {
  try {
    const txt = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("[inventory] readData - returning empty due to error:", e?.message ?? e);
    return [];
  }
}

async function writeData(filePath: string, arr: any[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(arr, null, 2), "utf-8");
  console.log("[inventory] writeData - wrote", arr.length, "records to", filePath);
}

function genId() {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const providerId = url.searchParams.get("providerId");
    const companyId = url.searchParams.get("companyId");

    console.log("[inventory] GET received", {
      url: req.url,
      providerId,
      companyId,
      timestamp: new Date().toISOString(),
    });

    let items = await readData(DATA_PATH);

    if (providerId) {
      items = items.filter((i: any) => String(i.providerId ?? "") === String(providerId));
    }
    if (companyId) {
      items = items.filter((i: any) => String(i.companyId ?? "") === String(companyId));
    }

    return NextResponse.json({ ok: true, inventory: items, count: items.length });
  } catch (err: any) {
    console.error("[inventory] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[inventory] POST received", {
      url: req.url,
      headers: Object.fromEntries((req as any).headers ? (req as any).headers.entries() : []),
      body,
      timestamp: new Date().toISOString(),
    });

    const action = body?.action ?? "upsert";
    const data = await readData(DATA_PATH);

    if (action === "replace") {
      const arr = Array.isArray(body.items) ? body.items : data;
      const next = arr.map((it: any) => {
        const id = String(it.id ?? genId());
        return {
          ...it,
          id,
          companyId: it.companyId ?? (it.providerId ? String(it.providerId) : ""),
          providerId: it.providerId ?? null,
          sourceRole: it.sourceRole ?? null,
          sku: it.sku ?? null,
          price: Number(it.price ?? 0),
          quantity: Number(it.quantity ?? 0),
          meta: it.meta ?? {},
          createdAt: it.createdAt ?? new Date().toISOString(),
          updatedAt: it.updatedAt ?? new Date().toISOString(),
        };
      });
      await writeData(DATA_PATH, next);
      console.log("[inventory] POST replace -> OK");
      return NextResponse.json({ ok: true, inventory: next });
    }

    if (action === "delete") {
      const id = body?.id;
      if (!id) {
        console.warn("[inventory] POST delete missing id");
        return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
      }
      const next = (data as any[]).filter((i: any) => String(i.id) !== String(id));
      await writeData(DATA_PATH, next);
      console.log("[inventory] POST delete -> OK id=", id);
      return NextResponse.json({ ok: true, id, inventory: next });
    }

    if (action === "upsert") {
      const item = body?.item;
      if (!item || !item.name || !String(item.name).trim()) {
        console.warn("[inventory] POST upsert missing item.name");
        return NextResponse.json({ ok: false, error: "Missing item.name" }, { status: 400 });
      }

      const id = String(item.id ?? genId());
      const providerId = item.providerId ?? null;
      const companyId = item.companyId ?? (providerId ? String(providerId) : "");

      const normalized = {
        id,
        name: item.name,
        sku: item.sku ?? null,
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 0),
        providerId,
        sourceRole: item.sourceRole ?? null,
        companyId,
        category: item.category ?? null,
        specs: item.specs ?? {},
        photos: item.photos ?? [],
        meta: item.meta ?? {},
        createdAt: item.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const idx = data.findIndex((d: any) => String(d.id) === String(normalized.id));
      let next;
      if (idx >= 0) {
        // preserve createdAt from existing
        next = [...data];
        const preservedCreatedAt = next[idx].createdAt ?? normalized.createdAt;
        next[idx] = { ...next[idx], ...normalized, createdAt: preservedCreatedAt };
      } else {
        next = [normalized, ...data];
      }

      await writeData(DATA_PATH, next);
      console.log("[inventory] POST upsert -> OK id=", id);
      return NextResponse.json({ ok: true, item: normalized, inventory: next });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[inventory] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
