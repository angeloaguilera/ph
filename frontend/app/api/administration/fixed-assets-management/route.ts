// app/api/administration/fixed-assets-management/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_PATH = path.join(process.cwd(), "data", "fixed-assets.json");

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    let items = await readData();
    if (q) {
      const ql = q.toLowerCase();
      items = items.filter((a: any) => (a.name ?? "").toLowerCase().includes(ql) || (a.tag ?? "").toLowerCase().includes(ql));
    }
    return NextResponse.json({ ok: true, assets: items });
  } catch (err: any) {
    console.error("fixed-assets GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action ?? "upsert";
    const data = await readData();

    if (action === "replace") {
      const arr = Array.isArray(body.assets) ? body.assets : data;
      const next = arr.map((it: any) => ({ ...it, id: it.id ?? genId(), updatedAt: it.updatedAt ?? new Date().toISOString() }));
      await writeData(next);
      return NextResponse.json({ ok: true, assets: next });
    }

    if (action === "delete") {
      const id = body?.id;
      if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
      const next = data.filter((i: any) => String(i.id) !== String(id));
      await writeData(next);
      return NextResponse.json({ ok: true, id, assets: next });
    }

    if (action === "upsert") {
      const asset = body?.asset;
      if (!asset || !asset.name) return NextResponse.json({ ok: false, error: "Missing asset.name" }, { status: 400 });

      const normalized = {
        id: String(asset.id ?? genId()),
        name: asset.name,
        description: asset.description ?? "",
        acquisitionDate: asset.acquisitionDate ?? new Date().toISOString(),
        acquisitionValue: Number(asset.acquisitionValue ?? 0),
        depreciationRate: Number(asset.depreciationRate ?? 0), // percent per year
        usefulLifeYears: Number(asset.usefulLifeYears ?? 0),
        accountId: asset.accountId ?? null,
        quantity: Number(asset.quantity ?? 1),
        location: asset.location ?? null,
        providerId: asset.providerId ?? null,
        createdAt: asset.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meta: asset.meta ?? {},
      };

      const idx = data.findIndex((d: any) => String(d.id) === String(normalized.id));
      let next;
      if (idx >= 0) {
        next = [...data];
        next[idx] = { ...next[idx], ...normalized };
      } else {
        next = [normalized, ...data];
      }

      await writeData(next);
      return NextResponse.json({ ok: true, asset: normalized, assets: next });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("fixed-assets POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
