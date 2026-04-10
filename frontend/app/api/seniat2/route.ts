// frontend/app/api/seniat2/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import puppeteer, { Browser, Page } from "puppeteer";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type PartyType = "NATURAL" | "JURIDICA";

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
  captchaDataUrl?: string;
  captchaBase64Url?: string;
  preview?: string;
  checklist?: any[];
  partyType?: PartyType;
  sessionId?: string;
};

type IncomingPayload = {
  rif?: string;
  tipo?: string;
  url?: string;
  captcha?: string;
  sessionId?: string;
};

type SeniatSession = {
  id: string;
  browser: Browser;
  page: Page;
  url: string;
  rif: string;
  tipo: "rif" | "cedula";
  createdAt: number;
  lastUsedAt: number;
  awaitingCaptcha: boolean;
  captchaPublicUrl?: string;
  captchaDataUrl?: string;
  captchaBase64Url?: string;
};

const ROOT_DIR = process.cwd();
const CAPTURES_DIR = path.join(ROOT_DIR, "Captures");
const PUBLIC_CAPTURES_DIR = path.join(ROOT_DIR, "public", "captures");
const PROFILE_DIR = path.join(ROOT_DIR, ".puppeteer-profile");

const SENIAT_DEFAULT_URL = "http://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp";
const IMAGETOTEXT_URL = "https://www.imagetotext.info/";

const SESSION_TTL_MS = 5 * 60 * 1000;
const DEBUG_SENIAT = true;

declare global {
  // eslint-disable-next-line no-var
  var __seniatBrowser: Browser | undefined;
  // eslint-disable-next-line no-var
  var __seniatSessions: Map<string, SeniatSession> | undefined;
  // eslint-disable-next-line no-var
  var __seniatCleanupStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __seniatWorkspacePrepared: boolean | undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizeUrl(input?: string) {
  const value = String(input || "").trim();
  if (!value) return SENIAT_DEFAULT_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
}

function normalizeTipo(tipo?: string) {
  const t = String(tipo || "").trim().toLowerCase();
  if (t === "rif" || t === "r") return "rif";
  if (t === "cedula" || t === "cédula" || t === "ci" || t === "c") return "cedula";
  return "rif";
}

function cleanRifInputPreserveCase(value: string) {
  return String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .trim();
}

function normalizeCaptcha(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function resetDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
  await ensureDir(dir);
}

async function prepareWorkspaceOnce() {
  if (globalThis.__seniatWorkspacePrepared) return;
  globalThis.__seniatWorkspacePrepared = true;

  await resetDir(CAPTURES_DIR);
  await resetDir(PUBLIC_CAPTURES_DIR);
  await ensureDir(PROFILE_DIR);

  if (DEBUG_SENIAT) {
    console.log("[SENIAT] Carpetas recreadas:");
    console.log(" -", CAPTURES_DIR);
    console.log(" -", PUBLIC_CAPTURES_DIR);
  }
}

async function getBrowser(): Promise<Browser> {
  if (globalThis.__seniatBrowser) return globalThis.__seniatBrowser;

  await prepareWorkspaceOnce();

  globalThis.__seniatBrowser = await puppeteer.launch({
    headless: true,
    userDataDir: PROFILE_DIR,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      "--disable-features=HttpsFirstBalancedModeAutoEnable",
      "--ignore-certificate-errors",
      "--window-size=1280,2000",
    ],
    defaultViewport: { width: 1280, height: 2000 },
  });

  return globalThis.__seniatBrowser;
}

function getSessionsMap() {
  if (!globalThis.__seniatSessions) {
    globalThis.__seniatSessions = new Map<string, SeniatSession>();
  }
  return globalThis.__seniatSessions;
}

function startCleanupLoopOnce() {
  if (globalThis.__seniatCleanupStarted) return;
  globalThis.__seniatCleanupStarted = true;

  setInterval(() => {
    void cleanupExpiredSessions();
  }, 60_000).unref?.();
}

function getCookieValue(request: NextRequest, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === name) return decodeURIComponent(value);
  }
  return "";
}

async function readPayload(request: NextRequest): Promise<IncomingPayload> {
  if (request.method === "GET") {
    const sp = request.nextUrl.searchParams;
    return {
      rif: sp.get("rif") || undefined,
      tipo: sp.get("tipo") || undefined,
      url: sp.get("url") || undefined,
      captcha: sp.get("captcha") || undefined,
      sessionId: sp.get("sessionId") || undefined,
    };
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      return {
        rif: body?.rif,
        tipo: body?.tipo,
        url: body?.url,
        captcha: body?.captcha,
        sessionId: body?.sessionId,
      };
    } catch {
      return {};
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return {
      rif: String(form.get("rif") || ""),
      tipo: String(form.get("tipo") || ""),
      url: String(form.get("url") || ""),
      captcha: String(form.get("captcha") || ""),
      sessionId: String(form.get("sessionId") || ""),
    };
  }

  try {
    const body = await request.text();
    if (!body.trim()) return {};
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function setSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set("seniat2_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

async function cleanupExpiredSessions() {
  const sessions = getSessionsMap();
  const now = Date.now();

  for (const [id, session] of sessions.entries()) {
    if (now - session.lastUsedAt <= SESSION_TTL_MS) continue;
    try {
      await session.page.close();
    } catch {}
    sessions.delete(id);
    if (DEBUG_SENIAT) console.log(`[SENIAT] Sesión expirada cerrada: ${id}`);
  }
}

async function closeSession(sessionId: string) {
  const sessions = getSessionsMap();
  const session = sessions.get(sessionId);
  if (!session) return;

  try {
    await session.page.close();
  } catch {}

  sessions.delete(sessionId);
}

async function getSession(sessionId: string) {
  const sessions = getSessionsMap();
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.lastUsedAt = Date.now();
  return session;
}

async function createSession({
  url,
  tipo,
  rif,
}: {
  url: string;
  tipo: "rif" | "cedula";
  rif: string;
}): Promise<SeniatSession> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 2000, deviceScaleFactor: 1 });
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(90_000);

  const session: SeniatSession = {
    id: randomUUID(),
    browser,
    page,
    url,
    rif,
    tipo,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    awaitingCaptcha: false,
  };

  getSessionsMap().set(session.id, session);

  return session;
}

async function fillValue(page: Page, selector: string, value: string) {
  await page.waitForSelector(selector, { timeout: 30_000 });
  const el = await page.$(selector);
  if (!el) throw new Error(`No se pudo acceder al selector ${selector}`);

  await el.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await el.type(String(value), { delay: 50 });
}

async function findSearchSelector(page: Page, tipo: "rif" | "cedula") {
  const directCandidates =
    tipo === "rif"
      ? ["#p_rif", 'input[name="p_rif"]', 'input[name="rif"]', 'input[name="pRif"]']
      : ["#p_cedula", "#p_ci", 'input[name="p_cedula"]', 'input[name="cedula"]', 'input[name="ci"]'];

  for (const selector of directCandidates) {
    const exists = await page.$(selector);
    if (exists) return selector;
  }

  return await page.evaluate((tipoArg) => {
    const tipo = String(tipoArg).toLowerCase();

    const norm = (s: any) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const matches = (text: any) => {
      const t = norm(text);
      if (tipo === "rif") return t.includes("rif");
      if (tipo === "cedula") return t.includes("cedula");
      return false;
    };

    const inputs = Array.from(document.querySelectorAll("input, select, textarea"));

    for (const el of inputs) {
      const attrs = [
        (el as HTMLInputElement).id,
        (el as HTMLInputElement).name,
        (el as HTMLInputElement).value,
        el.getAttribute("placeholder"),
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
      ].filter(Boolean);

      if (attrs.some(matches)) {
        return (el as HTMLInputElement).id
          ? `#${CSS.escape((el as HTMLInputElement).id)}`
          : (el as HTMLInputElement).name
            ? `[name="${CSS.escape((el as HTMLInputElement).name)}"]`
            : null;
      }
    }

    const labels = Array.from(document.querySelectorAll("label"));
    for (const label of labels) {
      if (!matches(label.textContent)) continue;

      const forId = label.getAttribute("for");
      if (forId) {
        const target = document.getElementById(forId) as HTMLInputElement | null;
        if (target) return `#${CSS.escape(forId)}`;
      }

      const nearby =
        (label.querySelector("input, select, textarea") as HTMLInputElement | null) ||
        (label.parentElement?.querySelector("input, select, textarea") as HTMLInputElement | null);

      if (nearby) {
        return nearby.id
          ? `#${CSS.escape(nearby.id)}`
          : nearby.name
            ? `[name="${CSS.escape(nearby.name)}"]`
            : null;
      }
    }

    return null;
  }, tipo);
}

async function fillSearchValue(page: Page, tipo: "rif" | "cedula", valor: string) {
  const selector = await findSearchSelector(page, tipo);

  if (!selector) {
    throw new Error(`No se encontró un input para "${tipo}"`);
  }

  await fillValue(page, selector, valor);
  return selector;
}

async function findCaptchaImageHandle(page: Page) {
  const images = await page.$$("img[src]");
  let best: { handle: any; info: { src: string; score: number; width: number; height: number } } | null = null;

  for (const img of images) {
    const info = await img.evaluate((el: HTMLImageElement) => {
      const rect = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;

      const norm = (s: any) =>
        String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      const text = [
        el.id,
        (el as any).name,
        el.className,
        el.alt,
        el.title,
        el.getAttribute("aria-label"),
        el.src,
      ]
        .filter(Boolean)
        .map(norm)
        .join(" ");

      let score = 0;

      if (visible) score += 20;
      if (/captcha|capcha|verificacion|verification|security|codigo|code|ocr/.test(text)) score += 60;
      if (el.src.startsWith("data:image")) score += 10;

      const w = el.naturalWidth || rect.width || 0;
      const h = el.naturalHeight || rect.height || 0;

      if (w >= 40 && h >= 20) score += 10;
      if (w <= 700 && h <= 300) score += 10;
      if (w >= 60 && w <= 500 && h >= 20 && h <= 200) score += 10;

      return {
        src: el.currentSrc || el.src,
        score,
        width: w,
        height: h,
      };
    });

    if (!best || info.score > best.info.score) {
      best = { handle: img, info };
    }
  }

  return best;
}

async function saveCaptchaArtifacts(page: Page, sessionId: string) {
  await ensureDir(CAPTURES_DIR);
  await ensureDir(PUBLIC_CAPTURES_DIR);

  const found = await findCaptchaImageHandle(page);

  const base = `captcha-${sessionId}-${stamp()}`;
  const originalPath = path.join(CAPTURES_DIR, `${base}-original.png`);
  const base64Path = path.join(CAPTURES_DIR, `${base}-base64.txt`);
  const publicFileName = `${base}.png`;
  const publicBase64FileName = `${base}.base64.txt`;

  const publicPath = path.join(PUBLIC_CAPTURES_DIR, publicFileName);
  const publicBase64Path = path.join(PUBLIC_CAPTURES_DIR, publicBase64FileName);

  let buffer: Buffer;

  if (found?.handle) {
    console.log(`Imagen detectada: ${found.info?.src || "[sin src]"}`);
    buffer = (await found.handle.screenshot({ type: "png" })) as Buffer;
  } else {
    buffer = (await page.screenshot({
      fullPage: true,
      type: "png",
    })) as Buffer;
  }

  const base64 = buffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  await fs.writeFile(originalPath, buffer);
  await fs.writeFile(base64Path, base64, "utf8");
  await fs.writeFile(publicPath, buffer);
  await fs.writeFile(publicBase64Path, base64, "utf8");

  const publicUrl = `/captures/${publicFileName}`;
  const base64Url = `/captures/${publicBase64FileName}`;

  return {
    originalPath,
    base64Path,
    publicPath,
    publicBase64Path,
    publicUrl,
    base64Url,
    dataUrl,
    base64,
  };
}

async function extractVisibleText(page: Page) {
  return await page.evaluate(() => {
    const text = document.body ? document.body.innerText : "";
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  });
}

function parseDetectedInfo(text: string, rifFallback?: string) {
  const raw = String(text || "").trim();
  const compact = raw.replace(/\s+/g, " ").trim();
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rif = cleanRifInputPreserveCase(rifFallback || compact.match(/\b([A-Z]\d{9})\b/i)?.[1] || "");
  const rifMatchedLine =
    lines.find((line) => rif && line.replace(/\s+/g, " ").toUpperCase().includes(rif.toUpperCase())) || "";

  const companyMatch = compact.match(/\b[A-Z]\d{9}\s+(.+?)\s*\(/i);
  const actividadMatch = compact.match(/Actividad Económica:\s*(.*?)\s*Condición:/i);
  const condicionMatch = compact.match(/Condición:\s*(.*?)(?:\s+La condición de este contribuyente|\s*$)/i);
  const retencionMatch = compact.match(
    /(La condición de este contribuyente requiere la retención del 75% del impuesto causado, salvo que incurra en los supuestos establecidos para la retención del 100%\.?)/i
  );

  const companyName = companyMatch ? companyMatch[1].trim() : "";
  const activityEconomic = actividadMatch ? actividadMatch[1].trim() : "";
  const condition = condicionMatch ? condicionMatch[1].trim() : "";
  const retentionNote = retencionMatch ? retencionMatch[1].trim() : "";

  const partyType: PartyType = companyName ? "JURIDICA" : "NATURAL";
  const found = Boolean(companyName || activityEconomic || condition || retentionNote);

  return {
    found,
    rif: rif || "",
    companyName,
    activityEconomic,
    condition,
    retentionNote,
    rifMatchedLine,
    rawText: raw,
    partyType,
  };
}

async function clickBuscarAndWait(page: Page) {
  const submitSelectors = [
    'input[type="submit"][name="busca"]',
    'button[type="submit"]',
    'input[type="submit"]',
    'button',
  ];

  for (const selector of submitSelectors) {
    const el = await page.$(selector);
    if (!el) continue;

    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null),
        el.click(),
      ]);
      return;
    } catch {
      try {
        await el.click();
        await sleep(2500);
        return;
      } catch {}
    }
  }

  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('input[type="submit"], button'));
    const target = buttons.find((el) => {
      const text = String((el as HTMLInputElement).value || el.textContent || "")
        .toLowerCase()
        .trim();
      return text.includes("buscar") || text.includes("consultar") || text.includes("enviar");
    }) as HTMLElement | undefined;

    if (target) {
      target.click();
      return true;
    }

    return false;
  });

  if (!clicked) {
    throw new Error("No se encontró el botón de búsqueda.");
  }

  await sleep(2500);
}

async function readImageToTextResult(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("textarea.img-text") as HTMLTextAreaElement | null;
      const value = String(el?.value || el?.textContent || "").trim();
      return value.length > 0;
    },
    { timeout: 90_000 }
  );

  const text = await page.evaluate(() => {
    const el = document.querySelector("textarea.img-text") as HTMLTextAreaElement | null;
    return String(el?.value || el?.textContent || "").trim();
  });

  return text;
}

async function ocrWithImageToText(browser: Browser, imagePath: string) {
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(45_000);
    page.setDefaultNavigationTimeout(90_000);

    await page.goto(IMAGETOTEXT_URL, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    await sleep(1500);

    const fileInputSelectors = [
      'input[type="file"]',
      'input[accept*="image"]',
      'input[accept*=".png"]',
      'input[accept*=".jpg"]',
      'input[accept*=".jpeg"]',
    ];

    let inputHandle = null;
    for (const selector of fileInputSelectors) {
      const found = await page.$(selector);
      if (found) {
        inputHandle = found;
        break;
      }
    }

    if (!inputHandle) {
      throw new Error("No se encontró el campo de carga en imagetotext.info.");
    }

    await inputHandle.uploadFile(imagePath);
    await sleep(1500);

    const clicked = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
      const target =
        candidates.find((el) => {
          const text = String(el.textContent || el.getAttribute("aria-label") || "")
            .toLowerCase()
            .trim();
          return text.includes("convert");
        }) ||
        (document.querySelector("#jsShadowRoot") as HTMLElement | null) ||
        (document.querySelector("button.convert-btn") as HTMLElement | null) ||
        null;

      if (target) {
        target.click();
        return true;
      }

      return false;
    });

    if (!clicked) {
      const explicit = await page.$("#jsShadowRoot, button.convert-btn");
      if (explicit) {
        await explicit.click();
      } else {
        throw new Error("No se encontró el botón Convert en imagetotext.info.");
      }
    }

    const text = await readImageToTextResult(page);
    return text;
  } finally {
    try {
      await page.close();
    } catch {}
  }
}

async function processInitialQuery(session: SeniatSession) {
  const { page, url, tipo, rif, id, browser } = session;

  if (DEBUG_SENIAT) {
    console.groupCollapsed(`[SENIAT] Consulta inicial ${id}`);
    console.log("URL:", url);
    console.log("Tipo:", tipo);
    console.log("RIF:", rif);
    console.groupEnd();
  }

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  await sleep(1500);

  const selectorUsado = await fillSearchValue(page, tipo, rif);
  if (DEBUG_SENIAT) console.log(`[SENIAT] Valor escrito en: ${selectorUsado}`);

  await sleep(1200);

  const captcha = await saveCaptchaArtifacts(page, session.id);

  session.awaitingCaptcha = true;
  session.captchaPublicUrl = captcha.publicUrl;
  session.captchaDataUrl = captcha.dataUrl;
  session.captchaBase64Url = captcha.base64Url;
  session.lastUsedAt = Date.now();

  let ocrText = "";
  try {
    ocrText = await ocrWithImageToText(browser, captcha.originalPath);
    if (DEBUG_SENIAT) {
      console.log("[SENIAT] OCR obtenido desde imagetotext.info:", ocrText);
    }
  } catch (error) {
    if (DEBUG_SENIAT) {
      console.error("[SENIAT] Error OCR en imagetotext.info:", error);
    }
  }

  if (!ocrText) {
    return {
      ok: true,
      captchaDetected: true,
      sessionId: session.id,
      captchaUrl: captcha.publicUrl,
      captchaDataUrl: captcha.dataUrl,
      captchaBase64Url: captcha.base64Url,
      preview: captcha.publicUrl,
      message: "SENIAT mostró captcha, pero no se pudo leer automáticamente. Envía el código usando la misma sesión.",
      needsManualReview: true,
    } as SeniatResponse;
  }

  const result = await processCaptchaSubmission(session, ocrText);
  return result;
}

async function processCaptchaSubmission(session: SeniatSession, captchaCode: string) {
  const { page, id, rif } = session;
  const captcha = normalizeCaptcha(captchaCode);

  if (!captcha) {
    throw new Error("Escribe el código del captcha antes de enviarlo.");
  }

  if (DEBUG_SENIAT) {
    console.groupCollapsed(`[SENIAT] Enviando captcha ${id}`);
    console.log("Captcha:", captcha);
    console.groupEnd();
  }

  const codigoSelectorCandidates = ["#codigo", 'input[name="codigo"]', 'input[name="captcha"]'];

  let codigoSelector = "";
  for (const selector of codigoSelectorCandidates) {
    const exists = await page.$(selector);
    if (exists) {
      codigoSelector = selector;
      break;
    }
  }

  if (!codigoSelector) {
    codigoSelector = "#codigo";
  }

  await page.waitForSelector(codigoSelector, { timeout: 30_000 });
  await fillValue(page, codigoSelector, captcha);

  await clickBuscarAndWait(page);
  await sleep(2500);

  const visibleText = await extractVisibleText(page);
  const detected = parseDetectedInfo(visibleText, rif);

  if (DEBUG_SENIAT) {
    console.log("\n==================== TEXTO DETECTADO EN PÁGINA ====================");
    console.log(visibleText || "[No se detectó texto visible]");
    console.log("==================================================================");

    console.log("\n==================== CAMPOS DETECTADOS ====================");
    console.log(`RIF / Código: ${detected.rif || "No detectado"}`);
    console.log(`Empresa: ${detected.companyName || "No detectado"}`);
    console.log(`Actividad Económica: ${detected.activityEconomic || "No detectado"}`);
    console.log(`Condición: ${detected.condition || "No detectado"}`);
    console.log(`Retención: ${detected.retentionNote || "No detectado"}`);
    console.log("===========================================================");
  }

  const response: SeniatResponse = {
    ok: true,
    found: detected.found,
    rif: detected.rif || rif,
    companyName: detected.companyName || undefined,
    activityEconomic: detected.activityEconomic || undefined,
    condition: detected.condition || undefined,
    retentionNote: detected.retentionNote || undefined,
    rifMatchedLine: detected.rifMatchedLine || undefined,
    rawText: detected.rawText || undefined,
    partyType: detected.partyType,
    preview: visibleText.slice(0, 1000),
    message: detected.found
      ? "Consulta SENIAT completada."
      : "No se encontró coincidencia automática. Revisión manual activada.",
    needsManualReview: !detected.found,
  };

  return response;
}

function buildJsonResponse(data: SeniatResponse, sessionId?: string, status = 200) {
  const res = NextResponse.json(
    {
      ...data,
      sessionId: sessionId || data.sessionId,
    },
    { status }
  );

  if (sessionId) {
    setSessionCookie(res, sessionId);
  }

  return res;
}

async function handleRequest(request: NextRequest) {
  await prepareWorkspaceOnce();
  startCleanupLoopOnce();
  await cleanupExpiredSessions();

  const payload = await readPayload(request);

  const rif = cleanRifInputPreserveCase(payload.rif || "");
  const tipo = normalizeTipo(payload.tipo);
  const url = normalizeUrl(payload.url);
  const captcha = normalizeCaptcha(payload.captcha || "");
  const sessionIdFromBody = String(payload.sessionId || "").trim();
  const sessionIdFromCookie = getCookieValue(request, "seniat2_session");
  const sessionId = sessionIdFromBody || sessionIdFromCookie;

  if (!rif) {
    return buildJsonResponse(
      {
        ok: false,
        found: false,
        message: "Escribe un RIF antes de consultar SENIAT.",
      },
      sessionId || undefined,
      400
    );
  }

  try {
    if (!captcha) {
      const session = await createSession({ url, tipo, rif });
      const firstStep = await processInitialQuery(session);

      if (firstStep.ok && !firstStep.needsManualReview) {
        await closeSession(session.id);
      }

      return buildJsonResponse(firstStep, session.id, 200);
    }

    if (!sessionId) {
      return buildJsonResponse(
        {
          ok: false,
          found: false,
          message: "Falta sessionId. Primero haz la consulta inicial para recibir el captcha.",
        },
        undefined,
        400
      );
    }

    let session = await getSession(sessionId);

    if (!session) {
      return buildJsonResponse(
        {
          ok: false,
          found: false,
          message: "La sesión expiró. Vuelve a consultar SENIAT para recibir un nuevo captcha.",
        },
        undefined,
        410
      );
    }

    session.lastUsedAt = Date.now();
    session.rif = rif;
    session.tipo = tipo;
    session.url = url;

    const data = await processCaptchaSubmission(session, captcha);

    await closeSession(session.id);

    return buildJsonResponse(data, sessionId, 200);
  } catch (error: any) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Error consultando SENIAT";

    if (DEBUG_SENIAT) {
      console.error("[SENIAT] Error final:", error);
    }

    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        session.lastUsedAt = Date.now();
      }
    }

    return buildJsonResponse(
      {
        ok: false,
        found: false,
        message,
        needsManualReview: true,
      },
      sessionId || undefined,
      500
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}