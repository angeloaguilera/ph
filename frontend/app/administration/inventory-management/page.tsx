// app/administration/inventory-management/page.tsx
import fs from "fs/promises";
import path from "path";
import React from "react";
import InventoryClient from "@/components/administration/InventoryClient";

type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  updatedAt: string;
  // campo opcional con la URL o dataUrl de la imagen primaria
  primaryImage?: string;
};

async function readInventoryFile(): Promise<InventoryItem[]> {
  try {
    const file = path.join(process.cwd(), "data", "inventory.json");
    const txt = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(txt) as any[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => {
      // Si el JSON contiene 'primaryImage' u 'photos' (array) intenta obtener una URL
      let primaryImage: string | undefined = undefined;
      if (p.primaryImage && typeof p.primaryImage === "string") primaryImage = p.primaryImage;
      else if (Array.isArray(p.photos) && p.photos.length > 0) {
        // photos puede ser array de strings o array de objetos {url|dataUrl}
        const first = p.photos[0];
        if (typeof first === "string") primaryImage = first;
        else if (first?.url) primaryImage = first.url;
        else if (first?.dataUrl) primaryImage = first.dataUrl;
      }

      return {
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        sku: p.sku ?? undefined,
        quantity: Number(p.quantity ?? 0),
        updatedAt: String(p.updatedAt ?? ""),
        primaryImage,
      } as InventoryItem;
    });
  } catch (err) {
    // Si no existe, devolvemos array vacío
    return [];
  }
}

export default async function Page() {
  const inventory = await readInventoryFile();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Administración — Inventario</h1>
        <p className="text-sm text-gray-600 mt-1">
          Aquí se muestra el inventario actual (data/inventory.json). Puedes actualizar cantidades o subir una imagen por producto.
        </p>
      </header>

      <main>
        <InventoryClient initialInventory={inventory} />
      </main>
    </div>
  );
}
