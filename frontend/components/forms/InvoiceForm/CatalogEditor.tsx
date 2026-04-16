"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ALL_ITEM_TYPES, ITEM_TYPE_MAP } from "@lib/invoiceUtils";

type CatalogEditorProps = {
  state?: any;
  editor?: any;
  onSave: (rec: any) => void;
  onCancel: () => void;
};

function normalizeTxKind(state: any) {
  const raw = String(
    state?.invoiceKind ??
      state?.invoiceType ??
      state?.rec?.meta?.transactionType ??
      state?.rec?.transactionType ??
      state?.meta?.transactionType ??
      ""
  ).toLowerCase();

  const isSale = ["venta", "sale", "sales"].includes(raw);
  const isPurchase = ["compra", "purchase", "buy"].includes(raw);

  return { isSale, isPurchase };
}

function getDefaultContableCategory(state: any) {
  const { isSale, isPurchase } = normalizeTxKind(state);
  if (isSale) return "ingresos";
  if (isPurchase) return "gasto";
  return "";
}

const safeText = (value: any, fallback = "") =>
  value === undefined || value === null ? fallback : String(value);

const safeNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function CatalogEditor(props: CatalogEditorProps) {
  let incoming = props.editor ?? props.state;

  if (incoming && typeof incoming === "object") {
    if (
      "docKind" in incoming &&
      "setDocKind" in incoming &&
      incoming.catalogEditor !== undefined
    ) {
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
  const { isSale, isPurchase } = normalizeTxKind(state);
  const defaultContableCategory = getDefaultContableCategory(state);

  const EMPTY_FORM = {
    name: "",
    sku: "",
    price: 0,
    rate: 0,
    quantity: 1,
    type: ALL_ITEM_TYPES[0],
    subtype: ITEM_TYPE_MAP[ALL_ITEM_TYPES[0]]?.subtypes?.[0]?.value ?? "",
    description: "",
    companyId: safeText(state.rec?.companyId ?? state?.companyId, ""),
    images: [] as any[],

    categoriaContable: defaultContableCategory,
    categoria_contable: defaultContableCategory,
    accountCategory: defaultContableCategory,
    contableCategory: defaultContableCategory,
    account: defaultContableCategory,
  };

  const init = useMemo(() => {
    const rec = state.rec ?? {};

    const categoriaContable = safeText(
      rec.categoriaContable ??
        rec.categoria_contable ??
        rec.accountCategory ??
        rec.contableCategory ??
        rec.account ??
        defaultContableCategory,
      defaultContableCategory
    );

    return {
      ...EMPTY_FORM,
      ...rec,
      name: safeText(rec.name, EMPTY_FORM.name),
      sku: safeText(rec.sku, EMPTY_FORM.sku),
      description: safeText(rec.description, EMPTY_FORM.description),
      companyId: safeText(rec.companyId ?? EMPTY_FORM.companyId, ""),
      type: safeText(rec.type, EMPTY_FORM.type),
      subtype: safeText(
        rec.subtype ??
          ITEM_TYPE_MAP[safeText(rec.type, EMPTY_FORM.type)]?.subtypes?.[0]
            ?.value ??
          EMPTY_FORM.subtype,
        EMPTY_FORM.subtype
      ),
      price: safeNumber(rec.price, EMPTY_FORM.price),
      rate: safeNumber(rec.rate, EMPTY_FORM.rate),
      quantity: safeNumber(rec.quantity ?? rec.cantidad, EMPTY_FORM.quantity),
      images: Array.isArray(rec.images)
        ? rec.images
        : Array.isArray(rec.imageUrls)
          ? rec.imageUrls
          : Array.isArray(rec.photos)
            ? rec.photos
            : [],

      categoriaContable,
      categoria_contable: categoriaContable,
      accountCategory: categoriaContable,
      contableCategory: categoriaContable,
      account: safeText(rec.account, categoriaContable),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rec, defaultContableCategory]);

  const [form, setForm] = useState<any>(() => init);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    setForm(init);
    setImageFiles([]);
  }, [init]);

  useEffect(() => {
    const firstSubtype = ITEM_TYPE_MAP[form.type]?.subtypes?.[0]?.value ?? "";
    setForm((prev: any) => {
      const validForType =
        typeof prev.subtype !== "undefined" &&
        ITEM_TYPE_MAP[prev.type]?.subtypes?.some(
          (s: any) => s.value === prev.subtype
        );
      if (validForType) return prev;
      return { ...prev, subtype: firstSubtype };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type]);

  const existingImages = Array.isArray(form.images) ? form.images : [];

  const newImagePreviews = useMemo(() => {
    return imageFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [imageFiles]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [newImagePreviews]);

  const unitValue = isService ? safeNumber(form.rate, 0) : safeNumber(form.price, 0);
  const quantityValue = Math.max(0, safeNumber(form.quantity, 1));
  const totalValue = unitValue * quantityValue;

  const handleSave = () => {
    if (!form.name || !String(form.name).trim()) {
      return alert("Nombre es requerido.");
    }

    const copy: any = { ...form };

    const contable =
      copy.categoriaContable ??
      copy.categoria_contable ??
      copy.accountCategory ??
      copy.contableCategory ??
      copy.account ??
      defaultContableCategory ??
      "";

    copy.categoriaContable = contable;
    copy.categoria_contable = contable;
    copy.accountCategory = contable;
    copy.contableCategory = contable;

    copy.quantity = Math.max(1, safeNumber(copy.quantity, 1));
    copy.cantidad = copy.quantity;

    if (!isService) {
      copy.price = safeNumber(copy.price, 0);
      copy.total = copy.price * copy.quantity;
    } else {
      copy.rate = safeNumber(copy.rate, 0);
      copy.total = copy.rate * copy.quantity;
    }

    if (isSale) {
      copy.account = "ingresos";
    } else if (isPurchase) {
      copy.account = "gasto";
    } else if (!copy.account) {
      copy.account = contable || "";
    }

    copy.meta = {
      ...(copy.meta ?? {}),
      transactionType:
        state?.rec?.meta?.transactionType ??
        state?.transactionType ??
        (isSale ? "venta" : isPurchase ? "compra" : undefined),
      companyId: copy.companyId ?? state?.rec?.companyId ?? state?.companyId,
      categoriaContable: contable,
      categoria_contable: contable,
      accountCategory: contable,
      contableCategory: contable,
      account: copy.account,
    };

    if ("specs" in copy) delete copy.specs;
    if ("category" in copy) delete copy.category;

    if (copy.id) delete copy.id;
    if (copy.masterId) delete copy.masterId;

    if (typeof copy.companyId === "string" && copy.companyId.trim() === "") {
      delete copy.companyId;
    }

    copy.images = Array.isArray(form.images) ? form.images : [];
    copy.imageFiles = imageFiles;

    onSave(copy);
  };

  const removeExistingImage = (idx: number) => {
    setForm((prev: any) => {
      const next = Array.isArray(prev.images) ? [...prev.images] : [];
      next.splice(idx, 1);
      return { ...prev, images: next };
    });
  };

  const removeSelectedFile = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="border rounded p-3 bg-white shadow mt-3">
      <div className="flex gap-2 items-center justify-between">
        <h4 className="font-medium text-sm">
          {state.mode === "create" ? "Crear" : "Editar"}{" "}
          {isService ? "servicio" : "producto"}
        </h4>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-2">
        <div>
          <label className="block text-xs">Nombre</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={safeText(form.name)}
            onChange={(e) =>
              setForm((d: any) => ({ ...d, name: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-xs">SKU</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={safeText(form.sku)}
            onChange={(e) =>
              setForm((d: any) => ({ ...d, sku: e.target.value }))
            }
          />
        </div>

        {!isService ? (
          <div>
            <label className="block text-xs">Precio</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-2 py-1"
              value={safeNumber(form.price, 0)}
              onChange={(e) =>
                setForm((d: any) => ({
                  ...d,
                  price: e.target.value === "" ? 0 : parseFloat(e.target.value),
                }))
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
              value={safeNumber(form.rate, 0)}
              onChange={(e) =>
                setForm((d: any) => ({
                  ...d,
                  rate: e.target.value === "" ? 0 : parseFloat(e.target.value),
                }))
              }
            />
          </div>
        )}

        <div>
          <label className="block text-xs">Cantidad</label>
          <input
            type="number"
            step="1"
            min="1"
            className="w-full border rounded px-2 py-1"
            value={safeNumber(form.quantity, 1)}
            onChange={(e) =>
              setForm((d: any) => ({
                ...d,
                quantity: e.target.value === "" ? 1 : parseInt(e.target.value, 10),
              }))
            }
          />
        </div>

        <div>
          <label className="block text-xs">Total</label>
          <input
            className="w-full border rounded px-2 py-1 bg-gray-50"
            value={Number.isFinite(totalValue) ? totalValue.toFixed(2) : "0.00"}
            readOnly
          />
        </div>

        <div>
          <label className="block text-xs">Tipo</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={safeText(form.type, ALL_ITEM_TYPES[0])}
            onChange={(e) => {
              const newType = e.target.value;
              const firstSubtype =
                ITEM_TYPE_MAP[newType]?.subtypes?.[0]?.value ?? "";
              setForm((d: any) => ({
                ...d,
                type: newType,
                subtype: firstSubtype,
              }));
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
            value={safeText(form.subtype)}
            onChange={(e) =>
              setForm((d: any) => ({ ...d, subtype: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-xs">Categoría contable</label>
          <input
            className="w-full border rounded px-2 py-1 bg-gray-50"
            value={safeText(form.categoriaContable)}
            readOnly
          />
          <p className="text-[11px] text-gray-500 mt-1">
            {isSale
              ? "Venta → ingresos"
              : isPurchase
                ? "Compra → gasto"
                : "Se mantiene según el tipo de transacción."}
          </p>
        </div>

        <div className="col-span-3">
          <label className="block text-xs">Descripción</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={safeText(form.description)}
            onChange={(e) =>
              setForm((d: any) => ({ ...d, description: e.target.value }))
            }
          />
        </div>

        <div className="col-span-3">
          <label className="block text-xs">Imágenes</label>
          <input
            type="file"
            multiple
            accept="image/*"
            className="w-full border rounded px-2 py-1 bg-white"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setImageFiles(files);
            }}
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Puedes subir una o varias imágenes al crear o editar el
            producto/servicio.
          </p>
        </div>

        {existingImages.length > 0 && (
          <div className="col-span-3">
            <label className="block text-xs mb-2">Imágenes actuales</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {existingImages.map((img: any, idx: number) => {
                const src =
                  typeof img === "string"
                    ? img
                    : img?.url || img?.src || img?.path || "";

                return (
                  <div key={`existing-${idx}`} className="border rounded p-2">
                    {src ? (
                      <img
                        src={src}
                        alt={`imagen-${idx}`}
                        className="w-full h-28 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-28 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        Sin vista previa
                      </div>
                    )}
                    <button
                      type="button"
                      className="mt-2 text-xs text-red-600"
                      onClick={() => removeExistingImage(idx)}
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {imageFiles.length > 0 && (
          <div className="col-span-3">
            <label className="block text-xs mb-2">
              Imágenes nuevas seleccionadas
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {newImagePreviews.map((img, idx) => (
                <div key={`new-${idx}`} className="border rounded p-2">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-28 object-cover rounded"
                  />
                  <div className="mt-1 text-[11px] truncate">{img.name}</div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-red-600"
                    onClick={() => removeSelectedFile(idx)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}