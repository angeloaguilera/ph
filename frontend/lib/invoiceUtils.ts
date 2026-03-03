// lib/invoiceUtils.ts
import { InvoiceItem, InvoicePhoto } from "../types/invoice";

/* ID generator (fallback if no crypto.randomUUID) */
let __localIdCounter = 0;
export const genId = () => {
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto && "randomUUID" in (globalThis as any).crypto) {
    return (globalThis as any).crypto.randomUUID();
  }
  __localIdCounter += 1;
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${__localIdCounter}`;
};

export const readFileAsDataUrl = (file: File): Promise<string | null> =>
  new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(typeof fr.result === "string" ? fr.result : null);
    fr.onerror = () => res(null);
    fr.readAsDataURL(file);
  });

export const calculateAgeFromDate = (birthDateString?: string) => {
  if (!birthDateString) return undefined;
  const today = new Date();
  const b = new Date(birthDateString);
  if (isNaN(b.getTime())) return undefined;
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
};

export const defaultLineTotal = (it?: InvoiceItem) => {
  if (!it) return 0;
  if ((it as any).kind === "SERVICIO") {
    const hours = Number(isNaN(Number((it as any).hours)) ? 0 : Number((it as any).hours));
    const rate = Number(isNaN(Number((it as any).rate)) ? 0 : Number((it as any).rate));
    return Number((hours * rate).toFixed(2));
  }
  const q = Number(isNaN(Number(it.quantity)) ? 0 : Number(it.quantity));
  const p = Number(isNaN(Number(it.unitPrice)) ? 0 : Number(it.unitPrice));
  return Number((q * p).toFixed(2));
};

/* ITEM TYPES (short example) */
export const ITEM_TYPE_MAP: Record<
  string,
  {
    label: string;
    subtypes: { value: string; label: string; defaults?: Record<string, string | number> }[];
  }
> = {
  TECNOLOGIA: {
    label: "Tecnología",
    subtypes: [{ value: "TELEFONO", label: "Teléfono", defaults: { model: "XPhone", ram: "4GB" } }],
  },
  OTRO: { label: "Otro", subtypes: [{ value: "VARIOS", label: "Varios", defaults: {} }] },
};

export const ALL_ITEM_TYPES = Object.keys(ITEM_TYPE_MAP);

/* Example plan of accounts (simplified) */
export const PLAN_OF_ACCOUNTS: { id: string; code: string; label: string; type: "INGRESO" | "GASTO" | "ACTIVO" | "PASIVO" | "PATRIMONIO" }[] = [
  { id: "ventas_01", code: "7000", label: "Ventas - Productos", type: "INGRESO" },
  { id: "servicios_01", code: "7010", label: "Ingresos por Servicios", type: "INGRESO" },
  { id: "costo_ventas", code: "5000", label: "Costo de Ventas", type: "GASTO" },
  { id: "gastos_admin", code: "6000", label: "Gastos Administrativos", type: "GASTO" },
  { id: "inventario", code: "1100", label: "Inventario", type: "ACTIVO" },
  { id: "clientes", code: "1105", label: "Clientes / Cuentas por Cobrar", type: "ACTIVO" },
  { id: "proveedores", code: "2100", label: "Proveedores / Cuentas por Pagar", type: "PASIVO" },
  { id: "banco", code: "1000", label: "Bancos", type: "ACTIVO" },
  { id: "caja", code: "1010", label: "Caja", type: "ACTIVO" },
];

export function accountLabelById(id?: string) {
  if (!id) return undefined;
  const f = PLAN_OF_ACCOUNTS.find((a) => a.id === id);
  return f ? `${f.code} • ${f.label}` : id;
}

/* Account rules */
const ACCOUNT_RULES: { [k: string]: string } = {
  SALES: "ventas_01",
  SERVICE_INCOME: "servicios_01",
  COST_OF_GOODS: "costo_ventas",
  GENERAL_EXPENSE: "gastos_admin",
  INVENTORY: "inventario",
  DEFAULT: "ventas_01",
};

export function resolveAccountForItem(it?: Partial<InvoiceItem> | any): string {
  if (!it) return ACCOUNT_RULES.DEFAULT;
  if (it.accountId && String(it.accountId).trim()) return it.accountId;

  const kind = (it.kind ?? "ARTICULO").toString().toUpperCase();
  const category = (it.category ?? "").toString().toUpperCase(); // INGRESO | GASTO | COSTO
  const type = (it.type ?? "").toString().toUpperCase();

  if (kind === "SERVICIO") {
    if (category === "GASTO") return ACCOUNT_RULES.GENERAL_EXPENSE;
    return ACCOUNT_RULES.SERVICE_INCOME;
  }

  if (kind === "ARTICULO") {
    if (category === "COSTO") return ACCOUNT_RULES.COST_OF_GOODS;
    if (category === "GASTO") return ACCOUNT_RULES.GENERAL_EXPENSE;
    if (it?.specs?.isInventory === true || ["MATERIAL", "INVENTARIO"].includes(type)) return ACCOUNT_RULES.INVENTORY;
    return ACCOUNT_RULES.SALES;
  }

  return ACCOUNT_RULES.DEFAULT;
}
