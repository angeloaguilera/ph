// AnnexesRow.tsx
// Componente independiente para gestionar anexos/documentos
// Copia y pega entero en tu proyecto.

import React, { useEffect, useRef, useState } from "react";

/* ------------------ Tipos ------------------ */
export type DocItem = {
  id: string;
  file?: File | null;
  name: string;
  url?: string;
  fromCatalog?: boolean;
  catalogRefId?: string | null;
  description?: string;
  tags?: string[];
  type?: "contrato" | "plano" | "permiso" | "cedula" | "recibo" | "otro";
  date?: string | null; // ISO date
  expiresAt?: string | null; // ISO date
  private?: boolean;
  notes?: string;
  uploadedBy?: string | null;
  sizeBytes?: number | null;
};

export interface CatalogAnnexess {
  id: string;
  name: string;
  companyId?: string | null;
  url?: string;
}

export interface AnnexesRowProps {
  documents?: DocItem[];
  onChange?: (docs: DocItem[]) => void;

  catalogEnabled?: boolean;
  partyKey?: string | null;
  availableAnexos?: CatalogAnnexess[];
  addAttachmentFromCatalog?: (anexoId: string) => Promise<Partial<DocItem> | void>;
  removeCatalogAttachment?: (anexoId: string) => Promise<void>;
}

/* ------------------ util ------------------ */
function genId(prefix = "") {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ------------------ Componente ------------------ */
export default function AnnexesRow({
  documents: initialDocs = [],
  onChange,
  catalogEnabled = false,
  partyKey = null,
  availableAnexos = [],
  addAttachmentFromCatalog,
  removeCatalogAttachment,
}: AnnexesRowProps) {
  const [docs, setDocs] = useState<DocItem[]>(() =>
    (initialDocs ?? []).map((d) => ({ ...d, id: String(d.id ?? genId()) }))
  );

  useEffect(() => {
    setDocs((initialDocs ?? []).map((d) => ({ ...d, id: String(d.id ?? genId()) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDocs]);

  useEffect(() => {
    if (onChange) onChange(docs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  const docInputRef = useRef<HTMLInputElement | null>(null);
  const anexoFileRef = useRef<HTMLInputElement | null>(null);

  /* --- subir archivos (varios) --- */
  const handleDocFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: DocItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const id = genId("doc-");
      const sizeBytes = typeof f.size === "number" ? f.size : null;
      let dataUrl: string | undefined = undefined;
      try {
        dataUrl = await fileToDataUrl(f);
      } catch (e) {
        console.warn("no se pudo leer archivo para preview", e);
      }
      added.push({
        id,
        file: f,
        name: f.name,
        url: dataUrl,
        fromCatalog: false,
        sizeBytes,
      });
    }
    setDocs((s) => [...s, ...added]);
    if (docInputRef.current) docInputRef.current.value = "";
  };

  /* --- eliminar documento --- */
  const removeDoc = (id: string) => {
    const doc = docs.find((d) => d.id === id);
    if (doc?.fromCatalog && doc.catalogRefId && removeCatalogAttachment) {
      removeCatalogAttachment(doc.catalogRefId).catch((e) => console.warn("error eliminando anexo de catálogo", e));
    }
    setDocs((s) => s.filter((d) => d.id !== id));
  };

  /* --- catálogo: agregar anexo desde catálogo --- */
  const [selectedAnexoId, setSelectedAnexoId] = useState<string>("");

  const handleAddAnexoFromCatalog = async (id: string) => {
    if (!id) return;
    if (addAttachmentFromCatalog) {
      try {
        const res = await addAttachmentFromCatalog(id);
        const anexo = availableAnexos.find((a) => a.id === id);
        const doc: DocItem = {
          id: genId("cat-"),
          name: (res && (res.name as string)) ?? anexo?.name ?? "anexo",
          url: (res && (res.url as string)) ?? anexo?.url,
          fromCatalog: true,
          catalogRefId: id,
          description: (res as any)?.description ?? undefined,
          tags: (res as any)?.tags ?? undefined,
          type: (res as any)?.type ?? undefined,
          uploadedBy: (res as any)?.uploadedBy ?? null,
        };
        setDocs((s) => [...s, doc]);
        setSelectedAnexoId("");
      } catch (e) {
        console.error("addAttachmentFromCatalog failed", e);
        alert("Error agregando anexo desde catálogo.");
      }
      return;
    }

    const anexo = availableAnexos.find((a) => a.id === id);
    if (!anexo) return alert("Anexo no encontrado en catálogo.");
    const doc: DocItem = {
      id: genId("cat-"),
      name: anexo.name,
      url: anexo.url,
      fromCatalog: true,
      catalogRefId: id,
    };
    setDocs((s) => [...s, doc]);
    setSelectedAnexoId("");
  };

  /* habilitación de anexos: catálogo o mínimo título+dirección (en este componente asumimos catálogoFlag) */
  const anexosEnabled = (catalogEnabled && !!partyKey) || true; // Si quieres la regla original, pásala via props y controla en el padre.

  /* ------------------ FORMULARIO INLINE: crear anexo (ampliado) ------------------ */
  const [showAnexoForm, setShowAnexoForm] = useState(false);
  const [anexoName, setAnexoName] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [anexoDescription, setAnexoDescription] = useState("");
  const [anexoType, setAnexoType] = useState<DocItem["type"]>("otro");
  const [anexoDate, setAnexoDate] = useState<string | null>(null);
  const [anexoExpiresAt, setAnexoExpiresAt] = useState<string | null>(null);
  const [anexoPrivate, setAnexoPrivate] = useState(false);
  const [anexoNotes, setAnexoNotes] = useState("");
  const [anexoUploadedBy, setAnexoUploadedBy] = useState<string | null>(null);
  const [anexoTags, setAnexoTags] = useState<string[]>([]);
  const [anexoTagInput, setAnexoTagInput] = useState("");
  const [anexoError, setAnexoError] = useState<string | null>(null);

  const resetAnexoForm = () => {
    setAnexoName("");
    setAnexoUrl("");
    setAnexoFile(null);
    if (anexoFileRef.current) anexoFileRef.current.value = "";
    setAnexoDescription("");
    setAnexoType("otro");
    setAnexoDate(null);
    setAnexoExpiresAt(null);
    setAnexoPrivate(false);
    setAnexoNotes("");
    setAnexoUploadedBy(null);
    setAnexoTags([]);
    setAnexoTagInput("");
    setAnexoError(null);
  };

  const handleAnexoFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setAnexoFile(null);
      return;
    }
    setAnexoFile(files[0]);
  };

  const addAnexoTag = (t?: string) => {
    const raw = String(t ?? anexoTagInput ?? "").trim();
    if (!raw) return;
    setAnexoTags((s) => [...s, raw]);
    setAnexoTagInput("");
  };
  const removeAnexoTag = (idx: number) => setAnexoTags((s) => s.filter((_, i) => i !== idx));

  const createAnexoInline = async () => {
    setAnexoError(null);
    const name = String(anexoName ?? "").trim();
    if (!name) {
      setAnexoError("El nombre del anexo es obligatorio.");
      return;
    }

    let url: string | undefined = undefined;
    let dataUrl: string | undefined = undefined;
    let sizeBytes: number | null = null;

    if (anexoFile) {
      try {
        dataUrl = await fileToDataUrl(anexoFile);
        sizeBytes = typeof anexoFile.size === "number" ? anexoFile.size : null;
      } catch (e) {
        console.error("error leyendo archivo anexo", e);
        setAnexoError("No se pudo leer el archivo. Intenta nuevamente.");
        return;
      }
    } else if (anexoUrl) {
      url = anexoUrl.trim();
    }

    const doc: DocItem = {
      id: genId("new-"),
      name,
      file: anexoFile ?? undefined,
      url: dataUrl ?? url,
      fromCatalog: false,
      description: anexoDescription || undefined,
      tags: anexoTags.length ? anexoTags : undefined,
      type: anexoType,
      date: anexoDate ?? null,
      expiresAt: anexoExpiresAt ?? null,
      private: anexoPrivate,
      notes: anexoNotes || undefined,
      uploadedBy: anexoUploadedBy ?? null,
      sizeBytes,
    };

    setDocs((s) => [...s, doc]);
    resetAnexoForm();
    setShowAnexoForm(false);
  };

  /* ------------------ EDIT INLINE POR ITEM ------------------ */
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  // <-- aquí permitimos objetos parciales porque durante edición sólo actualizamos campos sueltos
  const [editDocState, setEditDocState] = useState<Record<string, Partial<DocItem>>>({});

  const startEditDoc = (doc: DocItem) => {
    setEditingDocId(doc.id);
    // guardamos el doc completo inicialmente (ok porque DocItem extiende Partial<DocItem>)
    setEditDocState((s) => ({ ...s, [doc.id]: { ...doc } }));
  };
  const setEditDocField = (docId: string, k: keyof DocItem, v: any) => {
    setEditDocState((s) => ({ ...s, [docId]: { ...(s[docId] ?? {}), [k]: v } }));
  };
  const saveEditedDoc = (docId: string) => {
    const edited = editDocState[docId];
    if (!edited) return;
    // merge partial edit sobre el doc existente
    setDocs((s) => s.map((d) => (d.id === docId ? { ...d, ...edited } : d)));
    setEditDocState((s) => {
      const copy = { ...s };
      delete copy[docId];
      return copy;
    });
    setEditingDocId(null);
  };
  const cancelEditDoc = (docId: string) => {
    setEditDocState((s) => {
      const copy = { ...s };
      delete copy[docId];
      return copy;
    });
    setEditingDocId(null);
  };

  /* ------------------ RENDER ------------------ */
  return (
    <div className="anexos-row border rounded p-3 bg-white">
      <div>
        <label className="block text-sm font-semibold">Documentos / Anexos</label>
        <input ref={docInputRef} type="file" accept=".pdf,image/*" multiple onChange={(e) => handleDocFiles(e.target.files)} className="w-full mt-2" aria-label="Subir documentos" />

        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Anexos (Catálogo)</label>
          <div className="flex gap-2">
            <select
              className="flex-1 border rounded px-2 py-1"
              value={selectedAnexoId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__create__") {
                  setShowAnexoForm(true);
                  setSelectedAnexoId("");
                  return;
                }
                setSelectedAnexoId(v);
              }}
              disabled={!anexosEnabled && availableAnexos.length === 0}
            >
              <option value="">-- Seleccionar anexo --</option>
              <option value="__create__">-- Crear nuevo anexo --</option>
              {availableAnexos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                if (!anexosEnabled) return alert("Anexos deshabilitados.");
                if (!selectedAnexoId) return alert("Selecciona un anexo para agregar.");
                handleAddAnexoFromCatalog(selectedAnexoId);
              }}
              className={`px-3 py-1 ${anexosEnabled ? "bg-gray-200" : "bg-gray-100 text-gray-400"} rounded`}
              disabled={!anexosEnabled}
            >
              Agregar
            </button>

            <button
              type="button"
              onClick={() => {
                if (!anexosEnabled) return alert("Anexos deshabilitados.");
                if (!selectedAnexoId) return alert("Selecciona un anexo para eliminar.");
                if (!confirm("Eliminar este anexo del catálogo?")) return;
                removeCatalogAttachment?.(selectedAnexoId).catch((e) => console.warn("error borrando anexo", e));
                setSelectedAnexoId("");
                alert("Solicitud de eliminación enviada (si la función está implementada).");
              }}
              className={`px-3 py-1 ${anexosEnabled ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"} rounded`}
              disabled={!anexosEnabled}
            >
              Eliminar
            </button>
          </div>
          {!anexosEnabled ? (
            <div className="text-xs text-gray-500 mt-1">Anexos deshabilitados.</div>
          ) : (
            <div className="text-xs text-gray-500 mt-1">Anexos habilitados — puedes seleccionar, crear o editar anexos.</div>
          )}
        </div>

        {/* FORMULARIO INLINE para crear ANEXO */}
        {showAnexoForm && (
          <div className="mt-3 border rounded p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Crear nuevo anexo</div>
              <button type="button" onClick={() => { resetAnexoForm(); setShowAnexoForm(false); }} className="text-sm text-gray-500">
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre *</label>
                <input value={anexoName} onChange={(e) => setAnexoName(e.target.value)} placeholder="Ej: Plano eléctrico, Contrato" className="w-full p-2 border rounded text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Tipo</label>
                <select value={anexoType} onChange={(e) => setAnexoType(e.target.value as DocItem["type"])} className="w-full p-2 border rounded text-sm">
                  <option value="contrato">Contrato</option>
                  <option value="plano">Plano</option>
                  <option value="permiso">Permiso</option>
                  <option value="cedula">Cédula</option>
                  <option value="recibo">Recibo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descripción</label>
                <input value={anexoDescription} onChange={(e) => setAnexoDescription(e.target.value)} placeholder="Descripción breve" className="w-full p-2 border rounded text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Fecha</label>
                  <input type="date" value={anexoDate ?? ""} onChange={(e) => setAnexoDate(e.target.value || null)} className="w-full p-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Expira (opcional)</label>
                  <input type="date" value={anexoExpiresAt ?? ""} onChange={(e) => setAnexoExpiresAt(e.target.value || null)} className="w-full p-2 border rounded text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">URL (opcional)</label>
                <input value={anexoUrl} onChange={(e) => setAnexoUrl(e.target.value)} placeholder="https://..." className="w-full p-2 border rounded text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subir archivo (opcional)</label>
                <input ref={anexoFileRef} type="file" accept=".pdf,image/*" onChange={(e) => handleAnexoFileChange(e.target.files)} className="w-full text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Tags</label>
                <div className="flex gap-2">
                  <input className="p-2 border rounded text-sm flex-1" placeholder="Agregar tag y Enter" value={anexoTagInput} onChange={(e) => setAnexoTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAnexoTag(); } }} />
                  <button type="button" onClick={() => addAnexoTag()} className="px-3 py-1 bg-gray-200 rounded text-sm">Añadir</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {anexoTags.map((t, i) => (
                    <span key={i} className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 text-xs">
                      {t}
                      <button onClick={() => removeAnexoTag(i)} className="text-red-600">✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={anexoPrivate} onChange={() => setAnexoPrivate((v) => !v)} /> Privado (solo usuarios autorizados)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Notas internas</label>
                <textarea value={anexoNotes} onChange={(e) => setAnexoNotes(e.target.value)} className="w-full p-2 border rounded text-sm" rows={2} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subido por (opcional)</label>
                <input value={anexoUploadedBy ?? ""} onChange={(e) => setAnexoUploadedBy(e.target.value || null)} placeholder="Nombre del usuario" className="w-full p-2 border rounded text-sm" />
              </div>

              {anexoError && <div className="text-xs text-red-600">{anexoError}</div>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => createAnexoInline()} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Crear anexo</button>
                <button type="button" onClick={() => { resetAnexoForm(); setShowAnexoForm(false); }} className="px-3 py-1 bg-gray-200 rounded text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* LISTADO DE ANEXOS con edición inline */}
        <div className="mt-3 space-y-2 text-sm">
          {docs.map((d) => {
            const isEditing = editingDocId === d.id;
            // editState puede ser Partial<DocItem> o undefined
            const editState = (editDocState[d.id] ?? (isEditing ? { ...d } : undefined)) as Partial<DocItem> | undefined;
            return (
              <div key={d.id} className="border rounded p-2 bg-white">
                {!isEditing ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium truncate">
                        {d.name} {d.fromCatalog && <span className="text-indigo-600 text-xs ml-2">(Catálogo)</span>}
                      </div>
                      {d.type && <div className="text-xs text-gray-600">Tipo: {d.type}</div>}
                      {d.description && <div className="text-xs text-gray-600 truncate"> {d.description}</div>}
                      {Array.isArray(d.tags) && d.tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{d.tags.map((t, i) => <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t}</span>)}</div>}
                      {d.url && <div className="text-xs mt-1"><a href={d.url} target="_blank" rel="noreferrer" className="underline">Ver</a></div>}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-500">{d.sizeBytes ? `${Math.round((d.sizeBytes / 1024) * 100) / 100} KB` : ""}</div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditDoc(d)} className="px-2 py-1 text-xs bg-gray-100 rounded">Editar</button>
                        <button onClick={() => removeDoc(d.id)} className="px-2 py-1 text-xs text-red-600 rounded">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Formulario de edición para este anexo
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Nombre</label>
                        <input value={editState?.name ?? ""} onChange={(e) => setEditDocField(d.id, "name", e.target.value)} className="w-full p-2 border rounded text-sm" />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">Tipo</label>
                        <select value={editState?.type ?? "otro"} onChange={(e) => setEditDocField(d.id, "type", e.target.value as DocItem["type"])} className="w-full p-2 border rounded text-sm">
                          <option value="contrato">Contrato</option>
                          <option value="plano">Plano</option>
                          <option value="permiso">Permiso</option>
                          <option value="cedula">Cédula</option>
                          <option value="recibo">Recibo</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">Descripción</label>
                        <input value={editState?.description ?? ""} onChange={(e) => setEditDocField(d.id, "description", e.target.value)} className="w-full p-2 border rounded text-sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Fecha</label>
                          <input type="date" value={editState?.date ?? ""} onChange={(e) => setEditDocField(d.id, "date", e.target.value || null)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Expira</label>
                          <input type="date" value={editState?.expiresAt ?? ""} onChange={(e) => setEditDocField(d.id, "expiresAt", e.target.value || null)} className="w-full p-2 border rounded text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">URL</label>
                        <input value={editState?.url ?? ""} onChange={(e) => setEditDocField(d.id, "url", e.target.value)} className="w-full p-2 border rounded text-sm" />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">Tags</label>
                        <EditDocTags docId={d.id} editState={editState ?? d} setEditDocField={setEditDocField} />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">Notas internas</label>
                        <textarea value={editState?.notes ?? ""} onChange={(e) => setEditDocField(d.id, "notes", e.target.value)} className="w-full p-2 border rounded text-sm" rows={2} />
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => saveEditedDoc(d.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Guardar</button>
                        <button onClick={() => cancelEditDoc(d.id)} className="px-3 py-1 bg-gray-200 rounded text-sm">Cancelar</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Componente auxiliar para editar tags de un doc ---------- */
function EditDocTags({ docId, editState, setEditDocField }: { docId: string; editState: Partial<DocItem>; setEditDocField: (docId: string, k: keyof DocItem, v: any) => void }) {
  const [localInput, setLocalInput] = useState("");
  const tags = editState?.tags ?? [];

  const add = () => {
    const raw = String(localInput ?? "").trim();
    if (!raw) return;
    const next = [...(tags ?? []), raw];
    setEditDocField(docId, "tags", next);
    setLocalInput("");
  };
  const remove = (i: number) => {
    const next = (tags ?? []).filter((_, idx) => idx !== i);
    setEditDocField(docId, "tags", next);
  };

  return (
    <div>
      <div className="flex gap-2">
        <input className="p-2 border rounded text-sm flex-1" placeholder="Agregar tag y Enter" value={localInput} onChange={(e) => setLocalInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} className="px-3 py-1 bg-gray-200 rounded text-sm">Añadir</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(tags ?? []).map((t, i) => (
          <span key={i} className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 text-xs">
            {t}
            <button onClick={() => remove(i)} className="text-red-600">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}