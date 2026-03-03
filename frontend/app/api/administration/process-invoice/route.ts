// app/api/administration/process-invoice/route.ts
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { addOrUpdateInventoryItems } from "@/lib/administration/inventory-management";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const invoiceRaw = form.get("invoice");
    if (!invoiceRaw || typeof invoiceRaw !== "string") {
      return new NextResponse("Missing invoice JSON", { status: 400 });
    }
    const invoice = JSON.parse(invoiceRaw);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Map index -> array of urls
    const itemFilesMap: Record<number, string[]> = {};

    for (const [key, value] of form.entries()) {
      if (!key.startsWith("itemFile-")) continue;

      const maybeFile = value as unknown as File;
      if (!(maybeFile instanceof File)) continue;

      const buffer = Buffer.from(await maybeFile.arrayBuffer());
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${maybeFile.name.replace(/\s+/g, "_")}`;
      const dest = path.join(uploadsDir, filename);
      await fs.writeFile(dest, buffer);

      const publicUrl = `/uploads/${filename}`;
      const [, idxStr] = key.split("itemFile-");
      const idx = parseInt(idxStr, 10);
      if (Number.isNaN(idx)) continue;

      if (!itemFilesMap[idx]) itemFilesMap[idx] = [];
      itemFilesMap[idx].push(publicUrl);
    }

    // Attach the URLs to invoice.items
    if (Array.isArray(invoice.items)) {
      invoice.items = invoice.items.map((it: any, idx: number) => {
        const urls = itemFilesMap[idx] ?? [];
        const photosFromPayload = (it.photos ?? []) as any[];
        const mapped = [
          ...(Array.isArray(photosFromPayload) ? photosFromPayload.filter((p) => typeof p === "object") : []),
          ...urls.map((u) => ({ id: String(Date.now()) + Math.random().toString(36).slice(2, 7), name: u.split("/").pop(), url: u })),
        ];
        return { ...it, photos: mapped };
      });
    }

    // Prepare items for inventory update: only those with addToInventory === true
    const itemsToAdd = (invoice.items ?? [])
      .filter((it: any) => !!it.addToInventory)
      .map((it: any) => ({ name: it.name, sku: it.sku, quantity: Number(it.quantity ?? 0) }));

    // If invoice contains an item named 'cafe' (case-insensitive), ensure it's added/updated as well
    const hasCafe = (invoice.items ?? []).some((it: any) => typeof it.name === "string" && it.name.toLowerCase().includes("cafe"));
    if (hasCafe && !itemsToAdd.some((i) => i.name && i.name.toLowerCase().includes("cafe"))) {
      // If there was a 'cafe' in invoice but not flagged to addToInventory, we still add with quantity 1
      itemsToAdd.push({ name: "Cafe", quantity: 1 });
    }

    const inventoryResult = await addOrUpdateInventoryItems(itemsToAdd);

    // Persist invoice + inventoryResult for demo
    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    const outPath = path.join(dataDir, `invoice-${Date.now()}.json`);
    await fs.writeFile(outPath, JSON.stringify({ invoice, inventoryResult }, null, 2), "utf-8");

    return NextResponse.json({ invoice, inventoryResult });
  } catch (err: any) {
    console.error("process-invoice error:", err);
    return new NextResponse(String(err?.message ?? err), { status: 500 });
  }
}
