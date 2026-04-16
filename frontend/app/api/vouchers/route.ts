import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "vouchers");
    await mkdir(uploadsDir, { recursive: true });

    const originalName = file.name.replace(/\.[^.]+$/, "");
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${Date.now()}-${safeName(originalName)}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/vouchers/${fileName}`,
      fileName,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo guardar el comprobante" },
      { status: 500 },
    );
  }
}