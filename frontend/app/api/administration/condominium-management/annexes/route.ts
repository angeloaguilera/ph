import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type Annex = {
  id: string;
  name: string;
  companyId?: string | null;
  url?: string;
  fromCatalog?: boolean;
  catalogRefId?: string | null;
  description?: string;
  tags?: string[];
  type?: "contrato" | "plano" | "permiso" | "cedula" | "recibo" | "otro";
  date?: string | null;
  expiresAt?: string | null;
  private?: boolean;
  notes?: string;
  uploadedBy?: string | null;
  sizeBytes?: number | null;
  createdAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const ANNEXES_FILE = path.join(DATA_DIR, "annexes.json");
const CATALOG_FILE = path.join(DATA_DIR, "catalog.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

/* ---------------- helpers ---------------- */
async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  // Ensure files exist
  try {
    await fs.access(ANNEXES_FILE);
  } catch {
    await fs.writeFile(ANNEXES_FILE, "[]", "utf8");
  }
  try {
    await fs.access(CATALOG_FILE);
  } catch {
    // sample catalog initial (id, name, url optional)
    const sample = [
      { id: "catalog-1", name: "Modelo de Contrato A", companyId: null, url: "" },
      { id: "catalog-2", name: "Plano eléctrico", companyId: null, url: "" }
    ];
    await fs.writeFile(CATALOG_FILE, JSON.stringify(sample, null, 2), "utf8");
  }
}

function genId(prefix = "") {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

async function loadAnnexes(): Promise<Annex[]> {
  await ensureDirs();
  const raw = await fs.readFile(ANNEXES_FILE, "utf8");
  try {
    return JSON.parse(raw) as Annex[];
  } catch {
    return [];
  }
}

async function saveAnnexes(list: Annex[]) {
  await ensureDirs();
  await fs.writeFile(ANNEXES_FILE, JSON.stringify(list, null, 2), "utf8");
}

async function loadCatalog(): Promise<{ id: string; name: string; companyId?: string | null; url?: string | undefined }[]> {
  await ensureDirs();
  const raw = await fs.readFile(CATALOG_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** decode data URL like data:<mime>;base64,<data> -> {mime, buffer, ext} */
function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1];
  const b64 = match[2];
  const buffer = Buffer.from(b64, "base64");
  let ext = "bin";
  if (mime === "application/pdf") ext = "pdf";
  else if (mime.startsWith("image/")) ext = mime.split("/")[1];
  return { mime, buffer, ext };
}

/* ---------------- Route handlers ---------------- */

/**
 * GET: list anexos (query ?catalog=true returns catalog also)
 * POST:
 *   - create new anexo (JSON body).
 *   - if query ?action=attach&catalogId=... => attach from catalog (returns partial DocItem)
 * DELETE: delete by id (?id=...)
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qcatalog = url.searchParams.get("catalog");
    const annexes = await loadAnnexes();
    if (qcatalog === "true") {
      const catalog = await loadCatalog();
      return NextResponse.json({ annexes, catalog });
    }
    return NextResponse.json(annexes);
  } catch (err: any) {
    console.error("GET annexes error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "";

    if (action === "attach") {
      // attach from catalog: expects ?catalogId=...
      const catalogId = url.searchParams.get("catalogId");
      if (!catalogId) return NextResponse.json({ error: "catalogId required" }, { status: 400 });
      const catalog = await loadCatalog();
      const item = catalog.find((c) => c.id === catalogId);
      if (!item) return NextResponse.json({ error: "catalog item not found" }, { status: 404 });

      // Create an Annex entry that references catalog but do not duplicate file.
      const annexes = await loadAnnexes();
      const newAnnex: Annex = {
        id: genId("cat-"),
        name: item.name,
        url: item.url ?? undefined,
        fromCatalog: true,
        catalogRefId: catalogId,
        createdAt: new Date().toISOString()
      };
      annexes.push(newAnnex);
      await saveAnnexes(annexes);

      // Return partial DocItem expected by AnnexesRow.addAttachmentFromCatalog
      const partial = {
        id: newAnnex.id,
        name: newAnnex.name,
        url: newAnnex.url,
        fromCatalog: true,
        catalogRefId: catalogId,
      };
      return NextResponse.json(partial, { status: 201 });
    }

    // Default: create an annex entry
    // Expect JSON body:
    // { name, url?, fileDataUrl?, description?, tags?, type?, date?, expiresAt?, private?, notes?, uploadedBy? }
    const body = await req.json();
    const name = String((body.name ?? "").trim());
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    let urlPublic: string | undefined = undefined;
    let sizeBytes: number | null = null;

    if (body.fileDataUrl) {
      // decode and save to public/uploads
      try {
        const { buffer, ext } = decodeDataUrl(String(body.fileDataUrl));
        const id = genId("file-");
        const filename = `${id}.${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        await fs.writeFile(filepath, buffer);
        // public URL
        urlPublic = `/uploads/${filename}`;
        sizeBytes = buffer.length;
      } catch (e) {
        console.error("error decoding fileDataUrl", e);
        return NextResponse.json({ error: "Invalid fileDataUrl" }, { status: 400 });
      }
    } else if (body.url) {
      urlPublic = String(body.url).trim();
    }

    const newAnnex: Annex = {
      id: genId("new-"),
      name,
      url: urlPublic,
      fromCatalog: false,
      catalogRefId: null,
      description: body.description ?? undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      type: (body.type as Annex["type"]) ?? undefined,
      date: body.date ?? null,
      expiresAt: body.expiresAt ?? null,
      private: !!body.private,
      notes: body.notes ?? undefined,
      uploadedBy: body.uploadedBy ?? null,
      sizeBytes,
      createdAt: new Date().toISOString(),
    };

    const annexes = await loadAnnexes();
    annexes.push(newAnnex);
    await saveAnnexes(annexes);

    return NextResponse.json(newAnnex, { status: 201 });
  } catch (err: any) {
    console.error("POST annexes error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    // allow query param id
    const idFromQuery = url.searchParams.get("id");
    let id: string | null = idFromQuery;
    if (!id) {
      // or JSON body { id }
      try {
        const body = await req.json();
        id = body?.id ?? null;
      } catch {
        id = null;
      }
    }

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const annexes = await loadAnnexes();
    const idx = annexes.findIndex((a) => a.id === id);
    if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

    const item = annexes[idx];

    // If file saved in uploads and fromCatalog === false, attempt remove file (best-effort)
    if (item.url && item.url.startsWith("/uploads/") && !item.fromCatalog) {
      const filename = item.url.replace("/uploads/", "");
      const fp = path.join(UPLOADS_DIR, filename);
      try {
        await fs.unlink(fp);
      } catch (e) {
        // ignore file removal errors
      }
    }

    annexes.splice(idx, 1);
    await saveAnnexes(annexes);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE annexes error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}