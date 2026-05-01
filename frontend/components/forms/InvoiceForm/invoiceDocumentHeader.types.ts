import type React from "react";

export type PreviewKind = "image" | "pdf" | "excel" | "none";

// ✅ Cambiado: ahora SetValue soporta setState normal y setState con callback (prev => next)
export type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

// ✅ Tipos exactos para evitar strings sueltos
export type Destination = "BANCO" | "CAJA";
export type DocKind = "FACTURA" | "RECIBO" | "NOMINA";
export type InvoiceType = "VENTA" | "COMPRA";
export type PaymentType = "" | "DEBITO" | "TRANSFERENCIA" | "CREDITO" | "PAGOMOVIL";

export type InvoiceDocumentHeaderSectionProps = {
  docKind: DocKind;
  setDocKind: SetValue<DocKind>;

  invoiceType: InvoiceType;
  onInvoiceTypeChange: SetValue<InvoiceType>;

  invoiceName: string;
  setInvoiceName: SetValue<string>;

  documentDateTime: string;
  setDocumentDateTime: SetValue<string>;

  numeroRecibo: string;
  setNumeroRecibo: SetValue<string>;

  numeroFactura: string;
  setNumeroFactura: SetValue<string>;

  numeroControl: string;
  setNumeroControl: SetValue<string>;

  destination: Destination;
  setDestination: SetValue<Destination>;

  bank: string;
  setBank: SetValue<string>;

  caja: string;
  setCaja: SetValue<string>;

  paymentType: PaymentType;
  setPaymentType: SetValue<PaymentType>;

  referenceNumber: string;
  setReferenceNumber: SetValue<string>;

  voucherUrl?: string;
  setVoucherUrl?: SetValue<string>;
};