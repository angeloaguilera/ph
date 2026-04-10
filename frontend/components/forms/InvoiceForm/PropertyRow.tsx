// frontend/components/forms/InvoiceForm/PropertyRow.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import useCatalogs from "./hooks/useCatalogs";
import { genId } from "../../../lib/invoiceUtils";

/**
 * PropertyRow.tsx
 *
 * Componente para crear/editar/visualizar un inmueble dentro del formulario de invoice.
 * - Asegura que companyId se guarde correctamente en el payload (prop > initial > initial.meta).
 * - Normaliza companyId para no enviar "" al backend.
 * - Detecta propietario/contratista y marca el payload para que la capa de catálogo
 *   pueda enrutar a CONDO_PROPERTY_API o INVENTORY_PROPERTY_API.
 */

type PhotoItem = {
  id: string;
  file?: File | null;
  url?: string;
  name?: string;
  uploaded?: boolean;
};

type DocItem = {
  id: string;
  file?: File | null;
  name?: string;
  url?: string;
};

type PropertyForm = {
  id?: string;
  companyId?: string | null;
  title?: string;
  sku?: string;
  price?: number | null;
  address?: string | null;
  ownerId?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  lotSize?: number | null;
  yearBuilt?: number | null;
  parking?: string | number | null;
  hoaFees?: number | null;
  energyRating?: string | null;
  available?: boolean;
  meta?: Record<string, any>;
  photos?: PhotoItem[];
  documents?: DocItem[];
  // flags para el pipeline de catálogo
  isPropietario?: boolean;
  isProveedorContratista?: boolean;
  propietario?: boolean;
  contratista?: boolean;
  kind?: string;
};

const DEFAULT_FORM: PropertyForm = {
  id: undefined,
  companyId: null,
  title: "",
  sku: "",
  price: null,
  address: null,
  ownerId: null,
  description: "",
  category: "",
  tags: [],
  bedrooms: null,
  bathrooms: null,
  areaSqm: null,
  lotSize: null,
  yearBuilt: null,
  parking: null,
  hoaFees: null,
  energyRating: null,
  available: true,
  meta: {},
  photos: [],
  documents: [],
  isPropietario: false,
  isProveedorContratista: false,
  propietario: false,
  contratista: false,
  kind: "PROPERTY",
};

interface PropertyRowProps {
  initial?: Partial<PropertyForm>;
  companyId?: string | null;
  onSaved?: (p: PropertyForm) => void;
  onRemoved?: (id?: string) => void;
}

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeCompanyId(c?: string | null) {
  const s = safeText(c);
  return s === "" ? undefined : s;
}

function detectOwnerOrContractor(form: Partial<PropertyForm>): {
  isOwner: boolean;
  isContractor: boolean;
  route: "condo" | "inventory";
} {
  const meta = (form.meta ?? {}) as Record<string, any>;

  const rawText = [
    form.title,
    form.description,
    form.category,
    form.address,
    form.sku,
    meta.title,
    meta.description,
    meta.category,
    meta.address,
    meta.sku,
  ]
    .map((v) => safeText(v).toLowerCase())
    .join(" | ");

  const hasOwnerFlag = Boolean(
    form.isPropietario ||
      form.propietario ||
      meta.isPropietario ||
      meta.hasPropietario ||
      meta.propietario
  );

  const hasContractorFlag = Boolean(
    form.isProveedorContratista ||
      form.contratista ||
      meta.isProveedorContratista ||
      meta.contratista ||
      meta.hasContratista
  );

  const hasOwnerWord =
    rawText.includes("propiet") ||
    rawText.includes("dueñ") ||
    rawText.includes("dueño") ||
    rawText.includes("propiedad propia");

  const hasContractorWord =
    rawText.includes("contrat") ||
    rawText.includes("constructora") ||
    rawText.includes("obra") ||
    rawText.includes("edificación");

  const isOwner = hasOwnerFlag || hasOwnerWord;
  const isContractor = hasContractorFlag || hasContractorWord;

  return {
    isOwner,
    isContractor,
    route: isOwner || isContractor ? "condo" : "inventory",
  };
}

export default function PropertyRow({
  initial,
  companyId: companyIdProp,
  onSaved,
  onRemoved,
}: PropertyRowProps) {
  const {
    createCatalogProperty,
    updateCatalogProperty,
    removeCatalogProperty,
    cloneCatalogProperty,
  } = useCatalogs();

  const [form, setForm] = useState<PropertyForm>(() => ({
    ...DEFAULT_FORM,
    ...(initial ?? {}),
    companyId:
      normalizeCompanyId(companyIdProp) ??
      normalizeCompanyId(initial?.companyId) ??
      normalizeCompanyId(initial?.meta?.companyId) ??
      null,
    kind: "PROPERTY",
  }));

  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const mappedPhotos: PhotoItem[] =
      ((initial as any)?.photos ?? []).map?.((p: any) => {
        if (typeof p === "string") {
          return {
            id: genId(),
            url: p,
            name: p.split("/").pop() ?? p,
            uploaded: true,
          };
        }
        return {
          id: String(p?.id ?? genId()),
          url: p?.url ?? p?.dataURL ?? undefined,
          name: p?.name ?? p?.title ?? "",
          uploaded: !!p?.url && !p?.file,
        };
      }) ?? [];

    const mappedDocs: DocItem[] =
      ((initial as any)?.documents ?? []).map?.((d: any) => {
        if (typeof d === "string") {
          return {
            id: genId(),
            name: d.split("/").pop() ?? d,
            url: d,
          };
        }
        return {
          id: String(d?.id ?? genId()),
          name: d?.name ?? d?.title ?? "",
          url: d?.url ?? undefined,
        };
      }) ?? [];

    const fromInitialCompany =
      (initial as any)?.companyId ?? (initial as any)?.meta?.companyId ?? undefined;

    const resolvedCompanyId = normalizeCompanyId(companyIdProp ?? fromInitialCompany);

    setForm((prev) => ({
      ...DEFAULT_FORM,
      ...prev,
      ...(initial ?? {}),
      companyId: resolvedCompanyId ?? null,
      photos: mappedPhotos,
      documents: mappedDocs,
      meta: { ...((initial?.meta ?? {}) as Record<string, any>) },
      kind: "PROPERTY",
    }));
  }, [initial, companyIdProp]);

  useEffect(() => {
    if (companyIdProp !== undefined) {
      setForm((s) => ({
        ...s,
        companyId: normalizeCompanyId(companyIdProp) ?? s.companyId ?? null,
      }));
    }
  }, [companyIdProp]);

  const setField = <K extends keyof PropertyForm>(k: K, v: PropertyForm[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const added: PhotoItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const id = genId();
      try {
        const dataUrl = await fileToDataUrl(f);
        added.push({ id, file: f, url: dataUrl, name: f.name, uploaded: false });
      } catch (e) {
        console.warn("error leyendo archivo", f.name, e);
      }
    }

    setForm((s) => ({ ...s, photos: [...(s.photos ?? []), ...added] }));
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (id: string) =>
    setForm((s) => ({
      ...s,
      photos: (s.photos ?? []).filter((p) => p.id !== id),
    }));

  const handleDocFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const added: DocItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const id = genId();
      added.push({ id, file: f, name: f.name });
    }

    setForm((s) => ({ ...s, documents: [...(s.documents ?? []), ...added] }));
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const removeDoc = (id: string) =>
    setForm((s) => ({
      ...s,
      documents: (s.documents ?? []).filter((d) => d.id !== id),
    }));

  const validate = (): { ok: boolean; msg?: string } => {
    if (!safeText(form.title)) return { ok: false, msg: "El título es obligatorio." };
    if (form.price != null && Number(form.price) < 0) {
      return { ok: false, msg: "El precio no puede ser negativo." };
    }
    return { ok: true };
  };

  const buildPayload = () => {
    const finalCompanyId = normalizeCompanyId(
      companyIdProp ?? form.companyId ?? (form.meta ?? {})?.companyId
    );

    const ownerOrContractor = detectOwnerOrContractor(form);

    const payload: any = {
      ...form,
      kind: "PROPERTY",
      companyId: finalCompanyId,
      price: typeof form.price === "string" ? Number(form.price) : form.price,
      tags: Array.isArray(form.tags)
        ? form.tags
        : safeText(form.tags ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
      photos:
        (form.photos ?? []).map((p) => ({
          id: p.id,
          url: p.url,
          name: p.name,
        })) ?? [],
      documents:
        (form.documents ?? []).map((d) => ({
          id: d.id,
          name: d.name,
        })) ?? [],
      meta: {
        ...(form.meta ?? {}),
        companyId: finalCompanyId,
        hasPropietario: ownerOrContractor.isOwner,
        hasContratista: ownerOrContractor.isContractor,
        route: ownerOrContractor.route,
        isProperty: true,
      },
      isPropietario: ownerOrContractor.isOwner,
      isProveedorContratista: ownerOrContractor.isContractor,
      propietario: ownerOrContractor.isOwner,
      contratista: ownerOrContractor.isContractor,
    };

    if (payload.companyId === undefined) delete payload.companyId;

    return payload;
  };

  const handleSave = async () => {
    setError(null);
    const v = validate();
    if (!v.ok) {
      setError(v.msg ?? "Errores en el formulario.");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();

      if (form.id) {
        await updateCatalogProperty({ ...payload, id: String(form.id) });
      } else {
        const created: any = await createCatalogProperty(payload);
        if (created && created.id) {
          setForm((s) => ({ ...s, id: created.id }));
          payload.id = created.id;
        }
      }

      if (onSaved) onSaved(payload);
      alert("Propiedad guardada correctamente.");
    } catch (e) {
      console.error("save property failed", e);
      setError("Error guardando la propiedad. Revisa la consola.");
      alert("Error guardando la propiedad. Revisa la consola.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    if (!form.id) {
      if (onRemoved) onRemoved(undefined);
      setForm({
        ...DEFAULT_FORM,
        companyId: normalizeCompanyId(companyIdProp) ?? DEFAULT_FORM.companyId ?? null,
      });
      return;
    }

    const ok = confirm("¿Eliminar esta propiedad del catálogo?");
    if (!ok) return;

    setRemoving(true);
    try {
      await removeCatalogProperty(String(form.id));
      if (onRemoved) onRemoved(form.id);
      alert("Propiedad eliminada.");
      setForm({
        ...DEFAULT_FORM,
        companyId: normalizeCompanyId(companyIdProp) ?? DEFAULT_FORM.companyId ?? null,
      });
    } catch (e) {
      console.error("remove property failed", e);
      setError("Error eliminando la propiedad.");
      alert("Error eliminando la propiedad.");
    } finally {
      setRemoving(false);
    }
  };

  const handleClone = async () => {
    if (!form.id) {
      alert("No hay propiedad existente para clonar. Guarda primero.");
      return;
    }

    setCloning(true);
    try {
      const cloned: any = await cloneCatalogProperty(String(form.id));
      if (cloned && cloned.id) {
        alert("Propiedad clonada (revisa catálogo).");
      } else {
        alert("Operación de clonado solicitada (revisa catálogo).");
      }
    } catch (e) {
      console.error("clone failed", e);
      alert("Error al clonar.");
    } finally {
      setCloning(false);
    }
  };

  const handlePublish = async () => {
    setError(null);
    const v = validate();
    if (!v.ok) {
      setError(v.msg ?? "Errores en el formulario.");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      payload.meta = {
        ...(payload.meta ?? {}),
        publishPortal: true,
      };

      if (form.id) {
        await updateCatalogProperty({ ...payload, id: String(form.id) });
      } else {
        const created: any = await createCatalogProperty(payload);
        if (created && created.id) {
          setForm((s) => ({ ...s, id: created.id }));
          payload.id = created.id;
        }
      }

      setForm((s) => ({
        ...s,
        meta: { ...(s.meta ?? {}), publishPortal: true },
      }));

      alert("Propiedad publicada en portal (si el backend lo soporta).");
      if (onSaved) onSaved(payload);
    } catch (e) {
      console.error("publish failed", e);
      setError("Error publicando la propiedad.");
      alert("Error publicando la propiedad.");
    } finally {
      setSaving(false);
    }
  };

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  const tagsString = useMemo(
    () => (Array.isArray(form.tags) ? (form.tags as string[]).join(", ") : safeText(form.tags ?? "")),
    [form.tags]
  );

  const [tagInput, setTagInput] = useState("");

  const addTag = (t?: string) => {
    const raw = safeText(t ?? tagInput);
    if (!raw) return;
    setForm((s) => ({ ...s, tags: [...(s.tags ?? []), raw] }));
    setTagInput("");
  };

  const removeTag = (idx: number) =>
    setForm((s) => ({
      ...s,
      tags: (s.tags ?? []).filter((_, i) => i !== idx),
    }));

  const ownerRoute = detectOwnerOrContractor(form).route;

  return (
    <div className="property-row border rounded p-4 shadow-sm bg-white" role="region" aria-label="Formulario de inmueble">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-sm font-semibold">Inmueble</div>
            <div className="text-xs text-gray-500">
              Ruta detectada:{" "}
              <code>{ownerRoute === "condo" ? "CONDO_PROPERTY_API" : "INVENTORY_PROPERTY_API"}</code>
            </div>
          </div>

          <label className="block text-sm font-semibold">Título</label>
          <input
            aria-label="Título de la propiedad"
            value={form.title ?? ""}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Ej: Departamento 3A - Miraflores"
            className="w-full p-2 border rounded mt-1"
          />

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm font-semibold">Precio</label>
              <input
                aria-label="Precio"
                type="number"
                value={form.price ?? ""}
                onChange={(e) =>
                  setField("price", e.target.value === "" ? null : Number(e.target.value))
                }
                placeholder="0.00"
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold">SKU / Código</label>
              <input
                aria-label="SKU"
                value={form.sku ?? ""}
                onChange={(e) => setField("sku", e.target.value)}
                placeholder="SKU-1234"
                className="w-full p-2 border rounded mt-1"
              />
            </div>
          </div>

          <label className="block text-sm font-semibold mt-3">Dirección</label>
          <input
            aria-label="Dirección"
            value={form.address ?? ""}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="Calle, número, ciudad, país"
            className="w-full p-2 border rounded mt-1"
          />

          <label className="block text-sm font-semibold mt-3">Descripción</label>
          <textarea
            aria-label="Descripción"
            value={form.description ?? ""}
            onChange={(e) => setField("description", e.target.value)}
            rows={3}
            placeholder="Descripción breve del inmueble (características, estado, observaciones)."
            className="w-full p-2 border rounded mt-1"
          />

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm">Habitaciones</label>
              <input
                aria-label="Habitaciones"
                type="number"
                value={form.bedrooms ?? ""}
                onChange={(e) =>
                  setField("bedrooms", e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm">Baños</label>
              <input
                aria-label="Baños"
                type="number"
                value={form.bathrooms ?? ""}
                onChange={(e) =>
                  setField("bathrooms", e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm">Área (m²)</label>
              <input
                aria-label="Área en metros cuadrados"
                type="number"
                value={form.areaSqm ?? ""}
                onChange={(e) =>
                  setField("areaSqm", e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-full p-2 border rounded mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-sm">Antigüedad (año)</label>
              <input
                aria-label="Año de construcción"
                type="number"
                value={form.yearBuilt ?? ""}
                onChange={(e) =>
                  setField("yearBuilt", e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm">Parqueos</label>
              <input
                aria-label="Parqueos"
                value={String(form.parking ?? "")}
                onChange={(e) =>
                  setField("parking", e.target.value === "" ? null : e.target.value)
                }
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm">Cuota Condominio (mensual)</label>
              <input
                aria-label="Cuota de condominio"
                type="number"
                value={form.hoaFees ?? ""}
                onChange={(e) =>
                  setField("hoaFees", e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-full p-2 border rounded mt-1"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Categoría</label>
              <input
                aria-label="Categoría"
                value={form.category ?? ""}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="Departamento / Casa / Local / Terreno"
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <div>
              <label className="block text-sm">Tags (coma separadas)</label>
              <input
                aria-label="Tags"
                value={tagsString}
                onChange={(e) =>
                  setField(
                    "tags",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="vista al mar, reformado, nuevo"
                className="w-full p-2 border rounded mt-1"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.tags ?? []).map((t, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 text-sm"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      aria-label={`Eliminar tag ${t}`}
                      onClick={() => removeTag(idx)}
                      className="text-red-600 text-xs"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  aria-label="Agregar tag"
                  className="p-1 border rounded text-sm"
                  placeholder="Agregar tag y Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addTag()}
                  className="px-2 rounded bg-gray-200 text-sm"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm">Clasificación energética</label>
            <select
              aria-label="Clasificación energética"
              value={String(form.energyRating ?? "")}
              onChange={(e) =>
                setField("energyRating", e.target.value === "" ? null : e.target.value)
              }
              className="w-full p-2 border rounded mt-1"
            >
              <option value="">-- Sin especificar --</option>
              <option value="A">A (Excelente)</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </div>

          {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
        </div>

        <div style={{ width: 340 }} className="flex-shrink-0">
          <div>
            <label className="block text-sm font-semibold">Fotos</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoFiles(e.target.files)}
              className="w-full mt-2"
              aria-label="Subir fotos"
            />
            <div className="mt-3 grid grid-cols-2 gap-2 max-h-48 overflow-auto">
              {(form.photos ?? []).map((p) => (
                <div key={p.id} className="relative border rounded overflow-hidden">
                  {p.url ? (
                    <img
                      src={p.url}
                      alt={p.name ?? "foto"}
                      className="w-full h-24 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-24 flex items-center justify-center bg-gray-100 text-xs">
                      Sin preview
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                    aria-label={`Eliminar foto ${p.name ?? ""}`}
                  >
                    ✕
                  </button>
                  <div className="p-1 text-xs truncate">{p.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold">Documentos (contrato, planos)</label>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={(e) => handleDocFiles(e.target.files)}
              className="w-full mt-2"
              aria-label="Subir documentos"
            />
            <div className="mt-2 text-xs">
              {(form.documents ?? []).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between border rounded p-1 mb-1"
                >
                  <div className="truncate">{d.name}</div>
                  <button
                    type="button"
                    onClick={() => removeDoc(d.id)}
                    className="text-red-600 text-sm"
                    aria-label={`Eliminar documento ${d.name}`}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || removing}
            className={`px-4 py-2 ${saving ? "bg-blue-300" : "bg-blue-600"} text-white rounded`}
            aria-label="Guardar propiedad"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving || removing}
            className="px-4 py-2 bg-green-600 text-white rounded"
            aria-label="Publicar propiedad"
          >
            Publicar
          </button>
          <button
            type="button"
            onClick={handleClone}
            disabled={cloning || saving || removing}
            className="px-4 py-2 bg-gray-200 rounded"
            aria-label="Clonar propiedad"
          >
            {cloning ? "Clonando..." : "Clonar"}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing || saving}
            className={`px-4 py-2 ${removing ? "bg-red-300" : "bg-red-600"} text-white rounded`}
            aria-label="Eliminar propiedad"
          >
            {removing ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {form.id ? (
            <span>
              ID: <code>{form.id}</code>
              {form.companyId ? (
                <>
                  {" "}
                  &nbsp;|&nbsp; Company: <code>{form.companyId}</code>
                </>
              ) : null}
            </span>
          ) : (
            <span className="italic">
              Nuevo inmueble (aún no guardado)
              {form.companyId ? (
                <>
                  {" "}
                  — Company: <code>{form.companyId}</code>
                </>
              ) : null}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}