// hooks/catalogHelpers.ts
export async function apiPostJson(url: string, payload: any) {
  console.log("[apiPostJson] -> POST", url, payload);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = text; }

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
