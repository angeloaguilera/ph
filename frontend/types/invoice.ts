// types/invoice.ts
export type InvoiceType = "VENTA" | "COMPRA";
export type DestinationType = "BANCO" | "CAJA";
export type BankPaymentType = "DEBITO" | "TRANSFERENCIA" | "CREDITO" | "PAGOMOVIL";
export type PartyType = "NATURAL" | "JURIDICA";
export type PartyRole = "CLIENTE" | "PROVEEDOR";
export type ItemKind = "ARTICULO" | "SERVICIO";
export type DocKind = "FACTURA" | "RECIBO" | "NOMINA";

export type InvoicePhoto = { id: string; name: string; url?: string; dataUrl?: string };

export type InvoiceItem = {
  id?: string;
  invoiceId?: string;
  kind?: ItemKind;
  catalogId?: string;
  accountId?: string;
  category?: string;
  type?: string;
  subtype?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  model?: string;
  size?: string;
  serviceDescription?: string;
  hours?: number;
  rate?: number;
  specs?: Record<string, string | number>;
  photos?: InvoicePhoto[];
  total?: number;
};

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
  companyId?: string;
};

export type PartyRecord = PartyInfo & {
  id: string;
  role: PartyRole;
};

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
};

export type PayrollReceipt = {
  id: string;
  name: string;
  number: string;
  destination: DestinationType;
  bank?: string;
  caja?: string;
  paymentType?: BankPaymentType | "";
  reference?: string;
  amount: number;
  employeeId?: string;
  employeeSnapshot?: Partial<Employee>;
};

// --- Añadir tipo Invoice que usa la página voucher ---
export type Invoice = {
  id: string;
  type?: string;
  invoiceName?: string;
  date?: string;
  bank?: string;
  amount?: number;
  iva?: number;
  total?: number;
  description?: string;
  // campos opcionales extra que tu app pueda usar
  [key: string]: any;
};
