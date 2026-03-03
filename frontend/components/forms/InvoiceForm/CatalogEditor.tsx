// components/forms/InvoiceForm/CatalogEditor.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ALL_ITEM_TYPES, ITEM_TYPE_MAP } from "@lib/invoiceUtils";

export default function CatalogEditor(props: {
  state?: any;
  editor?: any;
  onSave: (rec: any) => void;
  onCancel: () => void;
}) {
  let incoming = props.editor ?? props.state;

  if (incoming && typeof incoming === "object") {
    if ("docKind" in incoming && "setDocKind" in incoming && incoming.catalogEditor !== undefined) {
      console.warn(
        "CatalogEditor: se recibió el objeto del hook completo. Usando incoming.catalogEditor en su lugar. Revisa llamadas a setCatalogEditor/prop 'state' (debería pasar solo el editor).",
        incoming
      );
      incoming = incoming.catalogEditor;
    }
  }

  const state = incoming;
  const { onSave, onCancel } = props;

  if (!state) return null;

  const isService = state.kind === "service";

  const EMPTY_FORM = {
    name: "",
    sku: "",
    price: 0,
    rate: 0,
    type: ALL_ITEM_TYPES[0],
    subtype: ITEM_TYPE_MAP[ALL_ITEM_TYPES[0]]?.subtypes?.[0]?.value ?? "",
    description: "",
    companyId: state.rec?.companyId ?? state?.companyId ?? "",
  };

  const init = useMemo(() => {
    const rec = state.rec ?? {};
    return {
      ...EMPTY_FORM,
      ...rec,
      companyId: rec.companyId ?? EMPTY_FORM.companyId,
      subtype:
        rec.subtype ??
        ITEM_TYPE_MAP[(rec.type ?? EMPTY_FORM.type)]?.subtypes?.[0]?.value ??
        EMPTY_FORM.subtype,
      price: typeof rec.price !== "undefined" ? Number(rec.price) : EMPTY_FORM.price,
      rate: typeof rec.rate !== "undefined" ? Number(rec.rate) : EMPTY_FORM.rate,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rec]);

  const [form, setForm] = useState<any>(init);

  useEffect(() => {
    setForm(init);
  }, [init]);

  useEffect(() => {
    const firstSubtype = ITEM_TYPE_MAP[form.type]?.subtypes?.[0]?.value ?? "";
    setForm((prev: any) => {
      const validForType =
        typeof prev.subtype !== "undefined" &&
        ITEM_TYPE_MAP[prev.type]?.subtypes?.some((s: any) => s.value === prev.subtype);
      if (validForType) return prev;
      return { ...prev, subtype: firstSubtype };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type]);

  const kindRaw = (state?.invoiceKind ?? state?.invoiceType ?? "").toString().toLowerCase();
  const isSale = ["venta", "sale", "sales"].includes(kindRaw);
  const isPurchase = ["compra", "purchase", "buy"].includes(kindRaw);

  const handleSave = () => {
    if (!form.name || !String(form.name).trim()) {
      return alert("Nombre es requerido.");
    }

    // Copia segura del form
    const copy: any = { ...form };

    // Normalizar numéricos
    if (!isService) {
      copy.price = Number(copy.price ?? 0);
    } else {
      copy.rate = Number(copy.rate ?? 0);
    }

    if (isSale) {
      copy.account = copy.account ?? "CUENTAS_POR_COBRAR";
    } else if (isPurchase) {
      copy.account = copy.account ?? "CUENTAS_POR_PAGAR";
    }

    // Limpiar campos no necesarios/derivados
    if ("specs" in copy) delete copy.specs;
    if ("category" in copy) delete copy.category;

    // IMPORTANT: no enviar id/masterId al crear (dejar que server/hook lo genere)
    if (copy.id) delete copy.id;
    if (copy.masterId) delete copy.masterId;

    // Si companyId es cadena vacía, eliminar la propiedad para evitar companyId: ""
    if (typeof copy.companyId === "string" && copy.companyId.trim() === "") {
      delete copy.companyId;
    }

    // Opcional: si quieres distinguir "crear master only" vs "crear master + clone",
    // podrías añadir un flag: copy._createForCompany = Boolean(form.companyId)
    // (pero no lo hago por defecto para mantener payload limpio).

    onSave(copy);
  };

  return (
    <div className="border rounded p-3 bg-white shadow mt-3">
      <div className="flex gap-2 items-center">
        <h4 className="font-medium text-sm">
          {state.mode === "create" ? "Crear" : "Editar"} {isService ? "servicio" : "producto"}
        </h4>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-2">
        <div>
          <label className="block text-xs">Nombre</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={form.name ?? ""}
            onChange={(e) => setForm((d: any) => ({ ...d, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs">SKU</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={form.sku ?? ""}
            onChange={(e) => setForm((d: any) => ({ ...d, sku: e.target.value }))}
          />
        </div>

        {!isService ? (
          <div>
            <label className="block text-xs">Precio</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-2 py-1"
              value={String(form.price ?? 0)}
              onChange={(e) =>
                setForm((d: any) => ({ ...d, price: e.target.value === "" ? 0 : parseFloat(e.target.value) }))
              }
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs">Tarifa</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-2 py-1"
              value={String(form.rate ?? 0)}
              onChange={(e) =>
                setForm((d: any) => ({ ...d, rate: e.target.value === "" ? 0 : parseFloat(e.target.value) }))
              }
            />
          </div>
        )}

        <div>
          <label className="block text-xs">Tipo</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={form.type ?? ALL_ITEM_TYPES[0]}
            onChange={(e) => {
              const newType = e.target.value;
              const firstSubtype = ITEM_TYPE_MAP[newType]?.subtypes?.[0]?.value ?? "";
              setForm((d: any) => ({ ...d, type: newType, subtype: firstSubtype }));
            }}
          >
            {ALL_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {ITEM_TYPE_MAP[t]?.label ?? t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs">Subtipo</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={form.subtype ?? ""}
            onChange={(e) => setForm((d: any) => ({ ...d, subtype: e.target.value }))}
          />
        </div>

        <div className="col-span-3">
          <label className="block text-xs">Descripción</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={form.description ?? ""}
            onChange={(e) => setForm((d: any) => ({ ...d, description: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button type="button" onClick={handleSave} className="px-3 py-1 bg-green-600 text-white rounded">
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1 bg-gray-200 rounded">
          Cancelar
        </button>
      </div>
    </div>
  );
}
