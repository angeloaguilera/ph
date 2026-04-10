#!/usr/bin/env node

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const readline = require("readline");
const puppeteer = require("puppeteer");

const ROOT_DIR = process.cwd();
const CAPTURES_DIR = path.join(ROOT_DIR, "public", "captures");
const INPUT_TIMEOUT_MS = 60000;
const JSON_MODE = process.argv.includes("--json") || process.env.SENIAT_JSON === "1";

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const PROFILE_DIR = path.join(ROOT_DIR, ".puppeteer-profile", RUN_ID);

const CAPTCHA_FILE_PATH = path.join(CAPTURES_DIR, "captcha.png");
const CAPTCHA_BASE64_FILE_PATH = path.join(CAPTURES_DIR, "captcha-base64.txt");
const CAPTCHA_VERSIONED_FILE_PATH = path.join(CAPTURES_DIR, `captcha-${RUN_ID}-original.png`);
const CAPTCHA_VERSIONED_BASE64_PATH = path.join(CAPTURES_DIR, `captcha-${RUN_ID}-base64.txt`);

function log(...args) {
  if (JSON_MODE) {
    console.error(...args);
  } else {
    console.log(...args);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(input) {
  if (/^https?:\/\//i.test(input)) return input;
  return `http://${input}`;
}

function normalizeTipo(tipo) {
  const t = String(tipo || "").trim().toLowerCase();
  if (t === "rif" || t === "r") return "rif";
  if (t === "cedula" || t === "cédula" || t === "ci" || t === "c") return "cedula";
  return null;
}

function cleanRifPreserveCase(input) {
  return String(input || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .trim();
}

function compareKey(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function cleanText(v) {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function splitLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((x) => cleanText(x))
    .filter(Boolean);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function removeDirIfExists(dir) {
  await fsp.rm(dir, { recursive: true, force: true });
}

function askFromConsole(question, timeoutMs = INPUT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const timer = setTimeout(() => {
      rl.close();
      reject(new Error(`Se agotó el tiempo (${Math.round(timeoutMs / 1000)}s) para escribir el código.`));
    }, timeoutMs);

    rl.question(question, (answer) => {
      clearTimeout(timer);
      rl.close();
      resolve(String(answer || "").trim());
    });

    rl.on("SIGINT", () => {
      clearTimeout(timer);
      rl.close();
      reject(new Error("Entrada cancelada por el usuario."));
    });
  });
}

function detectCaptcha(text, html) {
  const t = String(text || "").toLowerCase();
  const h = String(html || "").toLowerCase();

  return (
    t.includes("captcha") ||
    h.includes("captcha") ||
    h.includes("captcha.jpg") ||
    h.includes("contribuyente.seniat.gob.ve/buscarif/captcha") ||
    (h.includes("busca rif") && h.includes("codigo"))
  );
}

async function findInputByHint(page, tipo) {
  return await page.evaluate((tipoArg) => {
    const tipo = String(tipoArg).toLowerCase();

    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const matches = (text) => {
      const t = norm(text);
      if (tipo === "rif") return t.includes("rif");
      if (tipo === "cedula") return t.includes("cedula") || t.includes("ci");
      return false;
    };

    const inputs = Array.from(document.querySelectorAll("input, select, textarea"));

    for (const el of inputs) {
      const attrs = [
        el.id,
        el.name,
        el.value,
        el.getAttribute("placeholder"),
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
      ].filter(Boolean);

      if (attrs.some(matches)) {
        return {
          selector:
            el.id
              ? `#${CSS.escape(el.id)}`
              : el.name
              ? `[name="${CSS.escape(el.name)}"]`
              : null,
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
        };
      }
    }

    const labels = Array.from(document.querySelectorAll("label"));
    for (const label of labels) {
      if (!matches(label.textContent)) continue;

      const forId = label.getAttribute("for");
      if (forId) {
        const target = document.getElementById(forId);
        if (target) {
          return {
            selector: `#${CSS.escape(forId)}`,
            tagName: target.tagName.toLowerCase(),
            type: target.getAttribute("type"),
          };
        }
      }

      const nearby =
        label.querySelector("input, select, textarea") ||
        label.parentElement?.querySelector("input, select, textarea");

      if (nearby) {
        return {
          selector:
            nearby.id
              ? `#${CSS.escape(nearby.id)}`
              : nearby.name
              ? `[name="${CSS.escape(nearby.name)}"]`
              : null,
          tagName: nearby.tagName.toLowerCase(),
          type: nearby.getAttribute("type"),
        };
      }
    }

    return null;
  }, tipo);
}

async function fillValue(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 30000 });
  const el = await page.$(selector);
  if (!el) throw new Error(`No se pudo acceder al selector ${selector}`);

  await el.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await el.type(String(value), { delay: 35 });
}

async function clickAny(page, selectors) {
  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        return selector;
      }
    } catch {}
  }
  return "";
}

async function submitSearch(page, label = "") {
  const submitSelector = await clickAny(page, [
    'input[type="submit"][name="busca"]',
    'input[type="submit"]',
    'button[type="submit"]',
    "#btnConsultar",
    "#btnBuscar",
    "#buscar",
    "#consultar",
    'button[name*="consult" i]',
    'input[name*="consult" i]',
    "form button",
  ]);

  if (!submitSelector) {
    log("No se encontró botón de búsqueda; se intenta continuar.");
    return "";
  }

  if (label) {
    log(`Haciendo clic en ${label}...`);
  } else {
    log(`Haciendo clic en: ${submitSelector}`);
  }

  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null),
      page.click(submitSelector),
    ]);
  } catch {
    await page.click(submitSelector).catch(() => {});
    await sleep(3500);
  }

  return submitSelector;
}

async function findCaptchaImageHandle(page) {
  const images = await page.$$("img[src]");
  let best = null;

  for (const img of images) {
    const info = await img.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;

      const norm = (s) =>
        String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      const text = [
        el.id,
        el.name,
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

async function saveCaptchaAsBase64FromImg(page) {
  await ensureDir(CAPTURES_DIR);

  const found = await findCaptchaImageHandle(page);
  let buffer = null;

  if (found?.handle) {
    log(`Imagen detectada: ${found.info?.src || "[sin src]"}`);
    buffer = await found.handle.screenshot({ type: "png" });
  } else {
    log("No se detectó una imagen específica de captcha; se guardará captura de la página.");
    buffer = await page.screenshot({ fullPage: true, type: "png" });
  }

  await fsp.writeFile(CAPTCHA_VERSIONED_FILE_PATH, buffer);
  await fsp.writeFile(CAPTCHA_VERSIONED_BASE64_PATH, buffer.toString("base64"), "utf8");

  await fsp.writeFile(CAPTCHA_FILE_PATH, buffer);
  await fsp.writeFile(CAPTCHA_BASE64_FILE_PATH, buffer.toString("base64"), "utf8");

  log(`PNG guardado en: ${CAPTCHA_VERSIONED_FILE_PATH}`);
  log(`Base64 guardado en: ${CAPTCHA_VERSIONED_BASE64_PATH}`);

  return {
    captchaFile: CAPTCHA_FILE_PATH,
    base64File: CAPTCHA_BASE64_FILE_PATH,
    versionedCaptchaFile: CAPTCHA_VERSIONED_FILE_PATH,
    versionedBase64File: CAPTCHA_VERSIONED_BASE64_PATH,
  };
}

async function extractVisibleText(page) {
  return await page.evaluate(() => {
    const text = document.body ? document.body.innerText : "";
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  });
}

function parseDetectedInfo(text) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();

  const rifMatch = compact.match(/\b([A-Z]\d{7,9})\b/i);

  const companyMatch =
    compact.match(/Raz[oó]n Social[:\s]+(.+?)(?:\s+Actividad|\s+Condici[oó]n|\s+Retenci[oó]n|$)/i) ||
    compact.match(/Nombre[:\s]+(.+?)(?:\s+Actividad|\s+Condici[oó]n|\s+Retenci[oó]n|$)/i);

  const actividadMatch = compact.match(/Actividad Econ[oó]mica[:\s]+(.+?)(?:\s+Condici[oó]n|\s+Retenci[oó]n|$)/i);
  const condicionMatch = compact.match(/Condici[oó]n[:\s]+(.+?)(?:\s+La condici[oó]n de este contribuyente|\s+Retenci[oó]n|$)/i);
  const retencionMatch = compact.match(
    /(La condici[oó]n de este contribuyente requiere la retenci[oó]n del 75% del impuesto causado, salvo que incurra en los supuestos establecidos para la retenci[oó]n del 100%\.?)/i
  );

  return {
    rif: rifMatch ? rifMatch[1] : null,
    empresa: companyMatch ? cleanText(companyMatch[1]) : null,
    actividad: actividadMatch ? cleanText(actividadMatch[1]) : null,
    condicion: condicionMatch ? cleanText(condicionMatch[1]) : null,
    retencion: retencionMatch ? cleanText(retencionMatch[1]) : null,
  };
}

async function saveDetectedText(text) {
  await ensureDir(CAPTURES_DIR);
  const filePath = path.join(CAPTURES_DIR, `texto-detectado-${RUN_ID}.txt`);
  await fsp.writeFile(filePath, String(text || ""), "utf8");
  return filePath;
}

async function createBrowser() {
  await ensureDir(CAPTURES_DIR);
  await ensureDir(PROFILE_DIR);

  return puppeteer.launch({
    headless: true,
    userDataDir: PROFILE_DIR,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      "--disable-features=HttpsFirstBalancedModeAutoEnable",
    ],
    defaultViewport: { width: 1280, height: 2000 },
  });
}

async function fillCaptchaField(page, captchaCode) {
  const candidates = [
    "#codigo",
    "#p_codigo",
    'input[name="codigo"]',
    'input[name="p_codigo"]',
    'input[id*="codigo" i]',
    'input[name*="codigo" i]',
  ];

  let codigoSelector = "";
  for (const selector of candidates) {
    const el = await page.$(selector);
    if (el) {
      codigoSelector = selector;
      break;
    }
  }

  if (!codigoSelector) {
    const found = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input"));
      const norm = (s) =>
        String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      for (const el of inputs) {
        const text = [
          el.id,
          el.name,
          el.placeholder,
          el.title,
          el.getAttribute("aria-label"),
          el.value,
        ]
          .filter(Boolean)
          .map(norm)
          .join(" ");

        if (text.includes("codigo") || text.includes("captcha") || text.includes("capcha")) {
          return el.id
            ? `#${CSS.escape(el.id)}`
            : el.name
            ? `[name="${CSS.escape(el.name)}"]`
            : null;
        }
      }

      return null;
    });

    if (found) codigoSelector = found;
  }

  if (!codigoSelector) {
    throw new Error("No se encontró el campo para escribir el captcha.");
  }

  await fillValue(page, codigoSelector, captchaCode);
  log(`Código escrito en: ${codigoSelector}`);
}

async function processSeniat(page, url, tipo, valor, captchaCodeFromArg = "") {
  log(`\n=== URL: ${url} ===`);
  log(`Tipo elegido: ${tipo}`);
  log("Ejecutando en modo oculto (sin ventana del navegador).");
  log(`Perfil de cookies compartido: ${PROFILE_DIR}`);

  await page.setViewport({ width: 1280, height: 2000, deviceScaleFactor: 1 });

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });

  await sleep(2000);

  const selectorUsado = await findInputByHint(page, tipo);
  if (!selectorUsado || !selectorUsado.selector) {
    throw new Error(`No se encontró un input para "${tipo}"`);
  }

  await fillValue(page, selectorUsado.selector, valor);
  log(`Valor escrito en: ${selectorUsado.selector}`);

  await sleep(1200);

  await submitSearch(page);
  await sleep(2500);

  let visibleText = await extractVisibleText(page);
  let html = await page.content();
  let captchaDetected = detectCaptcha(visibleText, html);

  if (captchaDetected) {
    log("Se detectó captcha o validación visual.");

    const captchaFiles = await saveCaptchaAsBase64FromImg(page);

    log(`Captura guardada en: ${captchaFiles.versionedCaptchaFile}`);
    log(`Base64 guardado en: ${captchaFiles.versionedBase64File}`);

    let captchaCode = captchaCodeFromArg;

    if (!captchaCode) {
      if (JSON_MODE) {
        const result = {
          ok: true,
          found: false,
          url,
          finalUrl: page.url(),
          tipo,
          rif: cleanRifPreserveCase(valor),
          companyName: "",
          activityEconomic: "",
          condition: "",
          retentionNote: "",
          rifMatchedLine: "",
          rawText: "",
          needsManualReview: true,
          captchaDetected: true,
          captchaUrl: "/captures/captcha.png",
          preview: "",
          files: {
            captcha: path.relative(ROOT_DIR, CAPTCHA_FILE_PATH).replace(/\\/g, "/"),
            captchaBase64: path.relative(ROOT_DIR, CAPTCHA_BASE64_FILE_PATH).replace(/\\/g, "/"),
            captchaVersioned: path.relative(ROOT_DIR, CAPTCHA_VERSIONED_FILE_PATH).replace(/\\/g, "/"),
            captchaVersionedBase64: path.relative(ROOT_DIR, CAPTCHA_VERSIONED_BASE64_PATH).replace(/\\/g, "/"),
          },
        };

        process.stdout.write(JSON.stringify(result));
        return result;
      }

      log("Revisa la captura guardada y escribe el código que ves.");
      log(`Tiempo máximo para responder: ${Math.round(INPUT_TIMEOUT_MS / 1000)} segundos`);
      captchaCode = await askFromConsole("Escribe el código y presiona Enter: ", INPUT_TIMEOUT_MS);
      log(`Código recibido desde consola: ${captchaCode}`);
    } else {
      log(`Código recibido desde argumento: ${captchaCode}`);
    }

    await fillCaptchaField(page, captchaCode);
    await submitSearch(page, "Buscar");
    await sleep(2500);

    visibleText = await extractVisibleText(page);
    html = await page.content();
    captchaDetected = detectCaptcha(visibleText, html);
  }

  const textoGuardado = await saveDetectedText(visibleText);
  const detected = parseDetectedInfo(visibleText);
  const lines = splitLines(visibleText);

  const rifMatchedLine =
    lines.find((line) => compareKey(line).includes(compareKey(valor))) ||
    lines.find((line) => compareKey(line).includes(compareKey(detected.rif || ""))) ||
    "";

  const finalScreenshot = await page.screenshot({
    fullPage: true,
    type: "png",
  });

  await ensureDir(CAPTURES_DIR);
  const finalPath = path.join(CAPTURES_DIR, `resultado-${RUN_ID}.png`);
  await fsp.writeFile(finalPath, finalScreenshot);

  const result = {
    ok: true,
    found: Boolean(detected.empresa || detected.actividad || detected.condicion || rifMatchedLine),
    url,
    finalUrl: page.url(),
    tipo,
    rif: cleanRifPreserveCase(valor),
    companyName: detected.empresa || "",
    activityEconomic: detected.actividad || "",
    condition: detected.condicion || "",
    retentionNote: detected.retencion || "",
    rifMatchedLine: rifMatchedLine || "",
    rawText: visibleText,
    needsManualReview: Boolean(captchaDetected) || !(detected.empresa || detected.actividad || detected.condicion),
    captchaDetected: Boolean(captchaDetected),
    htmlLength: visibleText.length,
    preview: cleanText(visibleText).slice(0, 1200),
    files: {
      text: path.relative(ROOT_DIR, textoGuardado).replace(/\\/g, "/"),
      screenshot: path.relative(ROOT_DIR, finalPath).replace(/\\/g, "/"),
      captcha: path.relative(ROOT_DIR, CAPTCHA_FILE_PATH).replace(/\\/g, "/"),
      captchaBase64: path.relative(ROOT_DIR, CAPTCHA_BASE64_FILE_PATH).replace(/\\/g, "/"),
      captchaVersioned: path.relative(ROOT_DIR, CAPTCHA_VERSIONED_FILE_PATH).replace(/\\/g, "/"),
      captchaVersionedBase64: path.relative(ROOT_DIR, CAPTCHA_VERSIONED_BASE64_PATH).replace(/\\/g, "/"),
    },
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(result));
  } else {
    console.log("==================== TEXTO DETECTADO EN PÁGINA ====================");
    console.log(visibleText);
    console.log("==================================================================");
    console.log("==================== CAMPOS DETECTADOS ====================");
    console.log("RIF / Código:", detected.rif || "");
    console.log("Empresa:", detected.empresa || "");
    console.log("Actividad Económica:", detected.actividad || "");
    console.log("Condición:", detected.condicion || "");
    console.log("Retención:", detected.retencion || "");
    console.log("===========================================================");
    console.log("Texto detectado guardado en:", textoGuardado);
    console.log("Captura final guardada en:", finalPath);
    console.log("Proceso terminado.");
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--json");

  if (args.length < 3) {
    console.log("Uso:");
    console.log("  node seniat2.cjs <url> <rif|cedula> <valor> [captcha]");
    console.log("");
    console.log("Ejemplo:");
    console.log("  node seniat2.cjs http://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp rif J298537930");
    process.exit(1);
  }

  const url = normalizeUrl(args[0]);
  const tipo = normalizeTipo(args[1]);
  const valor = cleanRifPreserveCase(args[2]);
  const captchaCode = String(args.slice(3).join(" ") || "").trim();

  if (!tipo) {
    console.log('El segundo argumento debe ser "rif" o "cedula".');
    process.exit(1);
  }

  if (!valor) {
    console.log("Falta el valor a consultar.");
    process.exit(1);
  }

  await ensureDir(CAPTURES_DIR);
  await ensureDir(PROFILE_DIR);

  const browser = await createBrowser();

  try {
    const page = await browser.newPage();
    try {
      await processSeniat(page, url, tipo, valor, captchaCode);
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    await browser.close().catch(() => {});
    await removeDirIfExists(PROFILE_DIR);
  }
}

main().catch((err) => {
  const payload = {
    ok: false,
    found: false,
    needsManualReview: true,
    message: err?.message || String(err),
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(payload));
  } else {
    console.error("Error fatal:", err);
    process.exit(1);
  }
});