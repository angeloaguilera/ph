// app/api/administration/condominium-management/auxiliary.ts
import { genId, readData, writeData, validateChecklist, DataKind, removeUploadedFileByUrl } from "./_lib";

const KIND: DataKind = "auxiliary";

export async function readAuxiliaries(): Promise<any[]> {
  return readData(KIND);
}

export async function writeAuxiliaries(arr: any[]) {
  return writeData(KIND, arr);
}

export async function upsertAuxiliary(item: any) {
  const v = validateChecklist(item);
  if (!v.ok) throw new Error(v.error);

  const arr = await readData(KIND);
  const obj = { ...item };
  if (!obj.id) obj.id = genId();

  const idx = arr.findIndex((x) => x.id === obj.id);
  if (idx >= 0) arr[idx] = obj;
  else arr.push(obj);

  await writeData(KIND, arr);
  return obj;
}

export async function removeAuxiliary(id: string) {
  const arr = await readData(KIND);
  const idx = arr.findIndex((x) => x.id === id);
  if (idx < 0) return false;

  const [removed] = arr.splice(idx, 1);
  if (removed?.attachments && Array.isArray(removed.attachments)) {
    for (const a of removed.attachments) {
      const url = a?.url ?? a;
      if (typeof url === "string") await removeUploadedFileByUrl(url).catch(() => {});
    }
  }

  await writeData(KIND, arr);
  return true;
}