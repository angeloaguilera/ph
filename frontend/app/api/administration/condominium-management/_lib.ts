import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/* ------------------ Identificadores ------------------ */
export function genId() {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

/* ------------------ Rutas de datos ------------------ */
/**
 * kind soportados: property, article, service, auxiliary, annex
 */
export type DataKind = "property" | "article" | "service" | "auxiliary" | "annex";

/** Todos los kinds disponibles (útil para inicialización) */
export const ALL_DATA_KINDS: DataKind[] = [
  "property",
  "article",
  "service",
  "auxiliary",
  "annex",
];

export function dataFilePathFor(kind: DataKind) {
  const base = path.join(process.cwd(), "data", "condominium-management");
  return path.join(base, `${kind}.json`);
}

/* ------------------ Lectura / Escritura genérica ------------------ */
export async function readData(kind: DataKind): Promise<any[]> {
  const DATA_PATH = dataFilePathFor(kind);
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeData(kind: DataKind, arr: any[]) {
  const DATA_PATH = dataFilePathFor(kind);
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8");
}

/**
 * Crea los ficheros data/condominium-management/{kind}.json con "[]"
 * si no existen todavía. También asegura el directorio de uploads.
 */
export async function ensureDataFilesExist() {
  const dataDir = path.join(process.cwd(), "data", "condominium-management");
  await fs.mkdir(dataDir, { recursive: true });

  for (const kind of ALL_DATA_KINDS) {
    const p = dataFilePathFor(kind);
    try {
      await fs.access(p);
    } catch {
      await fs.writeFile(p, "[]", "utf-8");
    }
  }

  await ensureUploadsDir();
}

/* ------------------ Uploads públicos (data URL helpers) ------------------ */
export const UPLOADS_SUBDIR = path.join("uploads", "condominium-management");
export const UPLOADS_DIR = path.join(process.cwd(), "public", UPLOADS_SUBDIR);

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

/** Decodifica data URL (data:<mime>;base64,<data>) -> { mime, buffer, ext } */
function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1];
  const b64 = match[2];
  const buffer = Buffer.from(b64, "base64");
  let ext = "bin";
  if (mime === "application/pdf") ext = "pdf";
  else if (mime.startsWith("image/")) {
    const guessed = mime.split("/")[1];
    if (guessed === "jpeg") ext = "jpg";
    else ext = guessed;
  }
  return { mime, buffer, ext };
}

/**
 * Guarda un dataURL como archivo dentro de public/uploads/condominium-management
 * Retorna { url, filename, sizeBytes }
 */
export async function saveDataUrlToUploads(
  dataUrl: string,
  filenamePrefix = "file-"
) {
  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("dataUrl string required");
  }

  const { buffer, ext } = decodeDataUrl(dataUrl);
  await ensureUploadsDir();

  const filename = `${filenamePrefix}${genId()}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filepath, buffer);

  const url = `/${path
    .join(UPLOADS_SUBDIR, filename)
    .replace(/\\/g, "/")}`;

  return { url, filename, sizeBytes: buffer.length };
}

/**
 * Borra un fichero público por su url pública.
 */
export async function removeUploadedFileByUrl(url: string) {
  if (!url || typeof url !== "string") return;

  const normalized = url.replace(/\\/g, "/");
  if (
    !normalized.startsWith(`/${UPLOADS_SUBDIR}`) &&
    !normalized.startsWith(UPLOADS_SUBDIR)
  ) {
    return;
  }

  const filename = normalized.replace(/^\//, "").replace(`${UPLOADS_SUBDIR}/`, "");
  const filepath = path.join(process.cwd(), "public", UPLOADS_SUBDIR, filename);

  try {
    await fs.unlink(filepath);
  } catch {
    // ignore
  }
}

/* ------------------ Reglas de checklist ------------------ */
/**
 * Esta validación la dejo disponible para otros módulos.
 * Si quieres usarla en servicios, solo aplícala desde el route.
 */
export function validateChecklist(obj: any) {
  const meta = obj?.meta ?? {};
  const checklist = meta?.checklist;

  if (!checklist || typeof checklist !== "object") {
    return {
      ok: false,
      error:
        "Falta meta.checklist (objeto) obligatorio para todas las operaciones.",
    };
  }

  if (checklist.approved !== true) {
    return {
      ok: false,
      error: "El checklist debe marcar approved: true para ser aceptado.",
    };
  }

  const approvedBy = String(checklist.approvedBy ?? "").trim();
  if (!approvedBy) {
    return {
      ok: false,
      error:
        "El checklist debe incluir approvedBy (usuario/identificador que aprobó).",
    };
  }

  return { ok: true };
}

/* ------------------ Utilidades adicionales ------------------ */
export async function ensureDataAndUploadsDirs() {
  const dataDir = path.join(process.cwd(), "data", "condominium-management");
  await fs.mkdir(dataDir, { recursive: true });
  await ensureUploadsDir();
}