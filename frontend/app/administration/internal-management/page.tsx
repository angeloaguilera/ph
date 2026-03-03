// app/administration/internal-management/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";

type Photo = { id: string; name: string; dataUrl?: string; url?: string };
type InternalItem = {
  id?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  addToInventory?: boolean;
  photos?: Photo[];
};
type InternalRecord = {
  id: string;
  createdAt: string;
  referenceId?: string | null;
  item: InternalItem;
  meta?: Record<string, any>;
};

export default function InternalManagementPage() {
  const [items, setItems] = useState<InternalRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selected, setSelected] = useState<InternalRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/administration/internal-management");
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? res.statusText ?? "Error al obtener datos");
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshToken]);

  // Delete record by id (query param)
  const handleDelete = async (id: string) => {
    const confirmed = confirm("¿Eliminar este registro de gestión interna?");
    if (!confirmed) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/administration/internal-management?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? res.statusText ?? "Error eliminando registro");
      }
      // actualizar lista localmente
      setItems((prev) => prev.filter((r) => String(r.id) !== String(id)));
      if (selected?.id === id) setSelected(null);
      alert("Registro eliminado.");
    } catch (err: any) {
      console.error(err);
      alert("Error eliminando registro: " + (err?.message ?? String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  // Copy id helper
  const copyId = async (id: string) => {
    try {
      await navigator.clipboard?.writeText(id);
      alert("ID copiado al portapapeles");
    } catch {
      alert("No se pudo copiar el ID");
    }
  };

  // Open modal (by row click or button)
  const openDetails = (rec: InternalRecord) => {
    setSelected(rec);
  };

  // Close modal
  const closeDetails = () => setSelected(null);

  // Close modal on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetails();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión Interna</h1>
          <p className="text-sm text-gray-600">Registros creados desde el módulo de gestión interna.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshToken((t) => t + 1)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600">Error: {error}</div>}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Item</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Cantidad</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Precio unit.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Agregar inventario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y">
            {items.length === 0 && !loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={8}>
                  No hay registros de gestión interna.
                </td>
              </tr>
            ) : (
              items.map((rec) => {
                const it = rec.item ?? ({} as InternalItem);
                const thumb = it.photos && it.photos.length > 0 ? (it.photos[0].dataUrl ?? it.photos[0].url) : null;
                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      // abrir detalles solo cuando se hace click en la fila (no en botones internos)
                      const target = e.target as HTMLElement;
                      if (target.closest("button") || target.closest("a") || target.tagName === "BUTTON") return;
                      openDetails(rec);
                    }}
                    role="button"
                    aria-pressed="false"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(rec.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">{rec.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 flex items-center gap-3">
                      {thumb ? (
                        <img src={thumb} alt={it.photos?.[0]?.name ?? "thumb"} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No image</div>
                      )}
                      <div>{it.name ?? "(Sin nombre)"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{it.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{it.quantity ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{it.unitPrice ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{it.addToInventory ? "Sí" : "No"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(rec);
                          }}
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                        >
                          Detalles
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyId(rec.id);
                          }}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          Copiar ID
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(rec.id);
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          disabled={deletingId === rec.id}
                        >
                          {deletingId === rec.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de detalles */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            // cerrar modal si se hace click fuera del panel
            if (e.target === e.currentTarget) closeDetails();
          }}
        >
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative w-full max-w-3xl bg-white rounded shadow-lg z-10 overflow-auto max-h-[90vh]">
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Detalle — {selected.item?.name ?? "(Sin nombre)"}</h2>
                <div className="text-xs text-gray-500">ID: <span className="font-mono">{selected.id}</span></div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    copyId(selected.id);
                  }}
                  className="px-3 py-1 border rounded text-sm"
                >
                  Copiar ID
                </button>

                <button
                  onClick={() => {
                    if (selected.id) handleDelete(selected.id);
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Eliminar
                </button>

                <button onClick={closeDetails} className="px-3 py-1 border rounded text-sm">
                  Cerrar
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                {/* Carousel simple de imágenes */}
                <div className="space-y-2">
                  {(selected.item.photos ?? []).length === 0 ? (
                    <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center text-gray-400">Sin imágenes</div>
                  ) : (
                    <div className="space-y-2">
                      {(selected.item.photos ?? []).map((p) => (
                        <div key={p.id} className="border rounded overflow-hidden">
                          {p.dataUrl ? (
                            <img src={p.dataUrl} alt={p.name} className="w-full h-40 object-contain bg-white" />
                          ) : p.url ? (
                            <img src={p.url} alt={p.name} className="w-full h-40 object-contain bg-white" />
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center text-xs text-gray-500">No preview</div>
                          )}
                          <div className="p-2 text-xs text-gray-600">{p.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Nombre</label>
                    <div className="mt-1 text-sm">{selected.item?.name ?? "—"}</div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">SKU</label>
                    <div className="mt-1 text-sm">{selected.item?.sku ?? "—"}</div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Cantidad</label>
                    <div className="mt-1 text-sm">{selected.item?.quantity ?? "—"}</div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Precio unit.</label>
                    <div className="mt-1 text-sm">{selected.item?.unitPrice ?? "—"}</div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Agregar inventario</label>
                    <div className="mt-1 text-sm">{selected.item?.addToInventory ? "Sí" : "No"}</div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Referencia</label>
                    <div className="mt-1 text-sm">{selected.referenceId ?? "—"}</div>
                  </div>
                </div>

                {selected.meta && Object.keys(selected.meta).length > 0 && (
                  <div className="mt-4">
                    <label className="text-xs text-gray-500">Meta / Contexto</label>
                    <pre className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-700 overflow-auto">{JSON.stringify(selected.meta, null, 2)}</pre>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500">Creado: {new Date(selected.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
