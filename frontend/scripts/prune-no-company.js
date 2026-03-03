// scripts/prune-no-company.js  (ESM)
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "services.json");
const LOCK_PATH = path.join(process.cwd(), "data", "prune-no-company.lock");
const MIN_LOCK_AGE_MS = 1000 * 60 * 5; // 5 minutos

function nowTs() {
  return new Date().toISOString();
}

async function readJson(p) {
  try {
    const txt = await fs.readFile(p, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    return [];
  }
}

async function writeJson(p, obj) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(obj, null, 2), "utf8");
}

function lockExistsAndRecent() {
  try {
    if (!fsSync.existsSync(LOCK_PATH)) return false;
    const stat = fsSync.statSync(LOCK_PATH);
    const age = Date.now() - stat.mtimeMs;
    return age < MIN_LOCK_AGE_MS;
  } catch (e) {
    return false;
  }
}

async function createLock() {
  try {
    await fs.mkdir(path.dirname(LOCK_PATH), { recursive: true });
    await fs.writeFile(LOCK_PATH, `locked ${nowTs()}`, { flag: "w" });
  } catch (e) {
    // ignore
  }
}

async function removeLock() {
  try {
    if (fsSync.existsSync(LOCK_PATH)) await fs.unlink(LOCK_PATH);
  } catch (e) {
    // ignore
  }
}

/**
 * Ejecuta la poda: mantiene solo los registros con companyId no vacío.
 * Devuelve objeto { originalCount, keptCount, removedCount }
 */
export async function runPruneNoCompany() {
  // permitir desactivar via env var
  if (String(process.env.PRUNE_DISABLED ?? "false").toLowerCase() === "true") {
    console.log("[prune] PRUNE_DISABLED=true -> skipping prune");
    return { skipped: true };
  }

  if (lockExistsAndRecent()) {
    console.log("[prune] lock presente y reciente -> skipping");
    return { skipped: true };
  }

  await createLock();
  try {
    const arr = await readJson(DATA_PATH);
    const originalCount = Array.isArray(arr) ? arr.length : 0;

    // backup
    const bakPath = DATA_PATH + `.bak.${Date.now()}`;
    try {
      await writeJson(bakPath, arr);
      console.log(`[prune] backup creado: ${bakPath}`);
    } catch (e) {
      console.warn("[prune] no se pudo crear backup:", e?.message ?? e);
    }

    // filtrar: mantener solo los que tienen companyId no vacío
    const filtered = (arr || []).filter((it) => {
      const companyIdVal = it.companyId ?? "";
      return companyIdVal && String(companyIdVal).trim() !== "";
    });

    await writeJson(DATA_PATH, filtered);

    const kept = filtered.length;
    const removed = originalCount - kept;
    console.log(`[prune] ${nowTs()} - original: ${originalCount}, kept: ${kept}, removed: ${removed}`);

    return { originalCount, kept, removed };
  } catch (err) {
    console.error("[prune] error ejecutando prune:", err);
    throw err;
  } finally {
    await removeLock();
  }
}

/**
 * Auto-ejecución al import: por defecto se ejecuta una vez (no bloqueante).
 * Para desactivarlo, exporta la función y/o pone PRUNE_RUN_ON_IMPORT=false
 */
if (String(process.env.PRUNE_RUN_ON_IMPORT ?? "true").toLowerCase() !== "false") {
  // no bloqueamos la importación: lanzamos la tarea y capturamos errores
  void runPruneNoCompany().catch((e) => {
    console.error("[prune] runPruneNoCompany fallo en auto-run:", e?.message ?? e);
  });
}
