// types/invoice.ts
// Versión completa y lista para pegar — incluye campos adicionales (createdAt, updatedAt, meta)
// y tipos ampliados para soportar inmuebles (PROPERTY), productos, servicios y checklist con metadatos.

export type InvoiceType = "VENTA" | "COMPRA";
export type DestinationType = "BANCO" | "CAJA";
export type BankPaymentType = "DEBITO" | "TRANSFERENCIA" | "CREDITO" | "PAGOMOVIL";
export type PartyType = "NATURAL" | "JURIDICA";
export type PartyRole = "CLIENTE" | "PROVEEDOR";
export type DocKind = "FACTURA" | "RECIBO" | "NOMINA";

/**
 * Se amplía ItemKind para cubrir:
 * - ARTICULO: artículo / producto
 * - SERVICIO: servicio
 * - PROPERTY: inmueble (usado en tu UI)
 * - PRODUCTO: alias si alguna parte del código usa este literal
 */
export type ItemKind = "ARTICULO" | "SERVICIO" | "PROPERTY" | "PRODUCTO";

/**
 * Foto / archivo asociado a una línea o entidad
 */
export type InvoicePhoto = {
  id: string;
  name?: string;
  url?: string;
  dataUrl?: string;
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Línea del comprobante (producto, servicio, property, etc.)
 */
export type InvoiceItem = {
  id?: string;
  invoiceId?: string;
  kind?: ItemKind;
  catalogId?: string | null; // id en catálogo si aplica
  masterId?: string | null; // id maestro si procede
  accountId?: string | null;
  category?: string | null;
  type?: string | null;
  subtype?: string | null;
  name: string;
  sku?: string | null;
  quantity?: number;
  unitPrice?: number;
  model?: string | null;
  size?: string | null;
  serviceDescription?: string | null;
  hours?: number;
  rate?: number;
  specs?: Record<string, string | number>;
  photos?: InvoicePhoto[];
  meta?: Record<string, any>;
  total?: number;
  createdAt?: string;
  updatedAt?: string;
  // campos útiles para inmuebles
  propertyId?: string | null;
};

/**
 * Checklist types
 * - ChecklistItem ahora admite metadatos y timestamps
 */
export type ChecklistItem = {
  id?: string;
  label: string;
  done?: boolean;
  meta?: Record<string, any>; // libre para notas/usuario/fecha extra
  createdAt?: string;
  updatedAt?: string;
};

export type PartyChecklist = ChecklistItem[];

/**
 * Party (cliente/proveedor) — información básica, plus checklist opcional
 */
export type PartyInfo = {
  partyType: PartyType;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  rif?: string;
  nit?: string;
  photoDataUrl?: string;
  companyId?: string; // id de la compañía asociada (importantísimo para catálogo)
  checklist?: PartyChecklist;
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Registro completo del party tal como se guarda/consulta
 */
export type PartyRecord = PartyInfo & {
  id: string;
  role: PartyRole;
  // checklist repetido por claridad tipada
  checklist?: PartyChecklist;
  // metadatos globales del registro
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Empleado (para nómina)
 */
export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  document?: string;
  nit?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  bank?: string;
  bankAccount?: string;
  birthDate?: string;
  photoDataUrl?: string;
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Recibo de nómina / payroll
 */
export type PayrollReceipt = {
  id: string;
  name?: string;
  number?: string;
  destination?: DestinationType;
  bank?: string;
  caja?: string;
  paymentType?: BankPaymentType | "";
  reference?: string;
  amount: number;
  employeeId?: string;
  employeeSnapshot?: Partial<Employee>;
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Invoice general (modelo amplio, adaptado a tu UI)
 */
export type Invoice = {
  id: string;
  type?: InvoiceType | string;
  invoiceName?: string;
  date?: string;
  bank?: string;
  amount?: number;
  iva?: number;
  total?: number;
  description?: string;
  items?: InvoiceItem[];
  partyId?: string;
  partySnapshot?: Partial<PartyRecord>;
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  // campos opcionales extra que tu app pueda usar
  [key: string]: any;
};