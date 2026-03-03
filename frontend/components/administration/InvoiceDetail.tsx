// components/administration/InvoiceDetail.tsx
"use client";

import React, { useState } from "react";

type InvoicePhotoObj = { id?: string; name?: string; url?: string; dataUrl?: string };
type InvoiceItem = {
  id?: string;
  invoiceId?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  addToInventory?: boolean;
  photos?: InvoicePhotoObj[] | string[]; // puede ser array de objetos o array de urls
  total?: number;
};
type Invoice = {
  id?: string;
  type?: string;
  invoiceName?: string;
  bank?: string;
  caja?: string;
  date?: string;
  amount?: number;
  iva?: number;
  total?: number;
  description?: string;
  items?: InvoiceItem[];
};

/** Generador simple de ids (fallback si faltan) */
let __localCounter = 0;
const genId = () => {
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto && "randomUUID" in (globalThis as any).crypto) {
    return (globalThis as any).crypto.randomUUID();
  }
  __localCounter += 1;
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${__localCounter}`;
};

/** Normaliza cualquier formato de foto a un objeto consistente */
function normalizePhoto(p: any) {
  if (!p) return null;
  // Si es string -> tratar como URL
  if (typeof p === "string") {
    const url = p;
    const name = url.split("/").pop?.() ?? url;
    return { id: genId(), name, url, dataUrl: undefined };
  }
  // Si es File-like (dataUrl) o un objeto con url/dataUrl
  if (typeof p === "object") {
    const url = p.url ?? undefined;
    const dataUrl = p.dataUrl ?? undefined;
    const name = p.name ?? url?.split("/").pop?.() ?? `photo-${genId()}`;
    return { id: p.id ?? genId(), name, url, dataUrl };
  }
  return null;
}

export default function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const [lightbox, setLightbox] = useState<{ open: boolean; src?: string; caption?: string }>({
    open: false,
    src: undefined,
    caption: undefined,
  });

  if (!invoice) return <div className="text-gray-500">Factura inexistente.</div>;

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const openLightbox = (src?: string, caption?: string) => {
    if (!src) return;
    setLightbox({ open: true, src, caption });
  };

  const closeLightbox = () => setLightbox({ open: false, src: undefined, caption: undefined });

  return (
    <>
      <div className="border rounded p-4 overflow-auto max-h-[70vh] bg-white">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div className="flex items-start gap-4">
            {/* Imagen principal de la factura (primer ítem primera foto) */}
            <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center border">
              {Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                (() => {
                  const firstItem = invoice.items![0];
                  const photos = Array.isArray(firstItem.photos) ? firstItem.photos : [];
                  const firstPhoto = photos.length > 0 ? normalizePhoto(photos[0]) : null;
                  if (firstPhoto?.dataUrl) {
                    return (
                      <img
                        src={firstPhoto.dataUrl}
                        alt={firstPhoto.name}
                        className="w-full h-full object-cover"
                        onClick={() => openLightbox(firstPhoto.dataUrl, firstPhoto.name)}
                        style={{ cursor: "zoom-in" }}
                        loading="lazy"
                      />
                    );
                  }
                  if (firstPhoto?.url) {
                    return (
                      <img
                        src={firstPhoto.url}
                        alt={firstPhoto.name}
                        className="w-full h-full object-cover"
                        onClick={() => openLightbox(firstPhoto.url, firstPhoto.name)}
                        style={{ cursor: "zoom-in" }}
                        loading="lazy"
                      />
                    );
                  }
                  return <div className="text-xs text-gray-500 px-2 text-center">Sin foto</div>;
                })()
              ) : (
                <div className="text-xs text-gray-500 px-2 text-center">Sin foto</div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold">{invoice.invoiceName ?? "Factura sin nombre"}</h2>
              <div className="text-sm text-gray-600">ID: {invoice.id ?? "-"}</div>
              <div className="text-sm text-gray-600">Tipo: {invoice.type ?? "-"}</div>
              <div className="text-sm text-gray-600">Fecha: {formatDate(invoice.date)}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Subtotal</div>
            <div className="text-lg font-medium">{Number(invoice.amount ?? 0).toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-2">IVA</div>
            <div className="text-md">{Number(invoice.iva ?? 0).toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-2">Total</div>
            <div className="text-xl font-semibold">{Number(invoice.total ?? 0).toFixed(2)}</div>
          </div>
        </div>

        {invoice.description && <p className="mb-4 text-sm text-gray-700">{invoice.description}</p>}

        <h3 className="font-medium mb-2">Artículos</h3>
        <div className="space-y-3">
          {(invoice.items ?? []).map((it: InvoiceItem, idx: number) => {
            const photos = Array.isArray(it.photos) ? it.photos : [];
            const normalizedPhotos = photos.map((p) => normalizePhoto(p)).filter(Boolean) as {
              id: string;
              name?: string;
              url?: string;
              dataUrl?: string;
            }[];

            // Primer foto como imagen principal del producto (si existe)
            const primary = normalizedPhotos.length > 0 ? normalizedPhotos[0] : null;

            return (
              <div key={it.id ?? `item-${idx}`} className="border rounded p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 items-start">
                    {/* Imagen producto */}
                    <div className="w-28 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-100 border flex items-center justify-center">
                      {primary ? (
                        primary.dataUrl ? (
                          <img
                            src={primary.dataUrl}
                            alt={primary.name}
                            className="w-full h-full object-cover"
                            onClick={() => openLightbox(primary.dataUrl, primary.name)}
                            style={{ cursor: "zoom-in" }}
                            loading="lazy"
                          />
                        ) : primary.url ? (
                          <img
                            src={primary.url}
                            alt={primary.name}
                            className="w-full h-full object-cover"
                            onClick={() => openLightbox(primary.url, primary.name)}
                            style={{ cursor: "zoom-in" }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-xs text-gray-500 px-2 text-center">Sin foto</div>
                        )
                      ) : (
                        <div className="text-xs text-gray-500 px-2 text-center">Sin foto</div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-medium">{it.name ?? "-"}</div>
                      <div className="text-xs text-gray-500">SKU: {it.sku ?? "-"}</div>
                      <div className="text-xs text-gray-600 mt-1">Cantidad: {Number(it.quantity ?? 0)}</div>
                      <div className="text-xs text-gray-600">Precio unit.: {Number(it.unitPrice ?? 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-800 font-medium mt-1">
                        Total:{" "}
                        {Number(it.total ?? (Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0))).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Thumbnails (si hay más de una foto) */}
                  <div className="flex gap-2 items-start">
                    {normalizedPhotos.length > 0 ? (
                      <div className="flex flex-col items-end">
                        <div className="flex gap-2 mb-1">
                          {normalizedPhotos.map((p, pidx) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => openLightbox(p.dataUrl ?? p.url, p.name)}
                              className="w-16 h-12 overflow-hidden rounded border bg-white flex-shrink-0"
                              title={p.name}
                            >
                              {p.dataUrl ? (
                                <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : p.url ? (
                                <img src={p.url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">—</div>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">{normalizedPhotos.length} foto(s)</div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Sin fotos</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox modal simple */}
      {lightbox.open && lightbox.src && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60" onClick={closeLightbox} />
          <div className="relative z-10 max-w-[90vw] max-h-[90vh] p-4">
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 z-20 bg-white/90 rounded-full p-1 shadow"
              aria-label="Cerrar imagen"
            >
              ✕
            </button>
            <div className="bg-white rounded overflow-hidden shadow-lg p-2 max-h-[85vh]">
              <img src={lightbox.src} alt={lightbox.caption} className="max-w-full max-h-[80vh] object-contain block mx-auto" />
              {lightbox.caption && <div className="text-center text-sm text-gray-600 mt-2">{lightbox.caption}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
