type AnyRecord = Record<string, any>;

function isPlainObject(value: any): value is AnyRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneObject<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // fallback abajo
    }
  }

  return JSON.parse(JSON.stringify(value));
}

function readStoredUserIdentifier(): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;

    const keys = [
      "currentUser",
      "user",
      "authUser",
      "sessionUser",
      "auth",
      "session",
      "profile",
    ];

    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);

        if (typeof parsed === "string" && parsed.trim()) return parsed.trim();

        if (isPlainObject(parsed)) {
          const candidates = [
            parsed.id,
            parsed._id,
            parsed.userId,
            parsed.user_id,
            parsed.email,
            parsed.username,
            parsed.name,
          ];

          for (const c of candidates) {
            if (typeof c === "string" && c.trim()) return c.trim();
            if (typeof c === "number" && Number.isFinite(c)) return String(c);
          }
        }

        if (typeof raw === "string" && raw.trim()) {
          return raw.trim();
        }
      } catch {
        if (typeof raw === "string" && raw.trim()) return raw.trim();
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function inferApprovedBy(source: AnyRecord) {
  const candidates = [
    source.approvedBy,
    source.userId,
    source.user_id,
    source.user?.id,
    source.user?.email,
    source.meta?.approvedBy,
    source.meta?.approved_by,
    source.meta?.approvedById,
    source.meta?.approved_by_id,
    source.meta?.checklist?.approvedBy,
    source.meta?.checklist?.approved_by,
    source.checklist?.approvedBy,
    source.checklist?.approved_by,
    readStoredUserIdentifier(),
    "system",
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return "system";
}

function ensureChecklistObject(target: AnyRecord) {
  if (!isPlainObject(target)) return target;

  const approvedBy = inferApprovedBy(target);

  if (Array.isArray(target.checklist)) {
    target.checklist = {
      approved: true,
      approvedBy,
      items: target.checklist,
    };
  } else if (isPlainObject(target.checklist)) {
    target.checklist.approved = true;
    target.checklist.approvedBy =
      target.checklist.approvedBy || target.checklist.approved_by || approvedBy;
  } else if (target.checklist == null || target.checklist === "") {
    target.checklist = {
      approved: true,
      approvedBy,
    };
  }

  if (!isPlainObject(target.meta)) {
    target.meta = {};
  }

  if (Array.isArray(target.meta.checklist)) {
    target.meta.checklist = {
      approved: true,
      approvedBy,
      items: target.meta.checklist,
    };
  } else if (isPlainObject(target.meta.checklist)) {
    target.meta.checklist.approved = true;
    target.meta.checklist.approvedBy =
      target.meta.checklist.approvedBy ||
      target.meta.checklist.approved_by ||
      approvedBy;
  } else {
    target.meta.checklist = {
      approved: true,
      approvedBy,
    };
  }

  return target;
}

function patchMissingItemName(payload: AnyRecord) {
  if (payload && payload.action === "upsert" && isPlainObject(payload.item)) {
    const it = payload.item;

    const hasName = typeof it.name === "string" && it.name.trim() !== "";

    if (!hasName) {
      const candidate =
        (typeof it.title === "string" && it.title.trim()) ||
        (typeof it.productName === "string" && it.productName.trim()) ||
        (typeof it.nombre === "string" && it.nombre.trim()) ||
        (typeof it.description === "string" && it.description.trim()) ||
        "";

      const idPart = it.id ? String(it.id) : `${Date.now()}`;
      it.name = candidate || `Producto ${idPart}`;
      payload.item = it;

      console.warn(
        "[apiPostJson] note: patched missing item.name from title/productName/nombre/description/fallback ->",
        it.name
      );
    }
  }

  return payload;
}

function inferTransaction(payload: AnyRecord) {
  return (
    (typeof payload.transaction === "string" && payload.transaction.trim()) ||
    (typeof payload.action === "string" && payload.action.trim()) ||
    (typeof payload.op === "string" && payload.op.trim()) ||
    (typeof payload.operation === "string" && payload.operation.trim()) ||
    (typeof payload.type === "string" && payload.type.trim()) ||
    "upsert"
  );
}

function normalizeBody(input: any) {
  if (!isPlainObject(input)) {
    return input;
  }

  const payload = cloneObject(input) as AnyRecord;

  try {
    patchMissingItemName(payload);
  } catch (patchErr) {
    console.warn("[apiPostJson] warning while patching item.name", patchErr);
  }

  try {
    ensureChecklistObject(payload);
  } catch (metaErr) {
    console.warn("[apiPostJson] warning while ensuring checklist", metaErr);
  }

  const hasTransaction =
    typeof payload.transaction === "string" && payload.transaction.trim() !== "";

  const hasData = isPlainObject(payload.data);

  if (!hasTransaction && !hasData) {
    const wrappedData = cloneObject(payload) as AnyRecord;

    if (isPlainObject(wrappedData.data)) {
      delete wrappedData.data;
    }

    ensureChecklistObject(wrappedData);

    const body: AnyRecord = {
      transaction: inferTransaction(payload),
      data: wrappedData,
    };

    Object.assign(body, payload);

    ensureChecklistObject(body);

    return body;
  }

  if (hasData) {
    try {
      ensureChecklistObject(payload.data);
    } catch (e) {
      console.warn("[apiPostJson] warning while ensuring data checklist", e);
    }
  }

  if (isPlainObject(payload.item)) {
    try {
      ensureChecklistObject(payload.item);
    } catch (e) {
      console.warn("[apiPostJson] warning while ensuring item checklist", e);
    }
  }

  return payload;
}

export async function apiPostJson(url: string, payload: any) {
  const safePayload = normalizeBody(payload);

  console.log("[apiPostJson] -> POST", url, safePayload);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safePayload),
    });

    const text = await res.text();
    let json: any;

    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }

    console.log("[apiPostJson] <- RESPONSE", url, res.status, json);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${JSON.stringify(json)}`);
    }

    return json;
  } catch (err) {
    console.error("[apiPostJson] ERROR", err);
    throw err;
  }
}