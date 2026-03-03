// lib/accounting/modules/chart-of-accounts-core.ts
import fs from "fs/promises";
import path from "path";
import type { Invoice } from "@/types/invoice";

/**
 * Estructura simple de cuenta en el catálogo
 */
export type AccountRecord = {
  id?: string;
  code: string;
  name: string;
  slug?: string;
  rif?: string | null;
  role?: "CLIENTE" | "PROVEEDOR" | "OTRO";
  type?: "ACTIVO" | "PASIVO" | "INGRESO" | "GASTO" | "OTRO";
  subtype?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
};

/**
 * Archivo donde guardamos el catálogo (lista de cuentas).
 * Ruta: <project>/data/accounting/plan-de-cuentas/accounts.json
 */
const ACCOUNTS_FILE = path.join(process.cwd(), "data", "accounting", "plan-de-cuentas", "accounts.json");

/** Asegura carpeta del plan de cuentas */
async function ensurePlanDir() {
  const dir = path.dirname(ACCOUNTS_FILE);
  await fs.mkdir(dir, { recursive: true });
}

/** Leer cuentas (si no existe devuelve []) */
async function readAccounts(): Promise<AccountRecord[]> {
  try {
    const txt = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    const parsed = JSON.parse(txt);
    // Soportar formato { generatedAt, accounts: [...] } o un array directo
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.accounts)) return parsed.accounts;
    return [];
  } catch (e) {
    return [];
  }
}

/** Escribir cuentas */
async function writeAccounts(accounts: AccountRecord[]) {
  await ensurePlanDir();
  const payload = { generatedAt: new Date().toISOString(), accounts };
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

/** Generador simple de códigos:
 * - Para clientes -> base "1100" (Cuentas por cobrar). Creamos subcódigos 1100-01, 1100-02...
 * - Para proveedores -> base "2000" (Cuentas por pagar). Creamos subcódigos 2000-01, 2000-02...
 * - Otros -> 9000-XX
 */
function generateAccountCode(accounts: AccountRecord[], role: "CLIENTE" | "PROVEEDOR" | "OTRO") {
  const base = role === "CLIENTE" ? "1100" : role === "PROVEEDOR" ? "2000" : "9000";
  // buscar cuentas ya con prefijo base
  const existing = accounts
    .map((a) => a.code)
    .filter((c) => typeof c === "string" && c.startsWith(base))
    .map((c) => {
      const parts = String(c).split("-");
      const seq = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      return Number.isFinite(seq) ? seq : 0;
    });
  const maxSeq = existing.length ? Math.max(...existing) : 0;
  const next = (maxSeq + 1).toString().padStart(2, "0");
  return `${base}-${next}`;
}

function slugify(s: string) {
  return (s || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function simpleId() {
  try {
    // @ts-ignore globalThis.crypto may exist in Node 18+
    return (globalThis as any).crypto?.randomUUID?.() ?? `acct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  } catch {
    return `acct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * ensurePartyAccount(party, role)
 * - party: objeto que contiene al menos name y rif (si viene)
 * - role: "CLIENTE" | "PROVEEDOR"
 *
 * Busca si ya existe cuenta por rif (prioridad) o por name (si rif no existe).
 * Si no existe la crea con código generado y la guarda en accounts.json.
 */
export async function ensurePartyAccount(
  party: { name?: string; rif?: string | null; nit?: string | null; phone?: string | null; email?: string | null },
  role: "CLIENTE" | "PROVEEDOR"
): Promise<AccountRecord> {
  if (!party) throw new Error("Party info missing");

  const accounts = await readAccounts();

  // Normalizar rif (preferir rif, luego nit)
  const rif = (party.rif ?? party.nit ?? "")?.toString()?.trim() || "";
  if (rif) {
    const foundByRif = accounts.find((a) => a.rif && String(a.rif) === rif);
    if (foundByRif) {
      // actualizar metadata si faltan datos
      let changed = false;
      foundByRif.metadata = foundByRif.metadata ?? {};
      if (party.phone && !foundByRif.metadata.phone) {
        foundByRif.metadata.phone = party.phone;
        changed = true;
      }
      if (party.email && !foundByRif.metadata.email) {
        foundByRif.metadata.email = party.email;
        changed = true;
      }
      if (changed) {
        foundByRif.updatedAt = new Date().toISOString();
        await writeAccounts(accounts);
      }
      return foundByRif;
    }
  }

  // Si no hay rif o no se encontró, buscar por nombre (case-insensitive)
  const name = (party.name ?? "").toString().trim();
  if (name) {
    const foundByName = accounts.find((a) => a.name && a.name.toLowerCase() === name.toLowerCase());
    if (foundByName) {
      // si falta rif y ahora lo tenemos, agregarlo
      let changed = false;
      foundByName.metadata = foundByName.metadata ?? {};
      if (rif && !foundByName.rif) {
        foundByName.rif = rif;
        changed = true;
      }
      if (party.phone && !foundByName.metadata.phone) {
        foundByName.metadata.phone = party.phone;
        changed = true;
      }
      if (party.email && !foundByName.metadata.email) {
        foundByName.metadata.email = party.email;
        changed = true;
      }
      if (changed) {
        foundByName.updatedAt = new Date().toISOString();
        await writeAccounts(accounts);
      }
      return foundByName;
    }
  }

  // No encontrado: crear nueva cuenta
  const newCode = generateAccountCode(accounts, role);
  const newAccount: AccountRecord = {
    id: simpleId(),
    code: newCode,
    name: name || (role === "CLIENTE" ? "Cliente sin nombre" : "Proveedor sin nombre"),
    slug: slugify(name || (role === "CLIENTE" ? "cliente-sin-nombre" : "proveedor-sin-nombre")),
    rif: rif || null,
    role,
    type: role === "CLIENTE" ? "ACTIVO" : "PASIVO",
    subtype: role === "CLIENTE" ? "CLIENTES" : "PROVEEDORES",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      phone: party.phone ?? null,
      email: party.email ?? null,
      createdFrom: "process-invoice",
    },
  };

  accounts.push(newAccount);
  await writeAccounts(accounts);

  // Además, escribir individualmente en carpeta plan-de-cuentas/ (opcional, para trazabilidad)
  try {
    const singleDir = path.join(process.cwd(), "data", "accounting", "plan-de-cuentas", "accounts");
    await fs.mkdir(singleDir, { recursive: true });
    const filename = `account-${newAccount.code.replace(/\W+/g, "_")}.json`;
    await fs.writeFile(path.join(singleDir, filename), JSON.stringify(newAccount, null, 2), "utf-8");
  } catch (e) {
    // no crítico
    console.error("Error writing single account file:", e);
  }

  return newAccount;
}

/**
 * updateOrGenerateFromInvoice(invoice)
 * - A partir del invoice, intenta generar / actualizar cuentas relevantes:
 *   - asegura cuentas para customer/supplier
 *   - asegura cuentas para cada artículo/servicio (ventas, compras, inventario, gastos)
 *   - asegura cuentas de nómina (gastos y por empleado si hay snapshot)
 * - Devuelve { created?, chart, mapping }
 */
export async function updateOrGenerateFromInvoice(invoice: Invoice) {
  const accounts = await readAccounts();
  const created: AccountRecord[] = [];
  const mapping: Record<string, AccountRecord> = {};

  // Helper local para push si es nuevo (controla duplicados por id o slug+subtype)
  function pushIfNew(acc: AccountRecord) {
    const exists = accounts.find((a) => (acc.id && a.id === acc.id) || (acc.slug && a.slug === acc.slug && a.subtype === acc.subtype));
    if (!exists) {
      accounts.push(acc);
      created.push(acc);
    }
  }

  // 1) Parties (customer / supplier)
  try {
    if ((invoice as any).customer) {
      const cust = (invoice as any).customer;
      const acct = await ensurePartyAccount({ name: cust.name, rif: cust.rif ?? cust.nit, phone: cust.phone, email: cust.email }, "CLIENTE");
      mapping["customer"] = acct;
      pushIfNew(acct);
    }
    if ((invoice as any).supplier) {
      const sup = (invoice as any).supplier;
      const acct = await ensurePartyAccount({ name: sup.name, rif: sup.rif ?? sup.nit, phone: sup.phone, email: sup.email }, "PROVEEDOR");
      mapping["supplier"] = acct;
      pushIfNew(acct);
    }
  } catch (e) {
    console.error("chartOfAccounts: error ensuring parties", e);
  }

  // 2) Items -> crear cuentas de ventas/compras/inventario/gastos según heurística
  try {
    const items = Array.isArray((invoice as any).items) ? (invoice as any).items : [];
    const rawDocKind = String((invoice as any).docKind ?? (invoice as any).docType ?? "").toUpperCase();
    const isFactura = rawDocKind === "FACTURA";
    const isVentaType = String((invoice as any).type ?? "").toUpperCase() === "VENTA";
    const isCompraType = String((invoice as any).type ?? "").toUpperCase() === "COMPRA";

    for (const it of items) {
      const name = (it.name ?? it.type ?? "item-sin-nombre").toString();
      const slug = slugify(name);
      const baseKey = `item:${slug}`;

      // heurística para tipo/subtype
      let accType: AccountRecord["type"] = "OTRO";
      let subtype = "VARIOS";
      if (isVentaType || (isFactura && isVentaType)) {
        accType = "INGRESO";
        subtype = "VENTAS";
      } else if (isCompraType || (isFactura && isCompraType)) {
        accType = it.kind === "ARTICULO" ? "ACTIVO" : "GASTO";
        subtype = it.kind === "ARTICULO" ? "INVENTARIO" : "COMPRAS";
      } else {
        if (String(it.category ?? "").toLowerCase().includes("servicios")) {
          accType = "GASTO";
          subtype = "SERVICIOS";
        } else {
          accType = "OTRO";
          subtype = "VARIOS";
        }
      }

      // buscar existente por slug + subtype
      let found = accounts.find((a) => a.slug === slug && a.subtype === subtype);
      if (!found) {
        const newAcct: AccountRecord = {
          id: simpleId(),
          code: generateAccountCode(accounts, "OTRO"),
          name,
          slug,
          subtype,
          type: accType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { itemKind: it.kind ?? null, sku: it.sku ?? null },
        };
        accounts.push(newAcct);
        created.push(newAcct);
        found = newAcct;
      }
      mapping[baseKey] = found;
    }
  } catch (e) {
    console.error("chartOfAccounts: error processing items", e);
  }

  // 3) Payroll receipts -> crear cuenta gasto nómina y cuentas por empleado (si snapshots)
  try {
    const receipts = Array.isArray((invoice as any).payrollReceipts) ? (invoice as any).payrollReceipts : [];
    if (receipts.length) {
      // asegurar cuenta "Gastos de nómina"
      let nominaAcct = accounts.find((a) => a.subtype === "NOMINA" && a.type === "GASTO");
      if (!nominaAcct) {
        nominaAcct = {
          id: simpleId(),
          code: generateAccountCode(accounts, "OTRO"),
          name: "Gastos de nómina",
          slug: slugify("gastos-de-nomina"),
          type: "GASTO",
          subtype: "NOMINA",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
        };
        accounts.push(nominaAcct);
        created.push(nominaAcct);
      }
      mapping["nomina"] = nominaAcct;

      // cuentas por empleado (opcional, solo si hay snapshot)
      for (const r of receipts) {
        const emp = r.employeeSnapshot ?? null;
        if (emp && (emp.firstName || emp.document)) {
          const empName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim();
          const empSlug = slugify(empName || String(emp.document ?? "empleado"));
          let empAcct = accounts.find((a) => a.slug === empSlug && a.subtype === "EMPLEADOS");
          if (!empAcct) {
            empAcct = {
              id: simpleId(),
              code: generateAccountCode(accounts, "PROVEEDOR"),
              name: empName || (emp.document ?? "Empleado sin nombre"),
              slug: empSlug,
              type: "PASIVO",
              subtype: "EMPLEADOS",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: { document: emp.document ?? null, createdFrom: "payroll" },
            };
            accounts.push(empAcct);
            created.push(empAcct);
          }
          mapping[`employee:${empSlug}`] = empAcct;
        }
      }
    }
  } catch (e) {
    console.error("chartOfAccounts: error processing payroll", e);
  }

  // 4) Guardar si hay nuevas cuentas
  if (created.length > 0) {
    try {
      await writeAccounts(accounts);
    } catch (e) {
      console.error("chartOfAccounts: error saving accounts", e);
    }
  }

  // 5) Devolver snapshot útil
  return { created: created.length ? created : undefined, chart: accounts, mapping };
}

/* -------------------- util para debugging / snapshot -------------------- */
export async function getAccountsSnapshot() {
  const raw = await readAccounts();
  return { generatedAt: new Date().toISOString(), accounts: raw };
}
