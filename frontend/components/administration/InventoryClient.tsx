// components/forms/InvoiceForm.tsx
"use client";

import React, { useState, useMemo } from "react";

/* Tipos locales */
type InvoiceType = "VENTA" | "COMPRA";
type DestinationType = "BANCO" | "CAJA";
type BankPaymentType = "DEBITO" | "TRANSFERENCIA" | "CREDITO" | "PAGOMOVIL";
type PartyType = "NATURAL" | "JURIDICA";

type InvoicePhoto = { id: string; name: string; url?: string; dataUrl?: string };
type InvoiceItem = {
  id?: string;
  invoiceId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  addToInventory?: boolean;
  photos?: InvoicePhoto[];
  total?: number;
};

type PartyInfo = {
  partyType: PartyType;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  rif?: string;
  nit?: string;
};

/* Helper: File -> dataURL */
const readFileAsDataUrl = (file: File): Promise<string | null> =>
  new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(typeof fr.result === "string" ? fr.result : null);
    fr.onerror = () => res(null);
    fr.readAsDataURL(file);
  });

type Props = {
  onSave?: (invoice: any) => void;
  onGenerateReports?: () => void;
  initialValues?: { items?: InvoiceItem[]; party?: Partial<PartyInfo> };
};

/* Generador de ids */
let __localIdCounter = 0;
const genId = () => {
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto && "randomUUID" in (globalThis as any).crypto) {
    return (globalThis as any).crypto.randomUUID();
  }
  __localIdCounter += 1;
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${__localIdCounter}`;
};

export default function InvoiceForm({ onSave, onGenerateReports, initialValues }: Props) {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("VENTA");
  const [destination, setDestination] = useState<DestinationType>("BANCO");
  const [bank, setBank] = useState<string>("");
  const [caja, setCaja] = useState<string>("");
  const [invoiceName, setInvoiceName] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [ivaPercent, setIvaPercent] = useState<number>(16);
  const [description, setDescription] = useState<string>("");

  const defaultParty: PartyInfo = {
    partyType: (initialValues?.party?.partyType as PartyType) ?? "NATURAL",
    name: initialValues?.party?.name ?? "",
    phone: initialValues?.party?.phone ?? "",
    email: initialValues?.party?.email ?? "",
    address: initialValues?.party?.address ?? "",
    rif: initialValues?.party?.rif ?? "",
    nit: initialValues?.party?.nit ?? "",
  };
  const [partyInfo, setPartyInfo] = useState<PartyInfo>(defaultParty);

  const [paymentType, setPaymentType] = useState<BankPaymentType | "">("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  type ItemState = InvoiceItem & { __files?: File[] };

  const initItems = (): ItemState[] => {
    const raw = (initialValues?.items as ItemState[]) ?? [];
    const seenItemIds = new Set<string>();
    const seenPhotoIds = new Set<string>();

    return raw.map((it) => {
      const itemId = it.id && !seenItemIds.has(it.id) ? it.id : genId();
      seenItemIds.add(itemId);

      const photos = (it.photos ?? []).map((p) => {
        if (p.id && !seenPhotoIds.has(p.id)) {
          seenPhotoIds.add(p.id);
          return { ...p, id: p.id };
        }
        const newId = genId();
        seenPhotoIds.add(newId);
        return { ...p, id: newId };
      });

      return {
        ...it,
        id: itemId,
        photos,
        __files: (it as any).__files ?? [],
      } as ItemState;
    });
  };

  const [items, setItems] = useState<ItemState[]>(initItems);

  const lineTotal = (it: InvoiceItem) => {
    const q = Number(isNaN(Number(it.quantity)) ? 0 : Number(it.quantity));
    const p = Number(isNaN(Number(it.unitPrice)) ? 0 : Number(it.unitPrice));
    return Number((q * p).toFixed(2));
  };

  const subtotal = useMemo(() => Number(items.reduce((s, it) => s + lineTotal(it), 0).toFixed(2)), [items]);

  const ivaAmount = useMemo(() => {
    if (destination !== "BANCO") return 0;
    const p = Number(isNaN(Number(ivaPercent)) ? 0 : Number(ivaPercent));
    return Number(((subtotal * p) / 100).toFixed(2));
  }, [subtotal, ivaPercent, destination]);

  const total = useMemo(() => Number((subtotal + ivaAmount).toFixed(2)), [subtotal, ivaAmount]);

  const resetForm = () => {
    setInvoiceType("VENTA");
    setDestination("BANCO");
    setBank("");
    setCaja("");
    setInvoiceName("");
    setDate("");
    setIvaPercent(16);
    setDescription("");
    setItems([]);
    setPartyInfo({ partyType: "NATURAL", name: "", phone: "", email: "", address: "", rif: "", nit: "" });
    setPaymentType("");
    setReferenceNumber("");
  };

  const addItem = () =>
    setItems((p) => [
      ...p,
      {
        id: genId(),
        name: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        addToInventory: true,
        photos: [],
        __files: [],
      },
    ]);

  const updateItem = (idx: number, patch: Partial<ItemState>) =>
    setItems((p) => {
      const copy = [...p];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });

  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const handleItemPhotosChange = async (index: number, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);

    const previews: InvoicePhoto[] = await Promise.all(
      arr.map(async (f) => ({
        id: genId(),
        name: f.name,
        dataUrl: (await readFileAsDataUrl(f)) ?? undefined,
      }))
    );

    setItems((prev) => {
      const copy = [...prev];
      const current = copy[index] ?? {
        id: genId(),
        name: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        addToInventory: true,
        photos: [],
        __files: [],
      };
      current.__files = [...(current.__files ?? []), ...arr];
      const existingPhotos = current.photos ?? [];
      const existingIds = new Set(existingPhotos.map((p) => p.id));
      const uniquePreviews = previews.map((p) => {
        if (existingIds.has(p.id)) return { ...p, id: genId() };
        existingIds.add(p.id);
        return p;
      });

      current.photos = [...existingPhotos, ...uniquePreviews];
      copy[index] = current;
      return copy;
    });
  };

  const removeItemPhoto = (index: number, photoId: string) => {
    setItems((p) => {
      const copy = [...p];
      const cur = copy[index];
      if (!cur) return p;
      copy[index] = { ...cur, photos: (cur.photos ?? []).filter((pp) => pp.id !== photoId) };
      return copy;
    });
  };

  /* --- SUBMIT --- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!invoiceName.trim()) return alert("Ingresa el nombre de la factura.");
    if (!date) return alert("Selecciona fecha y hora.");

    if (!partyInfo.name?.trim()) {
      return alert(invoiceType === "VENTA" ? "Ingresa el nombre del cliente." : "Ingresa el nombre del proveedor.");
    }

    // RIF obligatorio en ambos casos
    if (!partyInfo.rif?.trim()) return alert("Ingresa RIF.");

    // NIT obligatorio sólo si persona jurídica
    if (partyInfo.partyType === "JURIDICA" && !partyInfo.nit?.trim()) return alert("Ingresa NIT para persona jurídica.");

    if (destination === "BANCO" && !bank.trim()) return alert("Ingresa banco.");
    if (destination === "CAJA" && !caja.trim()) return alert("Ingresa caja.");

    if (destination === "BANCO" && !paymentType) return alert("Selecciona tipo de pago.");
    if (destination === "BANCO" && !referenceNumber.trim()) return alert("Ingresa número de referencia.");

    if (!items.length) return alert("Agrega al menos un artículo.");

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) return alert(`Artículo #${i + 1} necesita nombre.`);
      if (!it.quantity || it.quantity <= 0) return alert(`Artículo "${it.name}" necesita cantidad válida.`);
    }

    const savedDate = date ? new Date(date).toISOString() : "";
    const invoiceId = genId();

    const invoicePayload: any = {
      id: invoiceId,
      type: invoiceType,
      invoiceName: invoiceName.trim(),
      ...(invoiceType === "VENTA"
        ? { customer: { ...partyInfo, name: partyInfo.name.trim() } }
        : { supplier: { ...partyInfo, name: partyInfo.name.trim() } }),
      bank: destination === "BANCO" ? bank.trim() : undefined,
      ...(destination === "CAJA" ? { caja: caja.trim() } : {}),
      date: savedDate,
      amount: subtotal,
      iva: ivaAmount,
      total,
      description: description.trim() || undefined,
      items: items.map((it) => ({
        id: it.id ?? genId(),
        name: it.name,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        addToInventory: it.addToInventory,
      })),
    };

    if (destination === "BANCO") {
      invoicePayload.payment = {
        method: paymentType,
        reference: referenceNumber.trim(),
      };
    }

    const form = new FormData();
    form.append("invoice", JSON.stringify(invoicePayload));

    items.forEach((it, idx) => {
      const files = it.__files ?? [];
      files.forEach((f) => form.append(`itemFile-${idx}`, f));
    });

    try {
      const res = await fetch("/api/administration/process-invoice", { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error procesando factura");
      }
      const data = await res.json();
      const savedInvoice = data?.invoice ?? data;
      alert("Factura procesada correctamente.");
      if (onSave) onSave(savedInvoice);
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.message ?? err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl mx-auto p-4">
      {/* Tipo de factura */}
      <div>
        <label className="block text-sm font-medium mb-1">Tipo</label>
        <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as InvoiceType)} className="w-full border rounded px-3 py-2">
          <option value="VENTA">Venta</option>
          <option value="COMPRA">Compra</option>
        </select>
      </div>

      {/* Datos del cliente/proveedor */}
      <div className="border rounded p-3">
        <h3 className="text-sm font-medium mb-2">{invoiceType === "VENTA" ? "Datos del Cliente" : "Datos del Proveedor"}</h3>

        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de persona</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={partyInfo.partyType}
              onChange={(e) =>
                setPartyInfo((p) => {
                  const newType = e.target.value as PartyType;
                  // si cambia a NATURAL limpiamos nit (no aplicable)
                  return { ...p, partyType: newType, nit: newType === "NATURAL" ? "" : p.nit };
                })
              }
            >
              <option value="NATURAL">Persona Natural</option>
              <option value="JURIDICA">Persona Jurídica</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{invoiceType === "VENTA" ? "Nombre del Cliente" : "Nombre del Proveedor"}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={partyInfo.name}
              onChange={(e) => setPartyInfo((p) => ({ ...p, name: e.target.value }))}
              placeholder={invoiceType === "VENTA" ? "Ej. Juan Pérez" : "Ej. Proveedor S.A."}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                className="w-full border rounded px-3 py-2"
                value={partyInfo.phone}
                onChange={(e) => setPartyInfo((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Ej. +58 412 1234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correo</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2"
                value={partyInfo.email}
                onChange={(e) => setPartyInfo((p) => ({ ...p, email: e.target.value }))}
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={partyInfo.address}
              onChange={(e) => setPartyInfo((p) => ({ ...p, address: e.target.value }))}
              placeholder="Calle, ciudad, país"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* RIF siempre visible */}
            <div>
              <label className="block text-sm font-medium mb-1">RIF</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={partyInfo.rif}
                onChange={(e) => setPartyInfo((p) => ({ ...p, rif: e.target.value }))}
                placeholder="Ej. J-12345678-9"
              />
            </div>

            {/* NIT solo si persona jurídica */}
            {partyInfo.partyType === "JURIDICA" ? (
              <div>
                <label className="block text-sm font-medium mb-1">NIT</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={partyInfo.nit}
                  onChange={(e) => setPartyInfo((p) => ({ ...p, nit: e.target.value }))}
                  placeholder="Ej. 123456789"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Nombre factura */}
      <div>
        <label className="block text-sm font-medium mb-1">Nombre factura</label>
        <input className="w-full border rounded px-3 py-2" value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} placeholder="Ej. Factura Enero 2026" />
      </div>

      {/* Destino */}
      <div>
        <label className="block text-sm font-medium mb-1">Destino</label>
        <select className="w-full border rounded px-3 py-2" value={destination} onChange={(e) => setDestination(e.target.value as DestinationType)}>
          <option value="BANCO">Banco</option>
          <option value="CAJA">Caja</option>
        </select>
      </div>

      {destination === "BANCO" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Banco</label>
            <input className="w-full border rounded px-3 py-2" value={bank} onChange={(e) => setBank(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de pago</label>
            <select className="w-full border rounded px-3 py-2" value={paymentType} onChange={(e) => setPaymentType(e.target.value as BankPaymentType)}>
              <option value="">-- Selecciona --</option>
              <option value="DEBITO">Débito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CREDITO">Crédito</option>
              <option value="PAGOMOVIL">Pago móvil</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Número de referencia</label>
            <input className="w-full border rounded px-3 py-2" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Ej. 1234567890" />
          </div>
        </>
      )}

      {destination === "CAJA" && (
        <div>
          <label className="block text-sm font-medium mb-1">Caja</label>
          <input className="w-full border rounded px-3 py-2" value={caja} onChange={(e) => setCaja(e.target.value)} />
        </div>
      )}

      {/* Fecha */}
      <div>
        <label className="block text-sm font medium mb-1">Fecha y hora</label>
        <input type="datetime-local" step="1" className="w-full border rounded px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* Artículos */}
      <div className="border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Artículos (fotos por artículo)</h3>
          <button type="button" onClick={addItem} className="text-sm bg-gray-200 px-3 py-1 rounded">+ Agregar ítem</button>
        </div>

        {items.length === 0 && <p className="text-sm text-gray-500">No hay artículos.</p>}

        <div className="space-y-3 mt-3">
          {items.map((it, idx) => (
            <div key={it.id ?? idx} className="grid grid-cols-12 gap-2 items-start border-b pb-3">
              <div className="col-span-5">
                <label className="block text-xs font-medium">Nombre</label>
                <input className="w-full border rounded px-2 py-1" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium">SKU</label>
                <input className="w-full border rounded px-2 py-1" value={it.sku} onChange={(e) => updateItem(idx, { sku: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium">Cant.</label>
                <input type="number" step="1" min="0" className="w-full border rounded px-2 py-1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value === "" ? 0 : parseFloat(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium">Precio unit.</label>
                <input type="number" step="0.01" min="0" className="w-full border rounded px-2 py-1" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value === "" ? 0 : parseFloat(e.target.value) })} />
              </div>
              <div className="col-span-1 text-right">
                <label className="block text-xs font-medium">Total</label>
                <div className="text-sm">{lineTotal(it).toFixed(2)}</div>
              </div>

              <div className="col-span-12">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!it.addToInventory} onChange={(e) => updateItem(idx, { addToInventory: e.target.checked })} />
                    Agregar al inventario
                  </label>
                  <div className="ml-4">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleItemPhotosChange(idx, e.target.files)} />
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="ml-auto text-sm text-red-600">Eliminar</button>
                </div>

                {(it.photos ?? []).length > 0 && (
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {(it.photos ?? []).map((p) => (
                      <div key={p.id} className="col-span-2 border rounded p-1 relative">
                        {p.dataUrl ? <img src={p.dataUrl} alt={p.name} className="w-full h-24 object-cover rounded" /> : p.url ? <img src={p.url} alt={p.name} className="w-full h-24 object-cover rounded" /> : null}
                        <div className="text-xs mt-1 truncate">{p.name}</div>
                        <button type="button" onClick={() => removeItemPhoto(idx, p.id)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-600">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-3 flex justify-end gap-4">
          <div className="text-right">
            <div className="text-sm">Subtotal</div>
            <div className="font-medium">{subtotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {destination === "BANCO" && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">IVA (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="w-full border rounded px-3 py-2" value={ivaPercent === 0 ? "" : ivaPercent} onChange={(e) => setIvaPercent(e.target.value === "" ? 0 : parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IVA (monto)</label>
            <input readOnly className="w-full border rounded px-3 py-2 bg-gray-100" value={ivaAmount.toFixed(2)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total</label>
            <input readOnly className="w-full border rounded px-3 py-2 bg-gray-100" value={total.toFixed(2)} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea className="w-full border rounded px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">Guardar factura</button>
        {onGenerateReports && <button type="button" onClick={onGenerateReports} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Generar informes</button>}
      </div>
    </form>
  );
}
