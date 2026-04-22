import { AUX_API, CONDO_AUXILIARY_API } from "../constants";
import type { PartyChecklist } from "../../../../../types/invoice";
import { isMarkedAsAuxiliary } from "./partyHelpers";

function resolveUrl(baseUrl: string) {
  const isAbsolute = /^https?:\/\//i.test(baseUrl);

  if (isAbsolute) {
    return new URL(baseUrl);
  }

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";

  return new URL(baseUrl, origin);
}

function buildUrlWithParams(
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined | null>
) {
  const url = resolveUrl(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function postJson(url: string, body: unknown) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return { resp, parsed, text };
}

async function getJson(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>
) {
  const finalUrl = params ? buildUrlWithParams(url, params) : resolveUrl(url).toString();

  const resp = await fetch(finalUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const text = await resp.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return { resp, parsed, text };
}

export async function saveChecklistToDb(partyId: string, checklist: PartyChecklist) {
  try {
    const { resp, parsed } = await postJson(AUX_API, {
      action: "upsert_checklist",
      partyId: String(partyId),
      checklist,
    });

    if (!resp.ok) {
      console.warn("[useParties] saveChecklistToDb failed", {
        status: resp.status,
        body: parsed,
        partyId,
      });
    }
  } catch (e) {
    console.warn("[useParties] saveChecklistToDb failed", e);
  }
}

/**
 * GET: obtener checklist de una party
 */
export async function getChecklistFromDb(partyId: string) {
  try {
    const { resp, parsed, text } = await getJson(AUX_API, {
      action: "get_checklist",
      partyId: String(partyId),
    });

    if (!resp.ok) {
      console.warn("[useParties] getChecklistFromDb failed", {
        status: resp.status,
        body: parsed,
        raw: text,
        partyId,
      });
      return null;
    }

    return parsed;
  } catch (e) {
    console.error("[useParties] getChecklistFromDb error", e, partyId);
    return null;
  }
}

/**
 * GET: buscar item auxiliar en Condo Auxiliary
 */
export async function getCondoAuxiliaryByIdentifier(identifier: string) {
  if (!identifier) return null;

  try {
    const { resp, parsed, text } = await getJson(CONDO_AUXILIARY_API, {
      action: "find",
      identifier: String(identifier),
    });

    if (!resp.ok) {
      console.warn("[useParties] getCondoAuxiliaryByIdentifier failed", {
        status: resp.status,
        body: parsed,
        raw: text,
        identifier,
      });
      return null;
    }

    return parsed;
  } catch (e) {
    console.error("[useParties] getCondoAuxiliaryByIdentifier error", e, identifier);
    return null;
  }
}

export async function trySendToCondoAuxiliary(rec: any) {
  if (!rec) return;

  try {
    if (!isMarkedAsAuxiliary(rec)) return;

    const name = String(rec?.name ?? rec?.companyName ?? "").trim();
    if (!name) return;

    const { resp, parsed } = await postJson(CONDO_AUXILIARY_API, {
      action: "upsert",
      item: rec,
    });

    if (!resp.ok) {
      console.warn("[useParties] CONDO_AUXILIARY_API upsert failed", {
        status: resp.status,
        body: parsed,
        sent: rec,
      });
    } else {
      console.info("[useParties] CONDO_AUXILIARY_API upsert success", {
        status: resp.status,
        body: parsed,
      });
    }
  } catch (e) {
    console.error("[useParties] trySendToCondoAuxiliary error", e, rec);
  }
}

export async function tryDeleteFromCondoAuxiliary(id: string) {
  if (!id) return;

  try {
    const { resp, parsed } = await postJson(CONDO_AUXILIARY_API, {
      action: "delete",
      id,
    });

    if (!resp.ok) {
      console.warn("[useParties] CONDO_AUXILIARY_API delete failed", {
        status: resp.status,
        body: parsed,
        id,
      });
    } else {
      console.info("[useParties] CONDO_AUXILIARY_API delete success", {
        status: resp.status,
        body: parsed,
        id,
      });
    }
  } catch (e) {
    console.error("[useParties] tryDeleteFromCondoAuxiliary failed", e, id);
  }
}

/**
 * GET: buscar registros done=false por identifier.
 * Luego llama deleteFn sobre cada elemento encontrado.
 */
export async function tryFindAndDeleteDoneFalseFromCondo(
  identifier: string,
  deleteFn: (id: string) => Promise<void> = tryDeleteFromCondoAuxiliary
) {
  if (!identifier) return;

  try {
    const { resp, parsed, text } = await getJson(CONDO_AUXILIARY_API, {
      action: "find",
      identifier: String(identifier),
      done: false,
    });

    if (!resp.ok) {
      console.warn("[useParties] tryFindAndDeleteDoneFalseFromCondo failed", {
        status: resp.status,
        body: parsed,
        raw: text,
        identifier,
      });
      return;
    }

    const items: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
      ? parsed.items
      : [];

    if (!items.length) return;

    for (const it of items) {
      try {
        const itemId = it?.id ?? it?.companyId ?? identifier;
        await deleteFn(itemId);
      } catch (innerErr) {
        console.warn(
          "[useParties] tryFindAndDeleteDoneFalseFromCondo - error en item loop",
          innerErr,
          it
        );
      }
    }
  } catch (e) {
    console.error("[useParties] tryFindAndDeleteDoneFalseFromCondo failed", e, identifier);
  }
}