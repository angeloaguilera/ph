// lib/administration/inventory-management.ts
import { promises as fs } from "fs";
import path from "path";

type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  updatedAt: string;
};

const INVENTORY_FILE = path.join(process.cwd(), "data", "inventory.json");

async function readInventory(): Promise<InventoryItem[]> {
  try {
    const txt = await fs.readFile(INVENTORY_FILE, "utf-8");
    return JSON.parse(txt) as InventoryItem[];
  } catch {
    return [];
  }
}

async function writeInventory(items: InventoryItem[]) {
  await fs.mkdir(path.dirname(INVENTORY_FILE), { recursive: true });
  await fs.writeFile(INVENTORY_FILE, JSON.stringify(items, null, 2), "utf-8");
}

/**
 * items: Array<{ name?: string; sku?: string; quantity?: number }>
 * - Si existe por SKU se actualiza por SKU; si no, por nombre (case-insensitive).
 * - Si no existe, se crea.
 */
export async function addOrUpdateInventoryItems(items: { name?: string; sku?: string; quantity?: number }[]) {
  const now = new Date().toISOString();
  const current = await readInventory();
  const changes: { created: InventoryItem[]; updated: InventoryItem[] } = { created: [], updated: [] };

  for (const it of items) {
    const qty = Number(it.quantity ?? 0);
    if (!it.name || qty === 0) continue;

    let found: InventoryItem | undefined;
    if (it.sku) found = current.find((c) => c.sku && c.sku === it.sku);
    if (!found) found = current.find((c) => c.name.toLowerCase() === it.name!.toLowerCase());

    if (found) {
      found.quantity = Number(found.quantity) + qty;
      found.updatedAt = now;
      changes.updated.push(found);
    } else {
      const newItem: InventoryItem = {
        id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
        name: it.name!,
        sku: it.sku,
        quantity: qty,
        updatedAt: now,
      };
      current.push(newItem);
      changes.created.push(newItem);
    }
  }

  await writeInventory(current);
  return { inventory: current, changes };
}
