"use client";

import React, { useEffect, useRef, useState } from "react";

type PartyType = "NATURAL" | "JURIDICA";
type DocumentType = "cedula" | "rif";

type SeniatResponse = {
  ok?: boolean;
  found?: boolean;
  message?: string;
  rif?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  activityEconomic?: string;
  condition?: string;
  retentionNote?: string;
  rifMatchedLine?: string;
  rawText?: string;
  needsManualReview?: boolean;
  captchaDetected?: boolean;
  captchaUrl?: string;
  preview?: string;
  checklist?: any[];
  partyType?: PartyType;
  documentType?: DocumentType;
};

type Props = {
  draft: any;
  setNewPartyDraft: React.Dispatch<React.SetStateAction<any>>;
  className?: string;
};

const DEBUG_SENIAT = true;

function cleanRifInputPreserveCase(value: string) {
  return String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .trim();
}

function cleanNaturalId(value: string) {
  return String(value || "")
    .replace(/\D/g, "")
    .trim();
}

function getDocumentType(partyType?: PartyType): DocumentType {
  return partyType === "NATURAL" ? "cedula" : "rif";
}

function buildSeniatUrl(rif: string, documentType: DocumentType) {
  const params = new URLSearchParams();
  params.set("rif", rif);

  if (documentType === "cedula") {
    params.set("tipo", "cedula");
    params.set("sufijo", "cedula");
  } else {
    params.set("tipo", "rif");
  }

  return `/api/seniat2?${params.toString()}`;
}

async function readResponseAsJsonSafe(res: Response): Promise<{
  json: SeniatResponse | null;
  text: string;
  contentType: string;
}> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!text.trim()) {
    return { json: null, text: "", contentType };
  }

  try {
    return { json: JSON.parse(text) as SeniatResponse, text, contentType };
  } catch {
    if (DEBUG_SENIAT) console.error("[SENIAT] JSON inválido:", text);
    return { json: null, text, contentType };
  }
}

export default function SeniatRifConsult({
  draft,
  setNewPartyDraft,
  className,
}: Props) {
  const [consultingSeniat, setConsultingSeniat] = useState(false);
  const [seniatMessage, setSeniatMessage] = useState("");
  const [naturalDocument, setNaturalDocument] = useState("");
  const requestSeq = useRef(0);

  const currentPartyType: PartyType =
    draft?.partyType === "JURIDICA" ? "JURIDICA" : "NATURAL";
  const isNatural = currentPartyType === "NATURAL";
  const documentType = getDocumentType(currentPartyType);

  useEffect(() => {
    if (isNatural) return;
    setNaturalDocument("");
  }, [isNatural]);

  const labelText = isNatural ? "Cédula para consultar SENIAT" : "RIF";
  const placeholderText = isNatural ? "Ej: 12345678" : "Ej: J123456789";

  const applySeniatData = (data: SeniatResponse, rifFallback: string) => {
    const rifFinal = cleanRifInputPreserveCase(data.rif || rifFallback);

    if (DEBUG_SENIAT) {
      console.groupCollapsed(`[SENIAT] Aplicando datos para ${rifFinal}`);
      console.log("Respuesta parseada:", data);
      console.groupEnd();
    }

    setNewPartyDraft((d: any) => {
      const base = { ...(d ?? {}) };

      base.partyType = currentPartyType;
      base.documentType = documentType;

      if (!isNatural) {
        base.rif = rifFinal;
      }

      if (isNatural) {
        if (data.firstName) base.firstName = data.firstName;
        if (data.lastName) base.lastName = data.lastName;
      } else {
        if (data.companyName) {
          base.companyName = data.companyName;
          base.firstName = "";
          base.lastName = "";
        }
        if (data.firstName) base.firstName = data.firstName;
        if (data.lastName) base.lastName = data.lastName;
      }

      base.activityEconomic = data.activityEconomic || "";
      base.condition = data.condition || "";
      base.retentionNote = data.retentionNote || "";
      base.rifMatchedLine = data.rifMatchedLine || "";
      base.rawText = data.rawText || "";
      base.needsManualReview = Boolean(data.needsManualReview);
      base.checklist = Array.isArray(data.checklist)
        ? data.checklist
        : base.checklist || [];

      return base;
    });
  };

  const consultarSeniat = async (rifBase: string) => {
    const seq = ++requestSeq.current;
    const rif = isNatural
      ? cleanNaturalId(rifBase)
      : cleanRifInputPreserveCase(rifBase);

    if (!rif) {
      setSeniatMessage("Escribe un documento antes de consultar SENIAT.");
      if (DEBUG_SENIAT)
        console.warn("[SENIAT] Consulta cancelada: documento vacío");
      return;
    }

    setConsultingSeniat(true);
    setSeniatMessage("Consultando SENIAT...");

    const url = buildSeniatUrl(rif, documentType);

    if (DEBUG_SENIAT) {
      console.groupCollapsed(`[SENIAT] Consulta iniciada para ${rif}`);
      console.log("Documento enviado:", rif);
      console.log("Tipo de documento:", documentType);
      console.log("URL:", url);
      console.log("Draft actual:", draft);
      console.groupEnd();
    }

    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const { json: data, text, contentType } = await readResponseAsJsonSafe(
        res
      );
      const responseData: SeniatResponse = data ?? {};

      if (seq !== requestSeq.current) return;

      if (DEBUG_SENIAT) {
        console.log("HTTP status:", res.status, res.statusText);
        console.log("Content-Type:", contentType);
        console.log("Body crudo:", text);
        console.log("JSON recibido:", responseData);
      }

      if (responseData.captchaDetected) {
        setNewPartyDraft((d: any) => ({
          ...(d ?? {}),
          needsManualReview: true,
          partyType: currentPartyType,
          documentType,
        }));

        setSeniatMessage("SENIAT mostró captcha. Revisión manual activada.");

        if (DEBUG_SENIAT) console.warn("[SENIAT] Captcha detectado o bloqueo.");
        return;
      }

      if (!res.ok || !responseData.ok) {
        const fallbackMessage =
          responseData.message ||
          responseData.preview ||
          (text ? text.slice(0, 180) : "") ||
          `Error HTTP ${res.status}`;

        if (DEBUG_SENIAT) {
          console.error("[SENIAT] Respuesta con error:", {
            httpOk: res.ok,
            status: res.status,
            contentType,
            data: responseData,
            text,
          });
        }

        throw new Error(fallbackMessage);
      }

      applySeniatData(responseData, rif);

      if (responseData.found) {
        setSeniatMessage("Consulta SENIAT completada.");
        if (DEBUG_SENIAT) console.log("[SENIAT] Coincidencia encontrada.");
      } else {
        setSeniatMessage(
          "No se encontró coincidencia automática. Revisión manual activada."
        );
        if (DEBUG_SENIAT)
          console.warn("[SENIAT] No hubo coincidencia automática.");
      }
    } catch (error: any) {
      if (seq !== requestSeq.current) return;

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Error consultando SENIAT";

      setSeniatMessage(message);
      setNewPartyDraft((d: any) => ({
        ...(d ?? {}),
        needsManualReview: true,
        partyType: currentPartyType,
        documentType,
      }));

      if (DEBUG_SENIAT) {
        console.error("[SENIAT] Error final:", error);
      }
    } finally {
      if (seq === requestSeq.current) {
        setConsultingSeniat(false);
      }
    }
  };

  const handleConsultarSeniat = async () => {
    const rifActual = isNatural
      ? cleanNaturalId(naturalDocument)
      : cleanRifInputPreserveCase(draft?.rif);

    if (!rifActual) {
      setSeniatMessage("Escribe un documento antes de consultar SENIAT.");
      return;
    }

    await consultarSeniat(rifActual);
  };

  return (
    <div className={className}>
      <label className="block text-xs font-medium">{labelText}</label>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          value={isNatural ? naturalDocument : draft?.rif || ""}
          placeholder={placeholderText}
          onChange={(e) => {
            const rawValue = String(e.target.value ?? "");

            if (isNatural) {
              const value = cleanNaturalId(rawValue);
              setNaturalDocument(value);
              return;
            }

            const value = cleanRifInputPreserveCase(rawValue);

            setNewPartyDraft((d: any) => {
              const base = { ...(d ?? {}) };
              base.rif = value;
              base.partyType = currentPartyType;
              base.documentType = documentType;
              base.needsManualReview = false;
              base.rifMatchedLine = "";
              base.activityEconomic = "";
              base.condition = "";
              base.retentionNote = "";
              base.rawText = "";
              return base;
            });
          }}
        />

        <button
          type="button"
          onClick={handleConsultarSeniat}
          disabled={consultingSeniat}
          className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-60"
        >
          {consultingSeniat ? "Consultando..." : "Consultar SENIAT"}
        </button>
      </div>

      {seniatMessage ? (
        <div className="mt-1 text-xs text-gray-700">{seniatMessage}</div>
      ) : null}
    </div>
  );
}