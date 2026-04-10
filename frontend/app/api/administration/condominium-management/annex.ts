// app/api/administration/condominium-management/annex.ts
import {
  genId,
  readData,
  writeData,
  DataKind,
  saveDataUrlToUploads,
  removeUploadedFileByUrl,
  validateChecklist,
} from "./_lib";

const KIND: DataKind = "annex";

export async function readAnnexes(): Promise<any[]> {
  return readData(KIND);
}

export async function writeAnnexes(arr: any[]) {
  return writeData(KIND, arr);
}

/**
 * Crear un anexo a partir de un dataUrl (data:<mime>;base64,...)
 * Ejemplo de input:
 *  { dataUrl, filenamePrefix?: string, meta?: {...} }
 *
 * Retorna el objeto anexo insertado.
 */
export async function createAnnexFromDataUrl(input: {
  dataUrl: string;
  filenamePrefix?: string;
  meta?: any;
}) {
  if (!input?.dataUrl) throw new Error("dataUrl requerido");
  const upload = await saveDataUrlToUploads(input.dataUrl, input.filenamePrefix ?? "annex-");
  const arr = await readData(KIND);
  const obj = {
    id: genId(),
    filename: upload.filename,
    url: upload.url,
    sizeBytes: upload.sizeBytes,
    meta: input.meta ?? {},
    createdAt: new Date().toISOString(),
  };
  arr.push(obj);
  await writeData(KIND, arr);
  return obj;
}

/**
 * Upsert genérico de anexo (usa validateChecklist si corresponde)
 */
export async function upsertAnnex(item: any) {
  // opcional: si quieres checklist, descomentar siguiente bloque
  // const v = validateChecklist(item);
  // if (!v.ok) throw new Error(v.error);

  const arr = await readData(KIND);
  const obj = { ...item };
  if (!obj.id) obj.id = genId();
  const idx = arr.findIndex((x) => x.id === obj.id);
  if (idx >= 0) arr[idx] = obj;
  else arr.push(obj);
  await writeData(KIND, arr);
  return obj;
}

export async function removeAnnex(id: string) {
  const arr = await readData(KIND);
  const idx = arr.findIndex((x) => x.id === id);
  if (idx < 0) return false;
  const [removed] = arr.splice(idx, 1);
  if (removed?.url && typeof removed.url === "string") {
    await removeUploadedFileByUrl(removed.url).catch(() => {});
  }
  await writeData(KIND, arr);
  return true;
}